import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes     from "./routes/auth.routes.js";
import userRoutes     from "./routes/user.routes.js";
import fileRoutes     from "./routes/file.routes.js";
import earningsRoutes from "./routes/earnings.routes.js";
import shareRoutes    from "./routes/share.routes.js";
import adminRoutes    from "./routes/admin.routes.js";
import ticketRoutes   from "./routes/ticket.routes.js";
import notifRoutes    from "./routes/notification.routes.js";
import subRoutes      from "./routes/subscription.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { requireApiKey } from "./middleware/apiKey.js";

// ── Import DB pool to trigger connection check on startup ─────────────────────
import "./db/connection.js";

// ── Initialize Firebase Admin (for push notifications) ────────────────────────
import { initFirebase } from "./utils/firebase.js";
initFirebase();

// ── Start Telegram bot (non-blocking) ─────────────────────────────────────────
if (process.env.TELEGRAM_BOT_TOKEN) {
  import("./bot/index.js").catch(err =>
    console.error("⚠️  Bot failed to start:", err.message)
  );
}

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow thumbnails to load from different origin
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8080",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Bot-User-Id", "X-User-Api-Key"],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Request logging ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── Global rate limit ─────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// ── app-ads.txt (served from DB — configured in admin settings) ───────────────
app.get("/app-ads.txt", async (_req, res) => {
  try {
    const pool = (await import("./db/connection.js")).default;
    const [[row]] = await pool.query("SELECT value FROM app_settings WHERE id = 'app_ads_txt'");
    if (row && row.value) {
      res.setHeader("Content-Type", "text/plain");
      res.send(row.value);
    } else {
      res.status(404).send("# app-ads.txt not configured");
    }
  } catch {
    res.status(500).send("# error");
  }
});

// ── Open URL in system browser (for desktop app) ──────────────────────────────
app.get("/api/open-url", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return res.status(400).json({ success: false });
  }
  const { exec } = await import("child_process");
  const cmd = process.platform === "darwin" ? `open "${url}"` : process.platform === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
  res.json({ success: true });
});

// ── Static uploads ────────────────────────────────────────────────────────────
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// NOTE: /uploads is NOT served statically — files are only accessible via signed stream tokens
// BUT thumbnails are safe to serve publicly
app.use("/thumbnails", express.static(path.resolve(__dirname, "../uploads/thumbnails")));
// Receipts are public (admin uploads them for payout proof)
app.use("/receipts", express.static(path.resolve(__dirname, "../uploads/receipts")));
// Avatars
app.use("/avatars", express.static(path.resolve(__dirname, "../uploads/avatars")));

// ── Stream routes — simple direct video serve (requires API key) ──────────────
// Video served by file ID OR share token — API key required
app.get("/api/play/:id", requireApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const fs = (await import("fs")).default;
    const pathMod = (await import("path")).default;
    const pool = (await import("./db/connection.js")).default;

    let file = null;

    // Try as file ID first
    const [fileRows] = await pool.query(
      "SELECT stored_name, mime_type, original_name FROM files WHERE id = ? AND status = 'active'",
      [id]
    );
    if (fileRows.length) {
      file = fileRows[0];
    } else {
      // Try as share token
      const [shareRows] = await pool.query(
        `SELECT f.stored_name, f.mime_type, f.original_name
         FROM share_tokens st
         JOIN files f ON f.id = st.file_id
         WHERE st.token = ? AND st.is_active = 1 AND f.status = 'active'`,
        [id]
      );
      if (shareRows.length) file = shareRows[0];
    }

    if (!file) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    // Try local file first (fastest, backward compat)
    const fullPath = pathMod.resolve(`uploads/${file.stored_name}`);

    if (fs.existsSync(fullPath)) {
      // Serve from local disk
      const stat = fs.statSync(fullPath);
      res.setHeader("Content-Type", file.mime_type || "video/mp4");
      res.setHeader("Cache-Control", "no-store, private");
      res.setHeader("Accept-Ranges", "bytes");

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
        res.setHeader("Content-Length", end - start + 1);
        fs.createReadStream(fullPath, { start, end }).pipe(res);
      } else {
        res.setHeader("Content-Length", stat.size);
        fs.createReadStream(fullPath).pipe(res);
      }
    } else {
      // File not local — try cloud storage adapter
      const { getFileStreamRange, getFileStream } = await import("./utils/storage.js");

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : undefined;

        const result = await getFileStreamRange(file.stored_name, "", start, end);
        if (!result) {
          return res.status(404).json({ success: false, message: "File not on storage." });
        }

        res.status(206);
        res.setHeader("Content-Type", file.mime_type || "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Range", `bytes ${result.start}-${result.end}/${result.size}`);
        res.setHeader("Content-Length", result.end - result.start + 1);
        res.setHeader("Cache-Control", "no-store, private");
        result.stream.pipe(res);
      } else {
        const result = await getFileStream(file.stored_name);
        if (!result) {
          return res.status(404).json({ success: false, message: "File not on storage." });
        }

        res.setHeader("Content-Type", file.mime_type || "video/mp4");
        res.setHeader("Cache-Control", "no-store, private");
        res.setHeader("Accept-Ranges", "bytes");
        if (result.size) res.setHeader("Content-Length", result.size);
        result.stream.pipe(res);
      }
    }
  } catch (err) {
    console.error("Playback error:", err.message);
    res.status(500).json({ success: false, message: "Playback error." });
  }
});

// ── View count endpoint — app calls this after video starts playing ────────────
// POST /api/view/:token — increments view count (requires API key)
// Same IP + Same File = max 1 view per hour (anti-fraud)
app.post("/api/view/:token", requireApiKey, async (req, res) => {
  try {
    const { token } = req.params;
    const pool = (await import("./db/connection.js")).default;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

    // Try as file ID
    let [rows] = await pool.query(
      "SELECT id FROM files WHERE id = ? AND status = 'active'",
      [token]
    );

    let isShareToken = false;
    if (!rows.length) {
      // Try as share token
      [rows] = await pool.query(
        `SELECT f.id FROM share_tokens st JOIN files f ON f.id = st.file_id
         WHERE st.token = ? AND st.is_active = 1 AND f.status = 'active'`,
        [token]
      );
      if (rows.length) isShareToken = true;
    }

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    const fileId = rows[0].id;

    // Dedup: same IP + same file = 1 view per hour max
    const [existing] = await pool.query(
      "SELECT id FROM view_logs WHERE file_id = ? AND ip = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) LIMIT 1",
      [fileId, ip]
    );

    if (existing.length) {
      return res.json({ success: true, message: "View counted." });
    }

    // Log view
    await pool.query("INSERT INTO view_logs (file_id, ip) VALUES (?, ?)", [fileId, ip]);

    // Increment files view count
    await pool.query("UPDATE files SET view_count = view_count + 1 WHERE id = ?", [fileId]);

    // Increment share_tokens view count
    if (isShareToken) {
      await pool.query("UPDATE share_tokens SET view_count = view_count + 1 WHERE token = ? AND is_active = 1", [token]);
    } else {
      await pool.query("UPDATE share_tokens SET view_count = view_count + 1 WHERE file_id = ? AND is_active = 1", [fileId]);
    }

    res.json({ success: true, message: "View counted." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error counting view." });
  }
});

// ── App settings endpoint (API key required) ─────────────────────────────────
app.get("/api/settings", requireApiKey, async (req, res) => {
  try {
    const pool = (await import("./db/connection.js")).default;
    const [rows] = await pool.query("SELECT id, value FROM app_settings");
    const settings = {};
    rows.forEach(r => { settings[r.id] = r.value; });
    res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load settings." });
  }
});

// ── Contact message endpoint (public — no auth needed) ────────────────────────
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message, source } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Name, email, and message are required." });
    }
    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: "Message too long (max 2000 chars)." });
    }
    const { v4: uuidv4 } = await import("uuid");
    const pool = (await import("./db/connection.js")).default;
    const id = uuidv4();
    await pool.query(
      "INSERT INTO messages (id, name, email, message, source) VALUES (?, ?, ?, ?, ?)",
      [id, name.trim(), email.trim().toLowerCase(), message.trim(), source || null]
    );
    res.status(201).json({ success: true, message: "Message sent successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
});

// ── API Key guard — ALL /api/* routes below require a valid key ────────────────
app.use("/api", requireApiKey);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/files",    fileRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/share",    shareRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/tickets",  ticketRoutes);
app.use("/api/notifications", notifRoutes);
app.use("/api",          subRoutes);

// ── FCM token registration (authenticated users) ──────────────────────────────
import { authenticate } from "./middleware/auth.js";
app.post("/api/fcm/register", requireApiKey, authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const pool = (await import("./db/connection.js")).default;
    // Empty token = disable notifications, null out the FCM token
    const fcmToken = (token && token.length > 10) ? token : null;
    await pool.query("UPDATE users SET fcm_token = ? WHERE id = ?", [fcmToken, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to register token." });
  }
});

// ── 404 + Error handlers ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Videora API running on http://0.0.0.0:${PORT}`);
  console.log(`   Local:       http://localhost:${PORT}`);
  console.log(`   Network:     ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Health check: ${process.env.BASE_URL || `http://localhost:${PORT}`}/health\n`);
});

export default app;
