const router = require("express").Router();
const { protect, authorize, checkPermission } = require("../middleware/authMiddleware");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  toggleStep,
} = require("../controllers/taskController");

// Create task — admin only
router.post("/", protect, authorize("admin"), createTask);

// Get all tasks (filter by ?phase=id or ?project=id or ?assignedTo=empId)
router.get("/", protect, checkPermission("Projects", "read"), getTasks);

// Get single task
router.get("/:id", protect, checkPermission("Projects", "read"), getTaskById);

// Update task — admin only
router.put("/:id", protect, authorize("admin"), updateTask);

// Toggle step completion — admin or assigned employee
router.patch("/:id/steps/:stepId", protect, toggleStep);

// Delete task — admin only
router.delete("/:id", protect, authorize("admin"), deleteTask);

module.exports = router;
