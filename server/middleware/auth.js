/**
 * Authentication middleware.
 *
 * Reads the Bearer token, loads the user and attaches it to req.user.
 * The user is fetched on every request rather than trusted from the token,
 * so a deleted or newly unverified account loses access immediately.
 */
const { verifyToken } = require("../utils/token");
const User = require("../models/User");

async function auth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "You must be logged in to do this." });
  }

  try {
    const payload = verifyToken(header.slice(7));
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({ error: "This account no longer exists." });
    }
    if (!user.isVerified) {
      return res.status(403).json({ error: "Please confirm your email first.", needsVerification: true });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error); // the error handler turns JWT errors into 401
  }
}

module.exports = auth;
