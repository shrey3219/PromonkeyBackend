const router = require("express").Router();
const { protect, authorize, blockClient } = require("../middleware/authMiddleware");
const {
  logTime,
  getTimeEntries,
  deleteTimeEntry,
} = require("../controllers/timeEntryController");

router.post("/", protect, blockClient, logTime);
router.get("/", protect, blockClient, getTimeEntries);
router.delete("/:id", protect, blockClient, deleteTimeEntry);

module.exports = router;
