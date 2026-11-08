/**
 * Email sending.
 *
 * Works with Gmail (using an App Password, not the account password) or any
 * SMTP server. Set EMAIL_HOST to use a different provider such as Brevo.
 *
 * DEVELOPMENT FALLBACK: when EMAIL_USER is empty the message is printed to the
 * terminal instead of being sent. This lets the whole OTP flow be built and
 * tested before any mail account exists. It is never used once EMAIL_USER is
 * configured, and must not be relied on in the live demo.
 */
const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  } else {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }

  return transporter;
}

/**
 * Send one email. Returns true when it left the server.
 * A failure is logged and returned as false - the caller decides what the
 * user sees, so a mail outage never crashes a request.
 */
async function sendEmail({ to, subject, html, text }) {
  if (!process.env.EMAIL_USER) {
    console.warn("\n--- EMAIL NOT CONFIGURED - printing instead of sending ---");
    console.warn(`To:      ${to}`);
    console.warn(`Subject: ${subject}`);
    console.warn(`Body:    ${text}`);
    console.warn("--- set EMAIL_USER and EMAIL_PASS in .env to send for real ---\n");
    return true;
  }

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html
    });
    return true;
  } catch (error) {
    console.error("[email] failed:", error.message);
    return false;
  }
}

/** The OTP email used by both the verification and the reset flows. */
function otpEmail(code, purpose, minutes) {
  const isVerify = purpose === "verify";
  const title = isVerify ? "Confirm your email" : "Reset your password";
  const line = isVerify
    ? "Welcome to Alzikrayat. Use the code below to confirm your email address."
    : "We received a request to reset your password. Use the code below to continue.";

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;
              border:1px solid #e3e8ef;border-radius:12px;color:#1f2a37">
    <h2 style="margin:0 0 4px;color:#1b2a4a">Alzikrayat</h2>
    <p style="margin:0 0 18px;color:#5b6878;font-size:14px">${title}</p>
    <p style="font-size:14px;line-height:1.6">${line}</p>
    <div style="margin:22px 0;padding:16px;background:#f1f4f8;border-radius:10px;text-align:center">
      <span style="font-size:30px;font-weight:700;letter-spacing:7px;color:#1b2a4a">${code}</span>
    </div>
    <p style="font-size:13px;color:#5b6878;line-height:1.6">
      This code expires in ${minutes} minutes and can be used once.<br>
      If you did not request it, you can ignore this email.
    </p>
  </div>`;

  return {
    subject: `${title} - Alzikrayat`,
    html,
    text: `${line}\n\nYour code is ${code}. It expires in ${minutes} minutes.`
  };
}

module.exports = { sendEmail, otpEmail };
