/**
 * Comment controller.
 *
 * Comments are nested under a photo, so every route here receives the photo
 * id as req.params.id (the router is created with mergeParams).
 */
const Comment = require("../models/Comment");
const Photo = require("../models/Photo");

/**
 * GET /api/photos/:id/comments
 * Oldest first, which is how a conversation reads.
 */
exports.getByPhoto = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id).select("_id");
    if (!photo) {
      return res.status(404).json({ error: "Photo not found." });
    }

    const comments = await Comment.find({ photoId: req.params.id })
      .populate("userId", "firstName lastName")
      .sort({ dateTime: 1 });

    res.json({ success: true, count: comments.length, comments });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/photos/:id/comments   (protected)
 * Any logged-in user may comment on any photo.
 */
exports.create = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id).select("_id");
    if (!photo) {
      return res.status(404).json({ error: "Photo not found." });
    }

    const comment = await Comment.create({
      photoId: req.params.id,
      userId: req.user._id,
      comment: req.body.comment
    });

    /* Returned already populated so the frontend can append it to the list
       without fetching the whole thread again. */
    await comment.populate("userId", "firstName lastName");

    res.status(201).json({ success: true, comment });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/photos/:id/comments/:commentId   (protected)
 *
 * Allowed for the author of the comment and for the owner of the photo, so
 * a photo owner can remove something unwanted from under their own picture.
 */
exports.remove = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.photoId.toString() !== req.params.id) {
      return res.status(404).json({ error: "Comment not found." });
    }

    const photo = await Photo.findById(req.params.id).select("userId");
    if (!photo) {
      return res.status(404).json({ error: "Photo not found." });
    }

    const userId = req.user._id.toString();
    const isAuthor = comment.userId.toString() === userId;
    const isPhotoOwner = photo.userId.toString() === userId;

    if (!isAuthor && !isPhotoOwner) {
      return res.status(403).json({
        error: "You can only delete your own comments, or comments on your own photos."
      });
    }

    await comment.deleteOne();
    res.json({ success: true, message: "Comment deleted." });
  } catch (error) {
    next(error);
  }
};
