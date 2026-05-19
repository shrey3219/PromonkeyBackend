const Employee = require("../models/Employee");
const Role = require("../models/Role");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// POST /api/employees
// Admin creates employee, assigns role, and creates login account — all in one
exports.createEmployee = async (req, res) => {
  try {
    const { employeeId, fullName, email, phone, department, joiningDate, role, password } = req.body;

    if (!fullName || !email || !role || !password) {
      return res.status(400).json({ message: "fullName, email, role, and password are required" });
    }

    // Validate role exists and is active
    const roleDoc = await Role.findOne({ _id: role, isActive: true });
    if (!roleDoc) {
      return res.status(400).json({ message: "Invalid or inactive role" });
    }

    // Check email not already taken
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    // Create login account
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: fullName,
      email,
      password: hashedPassword,
      role: "employee",
    });

    // Create employee record linked to the user account
    const employee = await Employee.create({
      employeeId,
      fullName,
      email,
      phone,
      department,
      joiningDate,
      role,
      user: user._id,
    });

    const populated = await employee.populate("role", "name permissions parentRole");

    res.status(201).json({
      employee: populated,
      loginEmail: email,
    });
  } catch (error) {
    // Rollback user if employee creation fails
    if (error.code === 11000) {
      return res.status(400).json({ message: "Employee with this email already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET /api/employees
exports.getEmployees = async (_req, res) => {
  try {
    const employees = await Employee.find()
      .populate("role", "name permissions parentRole")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/employees/:id
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate("role", "name permissions parentRole")
      .populate("user", "name email");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    if (req.body.role) {
      const roleDoc = await Role.findOne({ _id: req.body.role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({ message: "Invalid or inactive role" });
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("role", "name permissions parentRole");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Also delete the linked user account
    if (employee.user) {
      await User.findByIdAndDelete(employee.user);
    }

    res.json({ message: "Employee and login account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
