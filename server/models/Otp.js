/**
 * OTP model.
 *
 * Used twice: to verify a new account after registration, and to reset a
 * forgotten password. Both flows are the same shape, so one collection with a
 * `purpose` field covers them.
 *
 * After MAX_ATTEMPTS wrong guesses the code is destroyed and the account is
 * locked out of requesting another one for a while - see User.otpLockedUntil.
 *
 * Only the HASH of the code is stored. Anyone who reads the database - or a
 * leaked backup of it - still cannot use the codes.
 *
 * expiresAt carries a TTL index, so MongoDB deletes expired documents by
 * itself and the collection never fills up with dead codes.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const OTP_LENGTH = 6;
const LIFETIME_MINUTES = 10;
const MAX_ATTEMPTS = 3;

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      index: true
    },

    otpHash: {
      type: String,
      required: [true, "OTP hash is required."]
    },

    purpose: {
      type: String,
      required: [true, "Purpose is required."],
      enum: {
        values: ["verify", "reset"],
        message: "Purpose must be either 'verify' or 'reset'."
      }
    },

    /* Wrong guesses so far. The code dies once this reaches MAX_ATTEMPTS. */
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },

    expiresAt: {
      type: Date,
      required: true,
      /* TTL index: MongoDB removes the document once this moment passes. */
      index: { expires: 0 }
    }
  },
  { timestamps: true }
);

/* One active code per email per purpose. */
otpSchema.index({ email: 1, purpose: 1 });

otpSchema.statics.OTP_LENGTH = OTP_LENGTH;
otpSchema.statics.LIFETIME_MINUTES = LIFETIME_MINUTES;
otpSchema.statics.MAX_ATTEMPTS = MAX_ATTEMPTS;

/**
 * Generate a cryptographically random numeric code.
 * Math.random() is not used here: it is predictable and must never produce
 * a security token.
 */
otpSchema.statics.generateCode = function () {
  const max = 10 ** OTP_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(OTP_LENGTH, "0");
};

/**
 * Replace any existing code for this email+purpose with a fresh one.
 * Returns the PLAIN code, which is emailed and then forgotten by the server.
 */
otpSchema.statics.issue = async function (email, purpose) {
  const code = this.generateCode();

  await this.deleteMany({ email: email.toLowerCase(), purpose });

  await this.create({
    email: email.toLowerCase(),
    purpose,
    otpHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + LIFETIME_MINUTES * 60 * 1000)
  });

  return code;
};

/**
 * Check a submitted code.
 * Returns { ok: true } or { ok: false, reason } - the caller turns the reason
 * into a message. A correct code is consumed so it cannot be replayed.
 */
otpSchema.statics.verify = async function (email, purpose, code) {
  const record = await this.findOne({ email: email.toLowerCase(), purpose });

  /* The TTL index may not have swept an expired document yet, so the
     expiry is also checked here rather than trusted to MongoDB alone. */
  if (!record) return { ok: false, reason: "not_found" };
  if (record.expiresAt <= new Date()) {
    await record.deleteOne();
    return { ok: false, reason: "expired" };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await record.deleteOne();
    return { ok: false, reason: "too_many_attempts" };
  }

  const matches = await bcrypt.compare(String(code), record.otpHash);
  if (!matches) {
    record.attempts += 1;
    await record.save();
    return { ok: false, reason: "incorrect", attemptsLeft: MAX_ATTEMPTS - record.attempts };
  }

  await record.deleteOne(); // single use
  return { ok: true };
};

module.exports = mongoose.model("Otp", otpSchema);
