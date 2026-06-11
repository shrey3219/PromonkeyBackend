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
router.put("/:id", protect, authorize("admin"), uploadClient.single("profileImage"), updateClient);
router.delete("/:id", protect, authorize("admin"), deleteClient);

module.exports = router;
