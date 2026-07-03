import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createTicket, getMyTickets, getTicketDetail, replyToTicket } from "../controllers/ticket.controller.js";

const router = Router();

router.use(authenticate);

// POST /api/tickets
router.post("/",
  [
    body("subject").trim().notEmpty().withMessage("Subject required.").isLength({ max: 255 }),
    body("message").trim().notEmpty().withMessage("Message required.").isLength({ max: 2000 }),
  ],
  validate,
  createTicket
);

// GET /api/tickets
router.get("/", getMyTickets);

// GET /api/tickets/:id
router.get("/:id", getTicketDetail);

// POST /api/tickets/:id/reply
router.post("/:id/reply",
  [body("message").trim().notEmpty().withMessage("Message required.").isLength({ max: 2000 })],
  validate,
  replyToTicket
);

export default router;
