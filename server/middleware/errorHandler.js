/**
 * Central error handler.
 *
 * Every controller ends its catch with next(error), and every error arrives
 * here. This keeps one consistent JSON error shape across the whole API:
 *
 *     { "error": "message", "details": { field: "message" } }
 *
 * The raw error is logged on the server but never sent to the client, because
 * stack traces and driver messages expose internal details.
 */

/* 404 for an unknown route. Mounted after all real routes. */
function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error("[error]", err.message);

  /* Mongoose validation: collect every field message at once so the form
     can show them all instead of one at a time. */
  if (err.name === "ValidationError") {
    const details = {};
    Object.keys(err.errors).forEach(field => {
      details[field] = err.errors[field].message;
    });
    return res.status(400).json({ error: "Validation failed.", details });
  }

  /* Duplicate key - in this project it is almost always the email. */
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || { field: 1 })[0];
    return res.status(409).json({ error: `This ${field} is already registered.` });
  }

  /* A malformed ObjectId in the URL, e.g. /api/photos/abc */
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ error: "Invalid id." });
  }

  /* Multer: the 5 MB limit and the image-only filter. */
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "The image must be smaller than 5 MB." });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: "Unexpected file field." });
  }

  /* Invalid or expired JWT. */
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token." });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? "Something went wrong on the server." : err.message
  });
}

module.exports = { notFound, errorHandler };
