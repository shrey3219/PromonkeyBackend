const router = require("express").Router();
const { protect, authorize, checkPermission } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

// Only admin can create/update/delete clients
router.post("/", protect, authorize("admin"), upload.single("profileImage"), createClient);
router.get("/", protect, checkPermission("Clients", "read"), getClients);
router.get("/:id", protect, checkPermission("Clients", "read"), getClientById);
router.put("/:id", protect, authorize("admin"), upload.single("profileImage"), updateClient);
router.delete("/:id", protect, authorize("admin"), deleteClient);

module.exports = router;
