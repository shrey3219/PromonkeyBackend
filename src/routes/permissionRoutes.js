const router = require("express").Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getValidModules,
  getPermissions,
  getPermissionsGrouped,
  createPermission,
  updatePermission,
  deletePermission,
} = require("../controllers/permissionController");

// Public-ish helper — frontend uses this to populate the module multi-select
router.get("/valid-modules", protect, authorize("admin"), getValidModules);

router.get("/grouped", protect, authorize("admin"), getPermissionsGrouped);
router.get("/", protect, authorize("admin"), getPermissions);
router.post("/", protect, authorize("admin"), createPermission);
router.put("/:id", protect, authorize("admin"), updatePermission);
router.delete("/:id", protect, authorize("admin"), deletePermission);

module.exports = router;
