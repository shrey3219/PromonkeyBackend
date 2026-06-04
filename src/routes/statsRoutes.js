const router = require("express").Router();
const { protect, checkPermission } = require("../middleware/authMiddleware");
const { getProjectStats, getEmployeeStats } = require("../controllers/statsController");

router.get("/project/:projectId", protect, checkPermission("Projects", "read"), getProjectStats);

router.get("/employee/:employeeId", protect, getEmployeeStats);

module.exports = router;
