/**
 * Express application (no side effects: does not listen, start the Telegram
 * bot or initialise Firebase — see index.js). Imported directly by tests.
 */
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import authRoutes     from "./routes/auth.routes.js";
import userRoutes     from "./routes/user.routes.js";
import fileRoutes     from "./routes/file.routes.js";
import earningsRoutes from "./routes/earnings.routes.js";
import shareRoutes, { streamRouter } from "./routes/share.routes.js";
import adminRoutes    from "./routes/admin.routes.js";
import ticketRoutes   from "./routes/ticket.routes.js";
import notifRoutes    from "./routes/notification.routes.js";
import { creatorRouter, subscribeRouter } from "./routes/subscription.routes.js";
import mediaRoutes    from "./routes/media.routes.js";
import { publicRouter, apiRouter } from "./routes/misc.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { requireApiKey } from "./middleware/apiKey.js";
import { uploadDir } from "./utils/paths.js";

const app = express();

// req.ip honours X-Forwarded-For only from proxies listed in TRUST_PROXY.
app.set("trust proxy", config.trustProxy);
app.disable("x-powered-by");

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // thumbnails load from the dashboard origin
}));

// ── CORS (browser policy only — not an authentication mechanism) ─────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes(origin.toLowerCase())) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Bot-User-Id", "X-User-Api-Key", "Range"],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// ── Request logging (URLs only; never headers or bodies) ─────────────────────
if (!config.isTest) {
  app.use(morgan(config.isProduction ? "combined" : "dev"));
}

// ── Global rate limit ─────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { success: false, message: "Too many requests. Please slow down." },
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// ── Public static images (thumbnails, payout receipts, avatars) ──────────────
// Uploaded content must never run as a page on this origin.
const staticSafety = {
  dotfiles: "deny",
  index: false,
  setHeaders: (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  },
};
// NOTE: /uploads itself is NOT served — files are only reachable through /api/play.
app.use("/thumbnails", express.static(uploadDir("thumbnails"), staticSafety));
app.use("/receipts",   express.static(uploadDir("receipts"), staticSafety));
app.use("/avatars",    express.static(uploadDir("avatars"), staticSafety));

// ── Routes that don't take an API key ────────────────────────────────────────
app.use(publicRouter);                 // /app-ads.txt, POST /api/contact
app.use("/api/stream", streamRouter);  // stream-token video URLs

// ── API key guard — every other /api/* route requires a client key ───────────
app.use("/api", requireApiKey);

app.use("/api",          mediaRoutes);   // /api/play, /api/view
app.use("/api",          apiRouter);     // /api/settings, /api/fcm/register
app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/files",    fileRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/share",    shareRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/tickets",  ticketRoutes);
app.use("/api/notifications", notifRoutes);
app.use("/api/creators", creatorRouter);
app.use("/api/subscribe", subscribeRouter);

// ── 404 + Error handlers ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
