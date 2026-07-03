import { Router } from "express";
import { body, param } from "express-validator";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  listFiles, getFile, createFile, deleteFile,
  getFileStats, uploadFile, botUploadFile, copyFile,
} from "../controllers/file.controller.js";

const router = Router();

// ── Multer storage config ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10 GB
});

// ── POST /api/files/bot-upload ─ called by Telegram bot (no JWT, uses user API key) ──
// requireApiKey already applied at /api/* level in index.js
router.post("/bot-upload", upload.single("file"), botUploadFile);

// ── GET /api/files/trending ─ PUBLIC (no JWT needed) ─────────────────────────
// Returns random 20 active files from all users
import { getTrending, searchFiles } from "../controllers/file.controller.js";
router.get("/trending", getTrending);

// ── GET /api/files/search ─ PUBLIC (no JWT needed) ───────────────────────────
router.get("/search", searchFiles);

// All routes below require JWT auth
router.use(authenticate);

// GET  /api/files
router.get("/", listFiles);

// POST /api/files/copy — copy file from Vidora share link (MUST be before /:id)
router.post("/copy",
  [body("url").trim().notEmpty().withMessage("URL required.")],
  validate,
  copyFile
);

// GET  /api/files/:id
router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid file ID.")],
  validate,
  getFile
);

// GET  /api/files/:id/stats
router.get(
  "/:id/stats",
  [param("id").isUUID().withMessage("Invalid file ID.")],
  validate,
  getFileStats
);

// POST /api/files/upload  — real multipart upload (JWT required)
router.post("/upload", upload.single("file"), uploadFile);

// POST /api/files  — metadata-only registration (legacy)
router.post(
  "/",
  [
    body("original_name").trim().notEmpty().withMessage("File name required.").isLength({ max: 255 }),
    body("stored_name").trim().notEmpty().withMessage("Stored name required.").isLength({ max: 255 }),
    body("mime_type").trim().notEmpty().withMessage("MIME type required.")
      .matches(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*$/)
      .withMessage("Invalid MIME type format.").isLength({ max: 100 }),
    body("storage_path").trim().notEmpty().withMessage("Storage path required.").isLength({ max: 500 }),
    body("size_bytes").optional().isInt({ min: 0, max: 10_000_000_000 }).withMessage("Invalid file size."),
    body("public_url").optional().isURL().isLength({ max: 500 }),
  ],
  validate,
  createFile
);

// DELETE /api/files/:id
router.delete(
  "/:id",
  [param("id").isUUID().withMessage("Invalid file ID.")],
  validate,
  deleteFile
);

export default router;
