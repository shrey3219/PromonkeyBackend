const router = require("express").Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getPermissions,
  getPermissionsGrouped,
  createPermission,
  updatePermission,
  deletePermission,
} = require("../controllers/permissionController");

// Static routes before /:id
router.get("/grouped", protect, getPermissionsGrouped);

router.get("/", protect, getPermissions);
router.post("/", protect, authorize("admin"), createPermission);
router.put("/:id", protect, authorize("admin"), updatePermission);
router.delete("/:id", protect, authorize("admin"), deletePermission);

module.exports = router;
