/**
 * Rate limiting.
 *
 * The OTP model already limits how many times one code can be guessed, but
 * nothing stopped an attacker from trying thousands of passwords on /login or
 * from using /forgot-password to flood someone's inbox. These two limiters
 * close that gap.
 *
 * The window is per IP address.
 */
const rateLimit = require("express-rate-limit");

const json = message => (req, res) => res.status(429).json({ error: message });

/**
 * Tight limit for the endpoints that guess a secret or send an email.
 * Successful requests are not counted, so a user who logs in correctly is
 * never punished for someone else's failed attempts from the same network.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json("Too many attempts. Please try again in 15 minutes.")
});

/** Looser limit for everything else under /api, to absorb a burst. */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json("Too many requests. Please slow down.")
});

module.exports = { authLimiter, generalLimiter };
