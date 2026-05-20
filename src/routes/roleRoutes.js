const router = require("express").Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createRole,
  getRoles,
  getRoleHierarchy,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

router.get("/hierarchy", protect, getRoleHierarchy);

router.post("/", protect, authorize("admin"), createRole);
router.get("/", protect, getRoles);
router.get("/:id", protect, getRoleById);
router.put("/:id", protect, authorize("admin"), updateRole);
router.delete("/:id", protect, authorize("admin"), deleteRole);

module.exports = router;
