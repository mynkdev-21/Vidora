import { v4 as uuidv4 } from "uuid";
import pool from "../db/connection.js";

// ── POST /api/tickets — Create ticket (creator) ──────────────────────────────
export async function createTicket(req, res, next) {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: "Subject and message are required." });
    }

    const id = uuidv4();
    await pool.query(
      "INSERT INTO tickets (id, user_id, subject, message, status) VALUES (?, ?, ?, ?, 'open')",
      [id, req.user.id, subject.trim(), message.trim()]
    );

    // Add first message to replies
    await pool.query(
      "INSERT INTO ticket_replies (id, ticket_id, sender, message) VALUES (?, ?, 'user', ?)",
      [uuidv4(), id, message.trim()]
    );

    res.status(201).json({ success: true, message: "Ticket created.", data: { ticket_id: id } });
  } catch (err) { next(err); }
}

// ── GET /api/tickets — List user's tickets (creator) ─────────────────────────
export async function getMyTickets(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, subject, status, created_at, updated_at FROM tickets WHERE user_id = ? ORDER BY updated_at DESC",
      [req.user.id]
    );
    res.json({ success: true, data: { tickets: rows } });
  } catch (err) { next(err); }
}

// ── GET /api/tickets/:id — Get ticket with conversation (creator) ────────────
export async function getTicketDetail(req, res, next) {
  try {
    const [tickets] = await pool.query(
      "SELECT id, subject, message, status, created_at FROM tickets WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!tickets.length) return res.status(404).json({ success: false, message: "Ticket not found." });

    const [replies] = await pool.query(
      "SELECT id, sender, message, created_at FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC",
      [req.params.id]
    );

    res.json({ success: true, data: { ticket: tickets[0], replies } });
  } catch (err) { next(err); }
}

// ── POST /api/tickets/:id/reply — User reply (creator) ───────────────────────
export async function replyToTicket(req, res, next) {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message required." });
    }

    // Verify ticket belongs to user and is not closed
    const [tickets] = await pool.query(
      "SELECT id, status FROM tickets WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!tickets.length) return res.status(404).json({ success: false, message: "Ticket not found." });
    if (tickets[0].status === "closed") return res.status(400).json({ success: false, message: "Ticket is closed." });

    await pool.query(
      "INSERT INTO ticket_replies (id, ticket_id, sender, message) VALUES (?, ?, 'user', ?)",
      [uuidv4(), req.params.id, message.trim()]
    );

    // Set status back to open if it was resolved
    if (tickets[0].status === "resolved") {
      await pool.query("UPDATE tickets SET status = 'open' WHERE id = ?", [req.params.id]);
    }

    res.json({ success: true, message: "Reply sent." });
  } catch (err) { next(err); }
}
