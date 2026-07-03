import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  subscribe,
  unsubscribe,
  toggleBell,
  getSubscriptionStatus,
  getFeed,
  getSubscriptions,
  getCreatorProfile,
  getCreatorFiles,
} from "../controllers/subscription.controller.js";

const router = Router();

// ── Public (API key only) — creator profile & files ───────────────────────────
router.get("/creators/:id", getCreatorProfile);
router.get("/creators/:id/files", getCreatorFiles);

// ── Protected (JWT required) ──────────────────────────────────────────────────
router.use(authenticate);

router.post("/subscribe/:creatorId", subscribe);
router.delete("/subscribe/:creatorId", unsubscribe);
router.patch("/subscribe/:creatorId/bell", toggleBell);
router.get("/subscribe/status/:creatorId", getSubscriptionStatus);
router.get("/subscribe/feed", getFeed);
router.get("/subscribe/list", getSubscriptions);

export default router;
