/**
 * Photo routes.
 *
 * Middleware order on the upload route matters:
 *   auth    -> reject anonymous callers before any file is written
 *   upload  -> multer parses multipart/form-data and fills req.body/req.file
 *   validate-> Joi can only see req.body after multer has parsed it
 */
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { validate, schemas } = require("../middleware/validation");
const photoController = require("../controllers/photoController");
const commentRoutes = require("./commentRoutes");

/* Comments live under a photo: /api/photos/:id/comments */
router.use("/:id/comments", commentRoutes);

/* Public reads. "stats" is declared before "/:id" so it is not swallowed
   by the id parameter. */
router.get("/stats", photoController.getStats);
router.get("/user/:userId", photoController.getByUser);
router.get("/", photoController.getAll);
router.get("/:id", photoController.getOne);

/* Protected writes */
router.post("/", auth, upload.single("photo"), validate(schemas.photo), photoController.create);
router.delete("/:id", auth, photoController.remove);

module.exports = router;
