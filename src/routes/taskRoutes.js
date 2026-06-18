const router = require("express").Router();
const { protect, checkPermission, blockClient } = require("../middleware/authMiddleware");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskMembers,
} = require("../controllers/taskController");

router.post("/", protect, blockClient, checkPermission("Tasks", "create"), createTask);
router.get("/", protect, blockClient, checkPermission("Tasks", "read"), getTasks);
router.get("/:id", protect, blockClient, checkPermission("Tasks", "read"), getTaskById);
router.get("/:id/members", protect, blockClient, checkPermission("Tasks", "read"), getTaskMembers);
router.put("/:id", protect, blockClient, checkPermission("Tasks", "update"), updateTask);
router.delete("/:id", protect, blockClient, checkPermission("Tasks", "delete"), deleteTask);

module.exports = router;
