/**
 * MongoDB connection.
 *
 * Called once from server.js before the HTTP server starts listening, so the
 * application never accepts a request it cannot serve.
 */
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MONGODB_URI is missing from server/.env");
    process.exit(1);
  }

  try {
    const connection = await mongoose.connect(uri);
    console.log(`DB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("DB connection failed:", error.message);
    process.exit(1);
  }

  /* Later failures do not go through the catch above. */
  mongoose.connection.on("error", err => console.error("DB error:", err.message));
  mongoose.connection.on("disconnected", () => console.warn("DB disconnected"));
}

module.exports = connectDB;
