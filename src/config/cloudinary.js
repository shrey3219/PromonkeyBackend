const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//  profile image upload (images only, 2MB)
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
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"), false);
      }
    },
  });
};

//  project docs upload (images + documents, 10MB)
const createDocUpload = (folder) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      const isImage = file.mimetype.startsWith("image/");
      return {
        folder,
        resource_type: isImage ? "image" : "raw",
        format: "",
        access_mode: "public",
        public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      };
    },
  });

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "image/jpeg", "image/png", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/zip",
        "application/x-zip-compressed",
        "application/x-rar-compressed",
        "application/octet-stream",
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("File type not allowed. Supported: images, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR"), false);
      }
    },
  });
};

// editor upload (images + documents + videos, 100MB)
const createEditorUpload = (folder) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      const isImage = file.mimetype.startsWith("image/");
      const isVideo = file.mimetype.startsWith("video/");
      return {
        folder,
        resource_type: isImage ? "image" : isVideo ? "video" : "raw",
        format: "",
        access_mode: "public",
        public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      };
    },
  });

  return multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/zip",
        "application/x-zip-compressed",
        "application/x-rar-compressed",
        "application/octet-stream",
        "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("File type not allowed. Supported: images, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR, MP4, WEBM, MOV, AVI"), false);
      }
    },
  });
};

// Upload instances
const uploadEmployee    = createUpload("promonkey/employees");
const uploadClient      = createUpload("promonkey/clients");
const uploadAdmin       = createUpload("promonkey/admins");
const uploadProjectDocs = createDocUpload("promonkey/projects/docs");
const uploadEditorFile  = createEditorUpload("promonkey/editor");

module.exports = {
  cloudinary,
  uploadEmployee,
  uploadClient,
  uploadAdmin,
  uploadProjectDocs,
  uploadEditorFile,
};
