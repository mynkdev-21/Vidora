import { Router } from "express";
import { body, param } from "express-validator";
import multer from "multer";
import fs from "fs";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.js";
import { authenticateBotUser } from "../middleware/botAuth.js";
import { cleanupUploadOnFailure } from "../middleware/uploadCleanup.js";
import { validate } from "../middleware/validate.js";
import { config } from "../config.js";
import { uploadDir, generateStoredName } from "../utils/paths.js";
import {
  listFiles, getFile, createFile, deleteFile,
  getFileStats, uploadFile, botUploadFile, copyFile,
  getTrending, searchFiles,
} from "../controllers/file.controller.js";

const router = Router();

// ── Multer: server-generated names, single file, bounded size ────────────────
const UPLOADS = uploadDir("");
fs.mkdirSync(UPLOADS, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS),
    filename: (_req, file, cb) => cb(null, generateStoredName(file.originalname)),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1, fields: 10, parts: 12 },
});

// Per-user upload throttle (keyed by the authenticated user, not the IP).
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `upload:${req.user?.id}`,
  message: { success: false, message: "Upload limit reached. Try again later." },
});

// ── POST /api/files/bot-upload — Telegram bot, authenticated by the per-user key.
// Authentication runs BEFORE multer, so unauthenticated requests never write to disk.
router.post("/bot-upload", authenticateBotUser, uploadLimiter, cleanupUploadOnFailure, upload.single("file"), botUploadFile);

// ── Public listings (API key only) ────────────────────────────────────────────
router.get("/trending", getTrending);
router.get("/search", searchFiles);

// All routes below require JWT auth
router.use(authenticate);

// GET  /api/files
router.get("/", listFiles);

// POST /api/files/copy — copy a file from an active Vidora share link (MUST be before /:id)
router.post("/copy",
  [body("url").isString().trim().notEmpty().withMessage("URL required.").isLength({ max: 500 })],
  validate,
  copyFile
);

// GET  /api/files/:id
router.get("/:id", [param("id").isUUID().withMessage("Invalid file ID.")], validate, getFile);

// GET  /api/files/:id/stats
router.get("/:id/stats", [param("id").isUUID().withMessage("Invalid file ID.")], validate, getFileStats);

// POST /api/files/upload — multipart upload
router.post("/upload", uploadLimiter, cleanupUploadOnFailure, upload.single("file"), uploadFile);

// POST /api/files — legacy metadata-only registration (removed; see controller)
router.post("/", createFile);

// DELETE /api/files/:id
router.delete("/:id", [param("id").isUUID().withMessage("Invalid file ID.")], validate, deleteFile);

export default router;
