/**
 * Comment model.
 *
 * A comment always belongs to one photo and one user. Both references are
 * required, so a comment can never become detached from its context.
 */
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    photoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photo",
      required: [true, "A comment must belong to a photo."],
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A comment must have an author."],
      index: true
    },

    comment: {
      type: String,
      required: [true, "Comment text is required."],
      trim: true,
      minlength: [1, "Comment cannot be empty."],
      maxlength: [500, "Comment must be 500 characters or fewer."]
    },

    dateTime: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

/* Oldest first within a photo - the order the detail page reads them. */
commentSchema.index({ photoId: 1, dateTime: 1 });

commentSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Comment", commentSchema);
