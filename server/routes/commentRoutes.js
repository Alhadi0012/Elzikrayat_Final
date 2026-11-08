/**
 * Comment routes.
 *
 * Mounted inside photoRoutes at "/:id/comments", so mergeParams is required:
 * without it req.params.id would be undefined here and every lookup would
 * fail with a cast error.
 */
const express = require("express");
const router = express.Router({ mergeParams: true });

const auth = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");
const commentController = require("../controllers/commentController");

router.get("/", commentController.getByPhoto);
router.post("/", auth, validate(schemas.comment), commentController.create);
router.delete("/:commentId", auth, commentController.remove);

module.exports = router;
