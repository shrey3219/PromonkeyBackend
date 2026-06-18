const router = require("express").Router();
const { protect, checkPermission, blockClient } = require("../middleware/authMiddleware");
const {
  createRole,
  getRoles,
  getRoleHierarchy,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

router.post("/", protect, blockClient, checkPermission("Roles", "create"), createRole);
router.put("/:id", protect, blockClient, checkPermission("Roles", "update"), updateRole);
router.delete("/:id", protect, blockClient, checkPermission("Roles", "delete"), deleteRole);
router.get("/hierarchy", protect, blockClient, checkPermission("Roles", "read"), getRoleHierarchy);
router.get("/", protect, blockClient, checkPermission("Roles", "read"), getRoles);
router.get("/:id", protect, blockClient, checkPermission("Roles", "read"), getRoleById);

module.exports = router;
