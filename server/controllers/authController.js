/**
 * Authentication controller.
 *
 * Flows:
 *   register        -> account created with isVerified: false, OTP emailed
 *   verifyOtp       -> isVerified becomes true, a JWT is returned
 *   login           -> refused until the account is verified
 *   forgotPassword  -> emails a reset code
 *   resetPassword   -> checks the code and sets the new password
 *
 * Lockout: MAX_ATTEMPTS wrong codes locks the account out of the OTP flow
 * for LOCK_MINUTES. The lock lives on the user document, so destroying the
 * OTP record cannot be used to escape it.
 */
const User = require("../models/User");
const Otp = require("../models/Otp");
const { signToken } = require("../utils/token");
const { sendEmail, otpEmail } = require("../utils/sendEmail");

const RESEND_COOLDOWN_SECONDS = 60;
const LOCK_MINUTES = 60;

/** Issue a code, email it, and report whether the mail left the server. */
async function issueAndSend(email, purpose) {
  const code = await Otp.issue(email, purpose);
  const message = otpEmail(code, purpose, Otp.LIFETIME_MINUTES);
  return sendEmail({ to: email, ...message });
}

/** Start the lock after the final wrong attempt. */
async function lockAccount(user) {
  user.otpLockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
  await user.save();
}

/**
 * If the account is locked, answer with 429 and return true.
 * Callers use: if (rejectIfLocked(user, res)) return;
 */
function rejectIfLocked(user, res) {
  if (!user.isOtpLocked()) return false;

  const minutes = user.otpLockMinutesLeft();
  res.status(429).json({
    error: `Too many incorrect codes. Please try again in ${minutes} minute(s).`,
    lockedUntil: user.otpLockedUntil,
    minutesLeft: minutes
  });
  return true;
}

/** Turn a verify() failure into a message the user can act on. */
function otpFailureMessage(result) {
  switch (result.reason) {
    case "expired":
      return "This code has expired. Please request a new one.";
    case "too_many_attempts":
      return `Too many incorrect codes. Please try again in ${LOCK_MINUTES} minutes.`;
    case "not_found":
      return "No active code for this email. Please request a new one.";
    default:
      return result.attemptsLeft > 0
        ? `Incorrect code. You have ${result.attemptsLeft} attempt(s) left.`
        : `Incorrect code. Please try again in ${LOCK_MINUTES} minutes.`;
  }
}

/**
 * Shared handling of a failed code check: apply the lock when the attempts
 * ran out, then reply.
 */
async function handleOtpFailure(user, result, res) {
  if (result.reason === "too_many_attempts" || result.attemptsLeft === 0) {
    await lockAccount(user);
    return res.status(429).json({
      error: `Too many incorrect codes. Please try again in ${LOCK_MINUTES} minutes.`,
      lockedUntil: user.otpLockedUntil,
      minutesLeft: LOCK_MINUTES
    });
  }
  return res.status(400).json({ error: otpFailureMessage(result) });
}

/* ------------------------------------------------------------------ */
/* Registration and verification                                       */
/* ------------------------------------------------------------------ */

/**
 * POST /api/auth/register
 *
 * An existing but unverified email is not an error: the user probably
 * abandoned the first attempt, so a fresh code is sent instead of blocking
 * them out of their own address forever.
 */
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, location, description, occupation } = req.body;

    const existing = await User.findOne({ email });

    if (existing && existing.isVerified) {
      return res.status(409).json({ error: "This email is already registered. Please log in." });
    }

    if (existing && !existing.isVerified) {
      if (rejectIfLocked(existing, res)) return;

      existing.firstName = firstName;
      existing.lastName = lastName;
      existing.password = password; // re-hashed by the pre-save hook
      await existing.save();

      await issueAndSend(email, "verify");
      return res.status(200).json({
        success: true,
        email,
        message: "This email was already registered but not confirmed. A new code has been sent."
      });
    }

    await User.create({
      firstName, lastName, email, password,
      location: location || "",
      description: description || "",
      occupation: occupation || ""
    });

    const sent = await issueAndSend(email, "verify");

    res.status(201).json({
      success: true,
      email,
      message: sent
        ? `Account created. A ${Otp.OTP_LENGTH}-digit code has been sent to ${email}.`
        : "Account created, but the email could not be sent. Please use Resend code."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Confirms the email and logs the user in straight away.
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found for this email." });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: "This email is already confirmed. Please log in." });
    }
    if (rejectIfLocked(user, res)) return;

    const result = await Otp.verify(email, "verify", otp);
    if (!result.ok) {
      return handleOtpFailure(user, result, res);
    }

    user.isVerified = true;
    user.otpLockedUntil = null; // a correct code clears any earlier lock
    await user.save();

    res.json({
      success: true,
      message: "Email confirmed. Welcome to Alzikrayat.",
      token: signToken(user._id),
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/resend-otp
 * Rate limited by the age of the current code, and blocked entirely while
 * the account is locked.
 */
exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found for this email." });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: "This email is already confirmed. Please log in." });
    }
    if (rejectIfLocked(user, res)) return;

    const current = await Otp.findOne({ email, purpose: "verify" });
    if (current) {
      const ageSeconds = (Date.now() - current.createdAt.getTime()) / 1000;
      if (ageSeconds < RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - ageSeconds);
        return res.status(429).json({
          error: `Please wait ${wait} second(s) before requesting another code.`,
          retryAfter: wait
        });
      }
    }

    const sent = await issueAndSend(email, "verify");
    if (!sent) {
      return res.status(502).json({ error: "The email could not be sent. Please try again shortly." });
    }

    res.json({ success: true, message: `A new code has been sent to ${email}.` });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

/**
 * POST /api/auth/login
 *
 * The same message is returned for an unknown email and a wrong password, so
 * the endpoint cannot be used to discover which addresses are registered.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.isVerified) {
      if (rejectIfLocked(user, res)) return;

      await issueAndSend(email, "verify");
      return res.status(403).json({
        error: "Please confirm your email first. A new code has been sent.",
        needsVerification: true,
        email
      });
    }

    user.password = undefined; // keep the hash out of the response
    res.json({ success: true, token: signToken(user._id), user });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------------------------------ */
/* Password reset                                                      */
/* ------------------------------------------------------------------ */

/**
 * POST /api/auth/forgot-password
 *
 * Always answers with the same message, whether or not the email exists and
 * whether or not the account is locked. Anything else would turn this
 * endpoint into a way of discovering which addresses are registered.
 */
exports.forgotPassword = async (req, res, next) => {
  const GENERIC = "If an account exists for that email, a reset code has been sent.";

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    /* Silently skip sending for unknown, unverified or locked accounts -
       the reply below is identical either way. */
    if (user && user.isVerified && !user.isOtpLocked()) {
      await issueAndSend(email, "reset");
    }

    res.json({ success: true, message: GENERIC });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Checks the reset code, then sets the new password.
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid code." });
    }
    if (rejectIfLocked(user, res)) return;

    const result = await Otp.verify(email, "reset", otp);
    if (!result.ok) {
      return handleOtpFailure(user, result, res);
    }

    user.password = newPassword;     // hashed by the pre-save hook
    user.otpLockedUntil = null;
    await user.save();

    /* Any pending verification code is now meaningless. */
    await Otp.deleteMany({ email, purpose: "verify" });

    res.json({
      success: true,
      message: "Your password has been changed. Please log in.",
      token: signToken(user._id),
      user
    });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------------------------------ */

/**
 * GET /api/auth/me   (protected)
 * Used by the frontend on page load to restore the session from a stored token.
 */
exports.me = async (req, res) => {
  res.json({ success: true, user: req.user });
};
