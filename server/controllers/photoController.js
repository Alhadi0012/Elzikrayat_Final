/**
 * Photo controller.
 *
 * Upload path:
 *   multer writes the file into server/uploads/
 *   -> Cloudinary receives it
 *   -> the local file is deleted, whether the upload worked or not
 *   -> only the metadata stays in MongoDB
 */
const Photo = require("../models/Photo");
const Comment = require("../models/Comment");
const { cloudinary, isConfigured } = require("../config/cloudinary");
const { removeTempFile } = require("../middleware/upload");

const CLOUDINARY_FOLDER = "alzikrayat";

/**
 * GET /api/photos
 * Newest first, with the author's name attached for the gallery cards.
 * Optional ?page= and ?limit= for paging; without them everything is returned.
 */
exports.getAll = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 0));

    const query = Photo.find()
      .populate("userId", "firstName lastName")
      .sort({ dateTime: -1 });

    if (limit) query.skip((page - 1) * limit).limit(limit);

    const [photos, total] = await Promise.all([query.exec(), Photo.countDocuments()]);

    res.json({ success: true, count: photos.length, total, photos });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/photos/:id
 * The photo, its author and its comments in a single response, so the
 * detail page needs one request instead of two.
 */
exports.getOne = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id)
      .populate("userId", "firstName lastName");

    if (!photo) {
      return res.status(404).json({ error: "Photo not found." });
    }

    const comments = await Comment.find({ photoId: photo._id })
      .populate("userId", "firstName lastName")
      .sort({ dateTime: 1 });

    res.json({ success: true, photo, comments });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/photos   (protected, multipart/form-data)
 * Field name for the file: "photo"
 */
exports.create = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please choose an image to upload." });
  }

  if (!isConfigured()) {
    await removeTempFile(req.file.path);
    return res.status(503).json({ error: "Image storage is not configured on the server." });
  }

  try {
    /* Upload the file multer just wrote into server/uploads/. */
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: CLOUDINARY_FOLDER,
      resource_type: "image"
    });

    const photo = await Photo.create({
      userId: req.user._id,
      title: req.body.title,
      description: req.body.description || "",
      fileName: req.file.filename,
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id
    });

    await photo.populate("userId", "firstName lastName");

    res.status(201).json({ success: true, photo });
  } catch (error) {
    next(error);
  } finally {
    /* Runs on success AND on failure. Without the finally, every failed
       upload would leave an orphan file behind and slowly fill the disk. */
    await removeTempFile(req.file.path);
  }
};

/**
 * DELETE /api/photos/:id   (protected)
 * A user may delete only their own photos.
 */
exports.remove = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({ error: "Photo not found." });
    }

    /* Ownership is checked before anything is deleted. */
    if (photo.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only delete your own photos." });
    }

    /* Cloudinary first. If it failed after the document was gone, the image
       would stay there with nothing left pointing at it. */
    try {
      await cloudinary.uploader.destroy(photo.cloudinaryPublicId);
    } catch (error) {
      console.error("[cloudinary] destroy failed:", error.message);
      return res.status(502).json({ error: "Could not delete the image. Please try again." });
    }

    await photo.deleteOne(); // the model hook removes its comments

    res.json({ success: true, message: "Photo deleted." });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/photos/user/:userId
 * Every photo belonging to one user - used by the profile page.
 */
exports.getByUser = async (req, res, next) => {
  try {
    const photos = await Photo.find({ userId: req.params.userId })
      .populate("userId", "firstName lastName")
      .sort({ dateTime: -1 });

    res.json({ success: true, count: photos.length, photos });
  } catch (error) {
    next(error);
  }
};

/** GET /api/photos/stats - the counters shown on the home page. */
exports.getStats = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const [users, photos, comments] = await Promise.all([
      User.countDocuments({ isVerified: true }),
      Photo.countDocuments(),
      Comment.countDocuments()
    ]);

    res.json({ success: true, stats: { users, photos, comments } });
  } catch (error) {
    next(error);
  }
};
