const router = require("express").Router();
const { protect, authorize, checkPermission, blockClient } = require("../middleware/authMiddleware");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

router.post("/", protect, authorize("admin"), createTask);

router.get("/", protect, blockClient, checkPermission("Projects", "read"), getTasks);

router.get("/:id", protect, blockClient, checkPermission("Projects", "read"), getTaskById);

router.put("/:id", protect, authorize("admin"), updateTask);

router.delete("/:id", protect, authorize("admin"), deleteTask);

module.exports = router;
