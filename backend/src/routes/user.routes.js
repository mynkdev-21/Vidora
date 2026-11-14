import { Router } from "express";
import { body } from "express-validator";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { getProfile, updateProfile, changePassword, listUsers, getApiKey } from "../controllers/user.controller.js";
import { getPaymentMethods, savePaymentMethod } from "../controllers/payment.controller.js";
import { imageUploader, verifyImageContent } from "../utils/imageUpload.js";

const avatarUpload = imageUploader("avatars", "avatar_");

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET  /api/users/profile
router.get("/profile", getProfile);

// PATCH /api/users/profile
router.patch(
  "/profile",
  [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .matches(/^[^<>"'%;()&+]+$/).withMessage("Name contains invalid characters."),
    body("avatar_url").optional().isLength({ max: 500 }),
  ],
  validate,
  updateProfile
);

// PATCH /api/users/change-password
router.patch(
  "/change-password",
  [
    body("currentPassword").notEmpty().withMessage("Current password required."),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters."),
  ],
  validate,
  changePassword
);

// POST /api/users/avatar — Upload profile picture
router.post("/avatar", avatarUpload.single("avatar"), verifyImageContent, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image provided." });
    const avatarUrl = `/avatars/${req.file.filename}`;
    const pool = (await import("../db/connection.js")).default;
    await pool.query("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, req.user.id]);
    res.json({ success: true, message: "Avatar updated.", data: { avatar_url: avatarUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Upload failed." });
  }
});

// GET  /api/users/api-key
router.get("/api-key", getApiKey);

// GET  /api/users/payment-methods
router.get("/payment-methods", getPaymentMethods);

// POST /api/users/payment-methods
router.post("/payment-methods",
  [
    body("method").isIn(["upi", "paypal", "bank"]).withMessage("Invalid method."),
    body("name").trim().notEmpty().withMessage("Name required."),
    body("account_id").trim().notEmpty().withMessage("Account ID required."),
  ],
  validate,
  savePaymentMethod
);

// GET /api/users  (admin only)
router.get("/", authorize("admin"), listUsers);

export default router;
