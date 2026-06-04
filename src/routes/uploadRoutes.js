const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { uploadEditorFile: uploadMiddleware } = require("../config/cloudinary");
const { uploadEditorFile, deleteEditorFile } = require("../controllers/uploadController");

router.post(
  "/editor-file",
  protect,
  uploadMiddleware.single("file"),
  uploadEditorFile
);

router.delete("/editor-file", protect, deleteEditorFile);

module.exports = router;
