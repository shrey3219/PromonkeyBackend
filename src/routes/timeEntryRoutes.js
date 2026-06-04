const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const {
  logTime,
  getTimeEntries,
  deleteTimeEntry,
} = require("../controllers/timeEntryController");

router.post("/", protect, logTime);
router.get("/", protect, getTimeEntries);
router.delete("/:id", protect, deleteTimeEntry);

module.exports = router;
