const router = require("express").Router();
const { protect, checkPermission, blockClient } = require("../middleware/authMiddleware");
const { uploadClient } = require("../config/cloudinary");
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

router.post("/", protect, blockClient, checkPermission("Clients", "create"), uploadClient.single("profileImage"), createClient);
router.get("/", protect, blockClient, checkPermission("Clients", "read"), getClients);
router.get("/:id", protect, blockClient, checkPermission("Clients", "read"), getClientById);
router.put("/:id", protect, blockClient, checkPermission("Clients", "update"), uploadClient.single("profileImage"), updateClient);
router.delete("/:id", protect, blockClient, checkPermission("Clients", "delete"), deleteClient);

module.exports = router;
