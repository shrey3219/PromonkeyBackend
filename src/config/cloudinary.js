const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Factory — creates a multer upload instance for a given Cloudinary folder (images only)
const createUpload = (folder) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    },
  });

  return multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"), false);
      }
    },
  });
};

// Factory — creates a multer upload instance for documents (pdf, docx, images, etc.)
const createDocUpload = (folder) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      const isImage = file.mimetype.startsWith("image/");
      return {
        folder,
        resource_type: isImage ? "image" : "raw",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "xls", "xlsx", "txt"],
        public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
      };
    },
  });

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "image/jpeg", "image/png", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("File type not allowed. Supported: images, PDF, DOC, DOCX, XLS, XLSX, TXT"), false);
      }
    },
  });
};

// Separate upload instances per role
const uploadEmployee = createUpload("promonkey/employees");
const uploadClient   = createUpload("promonkey/clients");
const uploadAdmin    = createUpload("promonkey/admins");

// Project requirement docs upload
const uploadProjectDocs = createDocUpload("promonkey/projects/docs");

// Editor upload — images + documents for description fields
const uploadEditorFile = createDocUpload("promonkey/editor");

module.exports = { cloudinary, uploadEmployee, uploadClient, uploadAdmin, uploadProjectDocs, uploadEditorFile };
