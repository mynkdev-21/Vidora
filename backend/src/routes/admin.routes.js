import { Router } from "express";
import { body } from "express-validator";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import { validate } from "../middleware/validate.js";
import { adminLogin, adminMe, adminUpdate } from "../controllers/admin-auth.controller.js";
import {
  getStats,
  getUsers,
  updateUser,
  deleteUser,
  getFiles,
  updateFile,
  deleteFile,
  purgeDeletedFiles,
  getPayouts,
  updatePayout,
  getAnalytics,
  getMessages,
  updateMessage,
  deleteMessage,
  getSettings,
  updateSettings,
  getUserDetail,
  getTickets,
  replyTicket,
  getTicketReplies,
  sendNotification,
  broadcastNotification,
  notifyFileToAll,
  getSubscriptionStats,
  toggleUserPremium,
} from "../controllers/admin.controller.js";

// Ensure receipts directory exists
const RECEIPTS_DIR = path.resolve("uploads/receipts");
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `receipt_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed."));
  },
});

const router = Router();

// ── Public admin auth routes ─────────────────────────────────────────────────
router.post(
  "/auth/login",
  [
    body("email").isEmail().withMessage("Valid email required.").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  validate,
  adminLogin
);

// ── Protected admin routes (require admin token) ─────────────────────────────
router.use(authenticateAdmin);

// Auth
router.get("/auth/me", adminMe);
router.patch("/auth/update", adminUpdate);

// Dashboard stats
router.get("/stats", getStats);

// Analytics
router.get("/analytics", getAnalytics);

// Users management
router.get("/users", getUsers);
router.get("/users/:id", getUserDetail);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Files management
router.get("/files", getFiles);
router.patch("/files/:id", updateFile);
router.delete("/files/:id", deleteFile);
router.delete("/files-purge/all", purgeDeletedFiles);
router.post("/files/:id/notify", notifyFileToAll);

// Payouts management
router.get("/payouts", getPayouts);
router.patch("/payouts/:id", updatePayout);

// Receipt upload for payouts
router.post("/payouts/:id/receipt", receiptUpload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image provided." });
    const receiptUrl = `/receipts/${req.file.filename}`;
    const pool = (await import("../db/connection.js")).default;
    await pool.query("UPDATE payouts SET receipt_url = ? WHERE id = ?", [receiptUrl, req.params.id]);
    res.json({ success: true, data: { receipt_url: receiptUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Upload failed." });
  }
});

// Messages management
router.get("/messages", getMessages);
router.patch("/messages/:id", updateMessage);
router.delete("/messages/:id", deleteMessage);

// Settings
router.get("/settings", getSettings);
router.put("/settings", updateSettings);

// Tickets
router.get("/tickets", getTickets);
router.get("/tickets/:id/replies", getTicketReplies);
router.patch("/tickets/:id", replyTicket);

// Notifications
router.post("/notifications", sendNotification);
router.post("/notifications/broadcast", broadcastNotification);

// Subscriptions
router.get("/subscriptions/stats", getSubscriptionStats);
router.patch("/subscriptions/:userId", toggleUserPremium);

// Login as user (impersonate) — generates a temporary token for the user
router.post("/impersonate/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = (await import("../db/connection.js")).default;
    const [rows] = await pool.query("SELECT id, name, email, role, avatar_url FROM users WHERE id = ?", [userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found." });

    const user = rows[0];
    const jwt = (await import("jsonwebtoken")).default;
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      data: {
        accessToken: token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to impersonate." });
  }
});

// System info (from env)
router.get("/system-info", (req, res) => {
  const apiKeys = (process.env.API_KEYS || "").split(",").map(k => k.split(":")[0]).filter(Boolean);
  const mobileKey = apiKeys.find(k => (process.env.API_KEYS || "").includes(`${k}:mobile`)) || apiKeys[1] || apiKeys[0] || "";
  res.json({
    success: true,
    data: {
      android: {
        base_url: `${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/:\d+$/, `:${process.env.PORT || 5001}`) : `http://localhost:${process.env.PORT || 5001}`}/`,
        api_key: mobileKey,
        admob_app_id: "", // fetched from app_settings
        package_name: "com.mynk.vidora",
      },
      web: {
        url: process.env.FRONTEND_URL || "http://localhost:8080",
        api_url: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`,
        framework: "React + TanStack Router",
      },
      backend: {
        url: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`,
        database: `${process.env.DB_NAME || "videora"} (MySQL)`,
        port: process.env.PORT || "5001",
      },
    },
  });
});

// Storage settings
router.get("/storage", async (req, res) => {
  try {
    const pool = (await import("../db/connection.js")).default;
    const [rows] = await pool.query("SELECT id, value FROM app_settings WHERE id LIKE 'storage_%'");
    const settings = {};
    rows.forEach(r => { settings[r.id] = r.value; });

    // Get local storage usage
    const fs = (await import("fs")).default;
    const pathMod = (await import("path")).default;
    const uploadsDir = pathMod.resolve("uploads");
    let localUsed = 0;
    let fileCount = 0;
    if (fs.existsSync(uploadsDir)) {
      const walkDir = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = pathMod.join(dir, entry.name);
          if (entry.isDirectory()) walkDir(full);
          else { localUsed += fs.statSync(full).size; fileCount++; }
        }
      };
      walkDir(uploadsDir);
    }

    res.json({ success: true, data: { settings, local_used: localUsed, local_files: fileCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load storage settings." });
  }
});

router.put("/storage", async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ success: false, message: "Settings object required." });
    }

    const pool = (await import("../db/connection.js")).default;
    for (const [key, value] of Object.entries(settings)) {
      if (!key.startsWith("storage_")) continue;
      await pool.query(
        "INSERT INTO app_settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?",
        [key, String(value), String(value)]
      );
    }

    // Clear storage cache
    const { clearStorageCache } = await import("../utils/storage.js");
    clearStorageCache();

    res.json({ success: true, message: "Storage settings saved." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save storage settings." });
  }
});

// Test storage connection
router.post("/storage/test", async (req, res) => {
  try {
    const { provider, settings } = req.body;
    if (!provider) return res.status(400).json({ success: false, message: "Provider required." });

    // Temporarily save settings to test
    const pool = (await import("../db/connection.js")).default;
    for (const [key, value] of Object.entries(settings || {})) {
      if (!key.startsWith("storage_")) continue;
      await pool.query(
        "INSERT INTO app_settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?",
        [key, String(value), String(value)]
      );
    }
    await pool.query(
      "INSERT INTO app_settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?",
      ["storage_provider", provider, provider]
    );

    const { clearStorageCache } = await import("../utils/storage.js");
    clearStorageCache();

    // Try a small test upload
    const fs = (await import("fs")).default;
    const pathMod = (await import("path")).default;
    const testFile = pathMod.resolve("uploads/.storage_test");
    fs.writeFileSync(testFile, "vidora-storage-test-" + Date.now());

    const { uploadToStorage, deleteFromStorage } = await import("../utils/storage.js");
    const testName = ".vidora_test_" + Date.now() + ".txt";
    await uploadToStorage(testFile, testName);
    await deleteFromStorage(testName);
    fs.unlinkSync(testFile);

    res.json({ success: true, message: "Connection successful!" });
  } catch (err) {
    res.status(400).json({ success: false, message: `Connection failed: ${err.message}` });
  }
});

export default router;
