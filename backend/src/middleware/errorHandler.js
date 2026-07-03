/**
 * Global error handler — catches anything passed to next(err)
 */
export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // MySQL duplicate entry
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ success: false, message: "Resource already exists." });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === "production"
    ? "Internal server error."
    : err.message;

  res.status(status).json({ success: false, message });
}

/**
 * 404 handler — must be registered after all routes
 */
export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
}
