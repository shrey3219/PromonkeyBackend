const router = require("express").Router();
const { protect, checkPermission } = require("../middleware/authMiddleware");
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

router.post("/", protect, checkPermission("employee", "create"), createEmployee);
router.get("/", protect, checkPermission("employee", "read"), getEmployees);
router.get("/:id", protect, checkPermission("employee", "read"), getEmployeeById);
router.put("/:id", protect, checkPermission("employee", "update"), updateEmployee);
router.delete("/:id", protect, checkPermission("employee", "delete"), deleteEmployee);

module.exports = router;
