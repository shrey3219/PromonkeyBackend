const router = require("express").Router();
const { protect, checkPermission, blockClient } = require("../middleware/authMiddleware");
const { uploadEmployee } = require("../config/cloudinary");
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

router.post("/", protect, blockClient, checkPermission("Employees", "create"), uploadEmployee.single("profileImage"), createEmployee);
router.get("/", protect, blockClient, checkPermission("Employees", "read"), getEmployees);
router.get("/:id", protect, blockClient, checkPermission("Employees", "read"), getEmployeeById);
router.put("/:id", protect, blockClient, checkPermission("Employees", "update"), uploadEmployee.single("profileImage"), updateEmployee);
router.delete("/:id", protect, blockClient, checkPermission("Employees", "delete"), deleteEmployee);

module.exports = router;
