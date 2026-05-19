const router = require("express").Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createRole,
  getRoles,
  getRoleHierarchy,
  getPermissionsSchema,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

// Static paths must come before /:id
router.get("/permissions-schema", protect, getPermissionsSchema);
router.get("/hierarchy", protect, getRoleHierarchy);

router.post("/", protect, authorize("admin"), createRole);
router.get("/", protect, getRoles);
router.get("/:id", protect, getRoleById);
router.put("/:id", protect, authorize("admin"), updateRole);
router.delete("/:id", protect, authorize("admin"), deleteRole);

module.exports = router;
