const router = require("express").Router();
const { protect, checkPermission, blockClient } = require("../middleware/authMiddleware");
const {
  createPhase,
  getPhases,
  getPhaseById,
  updatePhase,
  deletePhase,
  getPhaseEmployees,
  getPhaseMembers,
} = require("../controllers/phaseController");

router.post("/", protect, blockClient, checkPermission("Phases", "create"), createPhase);
router.get("/", protect, checkPermission("Phases", "read"), getPhases);
router.get("/:id", protect, checkPermission("Phases", "read"), getPhaseById);
router.get("/:id/employees", protect, blockClient, checkPermission("Phases", "read"), getPhaseEmployees);
router.get("/:id/members", protect, blockClient, checkPermission("Phases", "read"), getPhaseMembers);
router.put("/:id", protect, blockClient, checkPermission("Phases", "update"), updatePhase);
router.delete("/:id", protect, blockClient, checkPermission("Phases", "delete"), deletePhase);

module.exports = router;
