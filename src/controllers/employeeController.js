const Employee = require("../models/Employee");
const Role = require("../models/Role");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { sendEmployeeWelcomeEmail, sendEmployeeEmailUpdateEmail, sendEmployeePasswordUpdateEmail } = require("../utils/sendEmail");
const { cloudinary } = require("../config/cloudinary");
const { getPaginationOptions, paginatedResponse } = require("../utils/paginate");

exports.createEmployee = async (req, res) => {
  try {
    const { name, email, phone, password, employeeId, department, joiningDate, role } = req.body;

    if (!name || !email || !password || !role || !phone || !employeeId || !department || !joiningDate) {
      return res.status(400).json({ message: "name, email, phone, password, employeeId, department, joiningDate, and role are required" });
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

    // Check phone not already taken
    const phoneTaken = await User.findOne({ phone });
    if (phoneTaken) {
      return res.status(400).json({ message: "An account with this phone number already exists" });
    }

    // Check employeeId not already taken
    const empIdTaken = await Employee.findOne({ employeeId });
    if (empIdTaken) {
      return res.status(400).json({ message: "Employee ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

  
    const profileImage = req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : { url: "", publicId: "" };

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "employee",
      profileImage,
    });

    // Create Employee
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
      await User.findByIdAndDelete(user._id);

      if (req.file && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      }

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
      { path: "user", select: "name email phone profileImage" },
      {
        path: "role",
        select: "name parentRole permissions",
        populate: { path: "permissions", select: "name modules actions" },
      },
    ]);

   
    sendEmployeeWelcomeEmail(email, name, password).catch((err) => {
      console.error("Failed to send welcome email:", err.message);
    });

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
exports.getEmployees = async (req, res) => {
  try {
    const { page, limit } = getPaginationOptions(req.query);

    const result = await Employee.paginate(
      {},
      {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: [
          { path: "user", select: "name email phone profileImage" },
          {
            path: "role",
            select: "name parentRole permissions",
            populate: { path: "permissions", select: "name modules actions" },
          },
        ],
      }
    );

    res.json(paginatedResponse(result));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/employees/:id
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate("user", "name email phone profileImage")
      .populate({
        path: "role",
        select: "name parentRole permissions",
        populate: { path: "permissions", select: "name modules actions" },
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
    const body = req.body || {};

    const name        = body.name        !== undefined ? String(body.name).trim()        : undefined;
    const email       = body.email       !== undefined ? String(body.email).trim()       : undefined;
    const phone       = body.phone       !== undefined ? String(body.phone).trim()       : undefined;
    const password    = body.password    !== undefined ? String(body.password).trim()    : undefined;
    const employeeId  = body.employeeId  !== undefined ? String(body.employeeId).trim()  : undefined;
    const department  = body.department  !== undefined ? String(body.department).trim()  : undefined;
    const joiningDate = body.joiningDate !== undefined ? body.joiningDate                : undefined;
    const role        = body.role        !== undefined ? body.role                       : undefined;
    const status      = body.status      !== undefined ? body.status                     : undefined;

    if (!req.file && [name, email, phone, password, employeeId, department, joiningDate, role, status].every(v => v === undefined)) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    if (name       !== undefined && name       === "") return res.status(400).json({ message: "Name cannot be empty" });
    if (email      !== undefined && email      === "") return res.status(400).json({ message: "Email cannot be empty" });
    if (phone      !== undefined && phone      === "") return res.status(400).json({ message: "Phone number cannot be empty" });
    if (employeeId !== undefined && employeeId === "") return res.status(400).json({ message: "Employee ID cannot be empty" });
    if (department !== undefined && department === "") return res.status(400).json({ message: "Department cannot be empty" });
    if (password   !== undefined && password   === "") return res.status(400).json({ message: "Password cannot be empty" });
    if (password   !== undefined && password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const employee = await Employee.findById(req.params.id).populate("user", "_id email phone profileImage");
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (role !== undefined) {
      const roleDoc = await Role.findOne({ _id: role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({ message: "Invalid or inactive role" });
      }
    }

    if (employeeId !== undefined) {
      const empIdTaken = await Employee.findOne({ employeeId, _id: { $ne: req.params.id } });
      if (empIdTaken) {
        return res.status(400).json({ message: "Employee ID already exists" });
      }
    }

    const currentEmail = employee.user?.email || "";
    const normalizedEmail = email !== undefined ? email.toLowerCase() : undefined;
    const emailChanged = normalizedEmail !== undefined && normalizedEmail !== currentEmail;

    if (emailChanged) {
      const emailTaken = await User.findOne({ email: normalizedEmail, _id: { $ne: employee.user._id } });
      if (emailTaken) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
    }

    if (phone !== undefined && phone !== employee.user?.phone) {
      const phoneTaken = await User.findOne({ phone, _id: { $ne: employee.user._id } });
      if (phoneTaken) {
        return res.status(400).json({ message: "An account with this phone number already exists" });
      }
    }

    if (req.file) {
      if (employee.user?.profileImage?.publicId) {
        await cloudinary.uploader.destroy(employee.user.profileImage.publicId).catch(() => {});
      }
    }

    const employeeSet = {};
    if (employeeId  !== undefined) employeeSet.employeeId  = employeeId;
    if (department  !== undefined) employeeSet.department  = department;
    if (joiningDate !== undefined) employeeSet.joiningDate = joiningDate;
    if (role        !== undefined) employeeSet.role        = role;
    if (status      !== undefined) employeeSet.status      = status;

    if (Object.keys(employeeSet).length > 0) {
      await Employee.collection.updateOne({ _id: employee._id }, { $set: employeeSet });
    }

    const userSet = {};
    if (name           !== undefined) userSet.name  = name;
    if (normalizedEmail !== undefined) userSet.email = normalizedEmail;
    if (phone          !== undefined) userSet.phone  = phone;
    if (req.file) {
      userSet["profileImage.url"]      = req.file.path;
      userSet["profileImage.publicId"] = req.file.filename;
    }
    if (password !== undefined) {
      userSet.password = await bcrypt.hash(password, 10);
    }

    if (employee.user?._id && Object.keys(userSet).length > 0) {
      await User.collection.updateOne({ _id: employee.user._id }, { $set: userSet });
    }

    const updatedEmployee = await Employee.findById(employee._id)
      .populate("user", "name email phone profileImage")
      .populate({
        path: "role",
        select: "name parentRole permissions",
        populate: { path: "permissions", select: "name modules actions" },
      });

    if (!updatedEmployee) {
      return res.status(500).json({ message: "Failed to fetch updated employee" });
    }

    // Send email notifications
    if (emailChanged && normalizedEmail) {
      sendEmployeeEmailUpdateEmail(normalizedEmail, updatedEmployee.user?.name || name || "").catch((err) => {
        console.error("Employee email update notification failed:", err.message);
      });
    }

    if (password !== undefined) {
      const notifyEmail = normalizedEmail || currentEmail;
      if (notifyEmail) {
        sendEmployeePasswordUpdateEmail(notifyEmail, updatedEmployee.user?.name || name || "", password).catch((err) => {
          console.error("Employee password update notification failed:", err.message);
        });
      }
    }

    res.json(updatedEmployee);
  } catch (error) {
    console.error("updateEmployee error:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/employees/:id 
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const Task = require("../models/Task");
    const Phase = require("../models/Phase");
    const TimeEntry = require("../models/TimeEntry");
    const Project = require("../models/Project");

    const [taskCount, phaseCount, timeEntryCount, projectCount] = await Promise.all([
      Task.countDocuments({ assignedTo: employee._id }),
      Phase.countDocuments({ assignees: employee._id }),
      TimeEntry.countDocuments({ employee: employee._id }),
      Project.countDocuments({ assignedEmployees: employee._id }),
    ]);

    if (taskCount > 0 || phaseCount > 0 || timeEntryCount > 0 || projectCount > 0) {
      const details = [];
      if (projectCount > 0)   details.push(`${projectCount} project(s)`);
      if (taskCount > 0)      details.push(`${taskCount} task(s)`);
      if (phaseCount > 0)     details.push(`${phaseCount} phase(s)`);
      if (timeEntryCount > 0) details.push(`${timeEntryCount} time entry(s)`);
      return res.status(400).json({
        message: `Cannot delete employee. They are assigned to ${details.join(", ")}. Please reassign or remove those first.`,
      });
    }

    await Employee.findByIdAndDelete(employee._id);

    if (employee.user) {
      const user = await User.findByIdAndDelete(employee.user);
      if (user && user.profileImage && user.profileImage.publicId) {
        await cloudinary.uploader.destroy(user.profileImage.publicId).catch(() => {});
      }
    }

    res.json({ message: "Employee and login account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
