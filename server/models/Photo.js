/**
 * Photo model.
 *
 * The image itself lives on Cloudinary. The temporary file written by multer
 * into server/uploads/ is deleted as soon as the upload succeeds, so only the
 * metadata below is kept.
 *
 * cloudinaryPublicId is required: without it the image can never be removed
 * from Cloudinary, and deleting the document would leave an orphan file there.
 */
const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A photo must belong to a user."],
      index: true
    },

    title: {
      type: String,
      required: [true, "Title is required."],
      trim: true,
      maxlength: [200, "Title must be 200 characters or fewer."]
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description must be 1000 characters or fewer."],
      default: ""
    },

    /* The name multer gave the temporary file. Kept for traceability. */
    fileName: {
      type: String,
      required: [true, "File name is required."],
      trim: true,
      maxlength: 255
    },

    cloudinaryUrl: {
      type: String,
      required: [true, "Cloudinary URL is required."],
      trim: true
    },

    cloudinaryPublicId: {
      type: String,
      required: [true, "Cloudinary public id is required."],
      trim: true
    },

    dateTime: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

/* Newest first - the order the gallery uses. */
photoSchema.index({ dateTime: -1 });

/**
 * MongoDB has no ON DELETE CASCADE, so the comments of a deleted photo are
 * removed here. This fires for photo.deleteOne() and for
 * Photo.findOneAndDelete(), which covers the delete endpoint.
 */
async function removeComments(doc) {
  if (!doc) return;
  await mongoose.model("Comment").deleteMany({ photoId: doc._id });
}

photoSchema.post("deleteOne", { document: true, query: false }, async function () {
  await removeComments(this);
});

photoSchema.post("findOneAndDelete", async function (doc) {
  await removeComments(doc);
});

photoSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Photo", photoSchema);
