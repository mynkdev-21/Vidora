/**
 * Global error handler — catches anything passed to next(err)
 */
export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Multer upload limits
  if (err.name === "MulterError") {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ success: false, message: err.code === "LIMIT_FILE_SIZE" ? "File is too large." : "Invalid upload." });
  }

  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Malformed JSON body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body too large." });
  }

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
