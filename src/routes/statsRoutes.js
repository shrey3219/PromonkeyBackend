const router = require("express").Router();
const { protect, checkPermission } = require("../middleware/authMiddleware");
const { getProjectStats, getEmployeeStats } = require("../controllers/statsController");

// Project stats — phases estimated vs actual, at-risk flags
router.get("/project/:projectId", protect, checkPermission("Projects", "read"), getProjectStats);

// Employee stats — total hours logged per project
router.get("/employee/:employeeId", protect, getEmployeeStats);

module.exports = router;
