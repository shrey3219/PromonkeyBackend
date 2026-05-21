const Employee = require("../models/Employee");
const Role = require("../models/Role");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.createEmployee = async (req, res) => {
  try {
    const { name, email, phone, password, employeeId, department, joiningDate, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password, and role are required" });
    }

    // Validate role
    const roleDoc = await Role.findOne({ _id: role, isActive: true });
    if (!roleDoc) {
      return res.status(400).json({ message: "Invalid or inactive role" });
    }

    // Check email not already taken
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    // Check phone not already taken (if provided)
    if (phone) {
      const phoneTaken = await User.findOne({ phone });
      if (phoneTaken) {
        return res.status(400).json({ message: "An account with this phone number already exists" });
      }
    }

    // Check employeeId not already taken (if provided)
    if (employeeId) {
      const empIdTaken = await Employee.findOne({ employeeId });
      if (empIdTaken) {
        return res.status(400).json({ message: "Employee ID already exists" });
      }
    }

    // Create User — holds name, email, phone, password
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "employee",
    });

    // Create Employee — holds only work-related fields + refs to User and Role
    let employee;
    try {
      employee = await Employee.create({
        employeeId,
        department,
        joiningDate,
        role,
        user: user._id,
      });
    } catch (empError) {
      // Rollback: delete the user we just created so it doesn't become orphaned
      await User.findByIdAndDelete(user._id);

      if (empError.code === 11000) {
        const duplicateField = Object.keys(empError.keyPattern || {})[0];
        if (duplicateField === "employeeId") {
          return res.status(400).json({ message: "Employee ID already exists" });
        }
        if (duplicateField === "user") {
          return res.status(400).json({ message: "A user account with this email already has an employee record" });
        }
        return res.status(400).json({ message: `Duplicate value for field: ${duplicateField}` });
      }
      throw empError;
    }

    const populated = await employee.populate([
      { path: "user", select: "name email phone" },
      {
        path: "role",
        select: "name parentRole permissions",
        populate: { path: "permissions", select: "name module actions" },
      },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      if (duplicateField === "email") {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      return res.status(400).json({ message: "Employee ID already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET /api/employees
exports.getEmployees = async (_req, res) => {
  try {
    const employees = await Employee.find()
      .populate("user", "name email phone")
      .populate({
        path: "role",
        select: "name parentRole permissions",
        populate: { path: "permissions", select: "name module actions" },
      })
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
      .populate("user", "name email phone")
      .populate({
        path: "role",
        select: "name parentRole permissions",
        populate: { path: "permissions", select: "name module actions" },
      });

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
    const { employeeId, department, joiningDate, role, status } = req.body;

    if (role) {
      const roleDoc = await Role.findOne({ _id: role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({ message: "Invalid or inactive role" });
      }
    }

    // Build update object — only include fields that were actually sent
    const updateFields = {};
    if (employeeId !== undefined) updateFields.employeeId = employeeId;
    if (department !== undefined) updateFields.department = department;
    if (joiningDate !== undefined) updateFields.joiningDate = joiningDate;
    if (role !== undefined) updateFields.role = role;
    if (status !== undefined) updateFields.status = status;

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate("user", "name email phone")
      .populate({
        path: "role",
        select: "name parentRole permissions",
        populate: { path: "permissions", select: "name module actions" },
      });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/employees/:id — deletes employee + linked user account
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.user) {
      await User.findByIdAndDelete(employee.user);
    }

    res.json({ message: "Employee and login account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
