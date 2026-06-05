const router = require("express").Router();
const { protect, authorize, checkPermission } = require("../middleware/authMiddleware");
const {
  createPhase,
  getPhases,
  getPhaseById,
  updatePhase,
  deletePhase,
} = require("../controllers/phaseController");

router.post("/", protect, authorize("admin"), createPhase);

router.get("/", protect, checkPermission("Projects", "read"), getPhases);

router.get("/:id", protect, checkPermission("Projects", "read"), getPhaseById);

router.put("/:id", protect, authorize("admin"), updatePhase);

router.delete("/:id", protect, authorize("admin"), deletePhase);

module.exports = router;
