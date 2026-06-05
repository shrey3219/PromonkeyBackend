const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/dashboardController");

router.get("/", protect, getDashboard);

module.exports = router;
