/**
 * Upload middleware.
 *
 * The specification requires the file to be written into server/uploads/, so
 * multer uses diskStorage rather than memory. The controller then sends that
 * file to Cloudinary and deletes it, leaving the folder empty between uploads.
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = require("fs").promises;
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

/* Created at startup so the first upload cannot fail on a missing folder. */
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),

  filename: (req, file, cb) => {
    /* A random name prevents two uploads from overwriting each other and
       stops a crafted original filename from escaping the folder. */
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `photo_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  /* Both checks matter: the extension can be faked, and so can the mimetype,
     but requiring the two together rejects the obvious cases. */
  if (!ALLOWED_EXTENSIONS.includes(ext) || !file.mimetype.startsWith("image/")) {
    return cb(new Error("Only PNG, JPG, JPEG, GIF or WEBP images are allowed."));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_BYTES } });

/**
 * Delete a temporary file.
 * Never throws: cleanup failing must not turn a successful upload into an
 * error, and a missing file is not a problem.
 */
async function removeTempFile(filePath) {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("[cleanup] could not delete", filePath, "-", error.message);
    }
  }
}

module.exports = { upload, removeTempFile, UPLOAD_DIR, MAX_BYTES };
