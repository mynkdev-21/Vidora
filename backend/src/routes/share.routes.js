import { Router } from "express";
import { param } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  generateShareLink,
  revokeShareLink,
  viewSharedFile,
  getFileToken,
  getStreamUrl,
  serveStreamVideo,
} from "../controllers/share.controller.js";

const router = Router();

// ── Mounted at /api/stream BEFORE the API-key guard: <video> elements can't send
// headers, and the unguessable stream token is the authorisation.
export const streamRouter = Router();
streamRouter.get("/:streamToken/video", serveStreamVideo);

// ── PUBLIC — no JWT needed ────────────────────────────────────────────────────
// GET /api/share/view/:token — file metadata (no video URL exposed)
router.get(
  "/view/:token",
  [param("token").trim().notEmpty().withMessage("Token required.")],
  validate,
  viewSharedFile
);

// GET /api/share/stream/:token — get temporary m3u8 stream URL
router.get(
  "/stream/:token",
  [param("token").trim().notEmpty().withMessage("Token required.")],
  validate,
  getStreamUrl
);

// ── PROTECTED — JWT required ──────────────────────────────────────────────────
router.use(authenticate);

// POST /api/share/:fileId/generate
router.post(
  "/:fileId/generate",
  [param("fileId").isUUID().withMessage("Invalid file ID.")],
  validate,
  generateShareLink
);

// GET /api/share/:fileId/token
router.get(
  "/:fileId/token",
  [param("fileId").isUUID().withMessage("Invalid file ID.")],
  validate,
  getFileToken
);

// DELETE /api/share/:fileId/revoke
router.delete(
  "/:fileId/revoke",
  [param("fileId").isUUID().withMessage("Invalid file ID.")],
  validate,
  revokeShareLink
);

export default router;
