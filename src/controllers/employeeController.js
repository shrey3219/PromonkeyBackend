const Employee = require("../models/Employee");
const Role = require("../models/Role");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { sendEmployeeWelcomeEmail } = require("../utils/sendEmail");
const { cloudinary } = require("../config/cloudinary");

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

    // If image was uploaded via multer-cloudinary, req.file will have the URL
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

      // Also delete uploaded image from Cloudinary if any
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
        populate: { path: "permissions", select: "name module actions" },
      },
    ]);

    // Send welcome email with plain-text password (non-blocking)
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
exports.getEmployees = async (_req, res) => {
  try {
    const employees = await Employee.find()
      .populate("user", "name email phone profileImage")
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
      .populate("user", "name email phone profileImage")
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

    // Build employee update object
    const updateFields = {};
    if (employeeId !== undefined) updateFields.employeeId = employeeId;
    if (department !== undefined) updateFields.department = department;
    if (joiningDate !== undefined) updateFields.joiningDate = joiningDate;
    if (role !== undefined) updateFields.role = role;
    if (status !== undefined) updateFields.status = status;

    // If a new image was uploaded, update profileImage on the linked User
    if (req.file) {
      // Find current employee to get linked user's old image publicId
      const existing = await Employee.findById(req.params.id).populate("user", "profileImage");
      if (existing && existing.user) {
        // Delete old image from Cloudinary if it exists
        if (existing.user.profileImage && existing.user.profileImage.publicId) {
          await cloudinary.uploader.destroy(existing.user.profileImage.publicId).catch(() => {});
        }
        // Update User's profileImage
        await User.findByIdAndUpdate(existing.user._id, {
          $set: {
            "profileImage.url": req.file.path,
            "profileImage.publicId": req.file.filename,
          },
        });
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate("user", "name email phone profileImage")
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

// DELETE /api/employees/:id — deletes employee + linked user account + Cloudinary image
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.user) {
      const user = await User.findByIdAndDelete(employee.user);
      // Delete profile image from Cloudinary if exists
      if (user && user.profileImage && user.profileImage.publicId) {
        await cloudinary.uploader.destroy(user.profileImage.publicId).catch(() => {});
      }
    }

    res.json({ message: "Employee and login account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
