import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import { playFile, issueViewTicket, redeemView } from "../controllers/view.controller.js";

const router = Router();

const limiter = (limit, message) => rateLimit({
  windowMs: 60 * 1000,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message },
});

// GET /api/play/:id — stream by file ID or share token
router.get("/play/:id", optionalAuthenticate, playFile);

// POST /api/view/:token/ticket — start of playback
router.post("/view/:token/ticket", limiter(60, "Too many view requests."), authenticate, issueViewTicket);

// POST /api/view/:token — redeem ticket after the minimum watch time
router.post("/view/:token", limiter(60, "Too many view requests."), authenticate, redeemView);

export default router;
