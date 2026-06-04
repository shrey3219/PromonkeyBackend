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
    await cloudinary.uploader.destroy(publicId, {
      resource_type: isImage ? "image" : "raw",
    });

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
