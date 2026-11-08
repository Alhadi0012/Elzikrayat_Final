/**
 * JWT helpers.
 *
 * The token carries only the user id. Everything else is read from the
 * database on each request, so a token can never hold stale data such as an
 * old verification status.
 */
const jwt = require("jsonwebtoken");

function signToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from server/.env");
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
