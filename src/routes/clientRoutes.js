const router = require("express").Router();
const { protect, authorize, checkPermission, blockClient } = require("../middleware/authMiddleware");
const { uploadClient } = require("../config/cloudinary");
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

router.post("/", protect, authorize("admin"), uploadClient.single("profileImage"), createClient);
router.get("/", protect, blockClient, checkPermission("Clients", "read"), getClients);
router.get("/:id", protect, blockClient, checkPermission("Clients", "read"), getClientById);
router.put("/:id", protect, authorize("admin"), (req, res, next) => {
  // Only run multer if request is multipart (has a file); otherwise skip to allow JSON
  const ct = req.headers["content-type"] || "";
  if (ct.includes("multipart/form-data")) {
    uploadClient.single("profileImage")(req, res, next);
  } else {
    next();
  }
}, updateClient);
router.delete("/:id", protect, authorize("admin"), deleteClient);

module.exports = router;
