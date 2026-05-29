const router = require("express").Router();
const { protect, authorize, checkPermission } = require("../middleware/authMiddleware");
const {
  createPhase,
  getPhases,
  getPhaseById,
  updatePhase,
  deletePhase,
} = require("../controllers/phaseController");

// Create phase — admin only
router.post("/", protect, authorize("admin"), createPhase);

// Get all phases (filter by ?project=id)
router.get("/", protect, checkPermission("Projects", "read"), getPhases);

// Get single phase
router.get("/:id", protect, checkPermission("Projects", "read"), getPhaseById);

// Update phase — admin only
router.put("/:id", protect, authorize("admin"), updatePhase);

// Delete phase — admin only
router.delete("/:id", protect, authorize("admin"), deletePhase);

module.exports = router;
