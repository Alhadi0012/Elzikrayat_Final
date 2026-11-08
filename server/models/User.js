/**
 * User model.
 *
 * Holds the account itself plus the optional profile fields from the
 * specification. The password is stored only as a bcrypt hash and is never
 * returned by a normal query, because `select: false` keeps it out of every
 * find() unless it is asked for explicitly.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/;
const NAME_PATTERN = /^[A-Za-z؀-ۿ\s]{2,50}$/;

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required."],
      trim: true,
      maxlength: [50, "First name must be 50 characters or fewer."],
      match: [NAME_PATTERN, "First name may contain letters only."]
    },

    lastName: {
      type: String,
      required: [true, "Last name is required."],
      trim: true,
      maxlength: [50, "Last name must be 50 characters or fewer."],
      match: [NAME_PATTERN, "Last name may contain letters only."]
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [100, "Email must be 100 characters or fewer."],
      match: [EMAIL_PATTERN, "Please enter a valid email address."]
    },

    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [6, "Password must be at least 6 characters long."],
      select: false // never comes back from a normal query
    },

    /* Set to true only after the registration OTP has been confirmed. */
    isVerified: {
      type: Boolean,
      default: false
    },

    /* Set after too many wrong OTP guesses. While this is in the future the
       account cannot request or submit another code. */
    otpLockedUntil: {
      type: Date,
      default: null
    },

    /* Optional profile fields. */
    location: { type: String, trim: true, maxlength: 100, default: "" },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    occupation: { type: String, trim: true, maxlength: 100, default: "" }
  },
  { timestamps: true }
);

/**
 * Hash the password before saving.
 * Runs only when the password actually changed, so updating a profile field
 * does not hash an already hashed value a second time.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare a plain password with the stored hash.
 * The caller must have loaded the user with .select("+password").
 */
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

/** True while the account is locked out of the OTP flow. */
userSchema.methods.isOtpLocked = function () {
  return Boolean(this.otpLockedUntil && this.otpLockedUntil > new Date());
};

/** Whole minutes still remaining on the lock, for the message shown to the user. */
userSchema.methods.otpLockMinutesLeft = function () {
  if (!this.isOtpLocked()) return 0;
  return Math.ceil((this.otpLockedUntil - Date.now()) / 60000);
};

/** Convenience virtual used when displaying the author of a photo. */
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/* Make sure the hash never leaks through res.json(user). */
userSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);
