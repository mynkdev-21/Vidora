import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { getEarnings, getEarningsSummary, requestPayout, getPayouts, getReferralStats } from "../controllers/earnings.controller.js";

const router = Router();

router.use(authenticate);

// GET  /api/earnings
router.get("/", getEarnings);

// GET  /api/earnings/summary
router.get("/summary", getEarningsSummary);

// GET  /api/earnings/payouts
router.get("/payouts", getPayouts);

// GET  /api/earnings/referral-stats
router.get("/referral-stats", getReferralStats);

// POST /api/earnings/payouts
router.post(
  "/payouts",
  [
    body("amount").isFloat({ min: 5 }).withMessage("Minimum payout is $5."),
    body("method").trim().notEmpty().withMessage("Payout method required.")
      .isIn(["paypal", "wise", "payoneer", "crypto", "bank", "upi"])
      .withMessage("Invalid payout method."),
  ],
  validate,
  requestPayout
);

export default router;
