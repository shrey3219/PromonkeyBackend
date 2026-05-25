const router = require("express").Router();
const { protect, checkPermission } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

// upload.single("profileImage") — frontend must send file with field name "profileImage"
router.post("/", protect, checkPermission("Employees", "create"), upload.single("profileImage"), createEmployee);
router.get("/", protect, checkPermission("Employees", "read"), getEmployees);
router.get("/:id", protect, checkPermission("Employees", "read"), getEmployeeById);
router.put("/:id", protect, checkPermission("Employees", "update"), upload.single("profileImage"), updateEmployee);
router.delete("/:id", protect, checkPermission("Employees", "delete"), deleteEmployee);

module.exports = router;
