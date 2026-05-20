const router = require("express").Router();
const { protect, checkPermission } = require("../middleware/authMiddleware");
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

router.post("/", protect, checkPermission("Employees", "create"), createEmployee);
router.get("/", protect, checkPermission("Employees", "read"), getEmployees);
router.get("/:id", protect, checkPermission("Employees", "read"), getEmployeeById);
router.put("/:id", protect, checkPermission("Employees", "update"), updateEmployee);
router.delete("/:id", protect, checkPermission("Employees", "delete"), deleteEmployee);

module.exports = router;
