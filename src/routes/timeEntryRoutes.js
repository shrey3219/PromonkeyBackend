const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const {
  logTime,
  getTimeEntries,
  deleteTimeEntry,
} = require("../controllers/timeEntryController");

// Log time — any authenticated employee
router.post("/", protect, logTime);

// Get time entries (filter by ?task=id or ?phase=id or ?project=id or ?employee=id)
router.get("/", protect, getTimeEntries);

// Delete a time entry
router.delete("/:id", protect, deleteTimeEntry);

module.exports = router;
