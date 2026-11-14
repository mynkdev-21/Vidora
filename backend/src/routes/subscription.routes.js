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

// ── /api/creators — public (API key only) ─────────────────────────────────────
export const creatorRouter = Router();
creatorRouter.get("/:id", getCreatorProfile);
creatorRouter.get("/:id/files", getCreatorFiles);

// ── /api/subscribe — JWT required ─────────────────────────────────────────────
// Mounted at its own prefix: when this router was mounted at /api, its
// router-wide authenticate() turned every unknown /api/* path into a 401.
export const subscribeRouter = Router();
subscribeRouter.use(authenticate);
subscribeRouter.get("/feed", getFeed);
subscribeRouter.get("/list", getSubscriptions);
subscribeRouter.get("/status/:creatorId", getSubscriptionStatus);
subscribeRouter.post("/:creatorId", subscribe);
subscribeRouter.delete("/:creatorId", unsubscribe);
subscribeRouter.patch("/:creatorId/bell", toggleBell);
