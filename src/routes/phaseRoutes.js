const router = require("express").Router();
const { protect, authorize, checkPermission } = require("../middleware/authMiddleware");
const {
  createPhase,
  getPhases,
  getPhaseById,
  updatePhase,
  deletePhase,
  getPhaseEmployees,
} = require("../controllers/phaseController");

router.post("/", protect, authorize("admin"), createPhase);
router.get("/", protect, checkPermission("Phases", "read"), getPhases);
router.get("/:id", protect, checkPermission("Phases", "read"), getPhaseById);
router.get("/:id/employees", protect, authorize("admin"), getPhaseEmployees);
router.put("/:id", protect, authorize("admin"), updatePhase);
router.delete("/:id", protect, authorize("admin"), deletePhase);

module.exports = router;
