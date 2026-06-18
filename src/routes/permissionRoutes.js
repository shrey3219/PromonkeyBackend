const router = require("express").Router();
const { protect, checkPermission, blockClient } = require("../middleware/authMiddleware");
const {
  getValidModules,
  getPermissions,
  getPermissionsGrouped,
  createPermission,
  updatePermission,
  deletePermission,
} = require("../controllers/permissionController");

router.get("/valid-modules", protect, blockClient, getValidModules);

router.get("/grouped", protect, blockClient, checkPermission("Permissions", "read"), getPermissionsGrouped);
router.get("/", protect, blockClient, checkPermission("Permissions", "read"), getPermissions);
router.post("/", protect, blockClient, checkPermission("Permissions", "create"), createPermission);
router.put("/:id", protect, blockClient, checkPermission("Permissions", "update"), updatePermission);
router.delete("/:id", protect, blockClient, checkPermission("Permissions", "delete"), deletePermission);

module.exports = router;
