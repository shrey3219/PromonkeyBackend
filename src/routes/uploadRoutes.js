const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { uploadEditorFile: uploadMiddleware } = require("../config/cloudinary");
const { uploadEditorFile, deleteEditorFile } = require("../controllers/uploadController");

// Upload image or document for editor description
// Supports: jpg, jpeg, png, webp, pdf, doc, docx, xls, xlsx, txt — max 10MB
router.post(
  "/editor-file",
  protect,
  uploadMiddleware.single("file"),
  uploadEditorFile
);

// Delete uploaded editor file
router.delete("/editor-file", protect, deleteEditorFile);

module.exports = router;
