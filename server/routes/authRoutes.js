/**
 * Authentication routes.
 *
 * Every route validates its body with Joi before the controller runs, so a
 * controller never has to defend itself against a malformed request.
 */
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");
const authController = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimit");

/* Public. Every one of these either guesses a secret or sends an email,
   so they all sit behind the strict rate limiter. */
router.post("/register",    authLimiter, validate(schemas.register),  authController.register);
router.post("/verify-otp",  authLimiter, validate(schemas.verifyOtp), authController.verifyOtp);
router.post("/resend-otp",  authLimiter, validate(schemas.emailOnly), authController.resendOtp);
router.post("/login",       authLimiter, validate(schemas.login),     authController.login);

/* Password reset */
router.post("/forgot-password", authLimiter, validate(schemas.emailOnly),     authController.forgotPassword);
router.post("/reset-password",  authLimiter, validate(schemas.resetPassword), authController.resetPassword);

/* Protected */
router.get("/me", auth, authController.me);

module.exports = router;
