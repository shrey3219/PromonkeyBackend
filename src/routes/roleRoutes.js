const router = require("express").Router();
const { protect, authorize, blockClient } = require("../middleware/authMiddleware");
const {
  createRole,
  getRoles,
  getRoleHierarchy,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

router.post("/", protect, authorize("admin"), createRole);
router.put("/:id", protect, authorize("admin"), updateRole);
router.delete("/:id", protect, authorize("admin"), deleteRole);
router.get("/hierarchy", protect, authorize("admin"), getRoleHierarchy);

router.get("/", protect, blockClient, getRoles);
router.get("/:id", protect, blockClient, getRoleById);

module.exports = router;
