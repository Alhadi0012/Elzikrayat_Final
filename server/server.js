/**
 * Alzikrayat API - entry point.
 *
 * In development the React app runs on Vite (port 5173) and proxies /api here.
 * In production the built client is served from this same server, so one
 * service covers the whole application.
 */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimit");

/* Load the models once so their indexes are registered with MongoDB. */
require("./models/User");
require("./models/Photo");
require("./models/Comment");
require("./models/Otp");

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

/* Behind a hosting proxy (Render, Railway, nginx) the real client IP arrives
   in X-Forwarded-For. Without this every request looks like one address and
   the rate limiter would lock out all users together. */
if (isProduction) app.set("trust proxy", 1);

/* The specification requires this folder. multer writes the uploaded file
   here, it is sent to Cloudinary, then deleted. Created at startup so the
   first upload cannot fail because the directory is missing. */
fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* Health check - confirms the API is up and the database is reachable. */
app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: "ok",
    database: states[mongoose.connection.readyState] || "unknown"
  });
});

/* Feature routes */
app.use("/api", generalLimiter);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/photos", require("./routes/photoRoutes"));

/* Any unknown /api path is a real 404 and must not fall through to the
   React app below, or the frontend would receive HTML where it expects JSON. */
app.use("/api", notFound);

/* Production: serve the built React app and let React Router handle the
   client-side routes. */
if (isProduction) {
  const clientDist = path.join(__dirname, "..", "client", "dist");

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (req, res) => res.sendFile(path.join(clientDist, "index.html")));
  } else {
    console.warn("client/dist not found - run `npm run build` inside client/");
  }
}

app.use(notFound);
app.use(errorHandler);

/* Connect first, then listen: never accept a request the API cannot serve. */
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`API running at http://localhost:${PORT}`);
    if (!process.env.EMAIL_USER) {
      console.log("Email not configured - OTP codes will be printed here.");
    }
  });
});
