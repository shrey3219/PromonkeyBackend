const { cloudinary } = require("../config/cloudinary");

exports.uploadEditorFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.status(201).json({
      url: req.file.path,   
      publicId: req.file.filename,
      name: req.file.originalname,
      fileType: req.file.mimetype,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteEditorFile = async (req, res) => {
  try {
    const { publicId, fileType } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: "publicId is required" });
    }

    const isImage = fileType && fileType.startsWith("image/");
    const isVideo = fileType && fileType.startsWith("video/");
    const resourceType = isImage ? "image" : isVideo ? "video" : "raw";

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
