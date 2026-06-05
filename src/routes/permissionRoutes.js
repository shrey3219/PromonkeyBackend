const router = require("express").Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getPermissions,
  getPermissionsGrouped,
  createPermission,
  updatePermission,
  deletePermission,
} = require("../controllers/permissionController");

router.get("/grouped", protect, authorize("admin"), getPermissionsGrouped);
router.get("/", protect, authorize("admin"), getPermissions);
router.post("/", protect, authorize("admin"), createPermission);
router.put("/:id", protect, authorize("admin"), updatePermission);
router.delete("/:id", protect, authorize("admin"), deletePermission);

module.exports = router;
