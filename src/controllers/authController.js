const User = require("../models/User");
const Employee = require("../models/Employee");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { cloudinary } = require("../config/cloudinary");
 
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
 
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
 
    // Only one admin allowed
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists) {
      return res.status(400).json({ message: "Admin already registered. Use login instead." });
    }
 
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
 
    const hashedPassword = await bcrypt.hash(password, 10);
 
    const profileImage = req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : { url: "", publicId: "" };
 
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      profileImage,
    });
 
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
 
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
 
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
 
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Use the employee login endpoint." });
    }
 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
 
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
 
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
exports.employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
 
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
 
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
 
    if (user.role !== "employee") {
      return res.status(403).json({ message: "Access denied. Use the admin login endpoint." });
    }
 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
 
    const emp = await Employee.findOne({ user: user._id })
      .populate({
        path: "role",
        select: "name permissions parentRole isActive",
        populate: { path: "permissions", select: "name modules actions isActive" },
      })
      .select("-__v");
 
    if (!emp) {
      return res.status(403).json({ message: "No employee record found for this account" });
    }
 
    if (!emp.role || !emp.role.isActive) {
      return res.status(403).json({ message: "Your role has been deactivated. Contact admin." });
    }
 
    if (emp.status === "Inactive") {
      return res.status(403).json({ message: "Your account is inactive. Contact admin." });
    }
 
    const moduleMap = {};
      (emp.role.permissions || []).forEach((p) => {
        if (p.isActive) {
          (p.modules || []).forEach((mod) => {
            if (!moduleMap[mod]) moduleMap[mod] = [];
            // avoid duplicate actions
            p.actions.forEach((a) => {
              if (!moduleMap[mod].includes(a)) moduleMap[mod].push(a);
            });
          });
        }
      });
 
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
 
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
      },
      employee: {
        _id: emp._id,
        employeeId: emp.employeeId,
        department: emp.department,
        joiningDate: emp.joiningDate,
        status: emp.status,
        role: {
          _id: emp.role._id,
          name: emp.role.name,
        },
        modules: moduleMap,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const { name, phone } = req.body;
 
    // ── Step 1: Update User model (common fields) ──
    const userUpdateFields = {};
    if (name !== undefined) userUpdateFields.name = name;
    if (phone !== undefined) {
      // Check phone uniqueness against other users
      const phoneTaken = await User.findOne({ phone, _id: { $ne: userId } });
      if (phoneTaken) {
        return res.status(400).json({ message: "Phone number already in use" });
      }
      userUpdateFields.phone = phone;
    }
 
    if (req.file) {
      const existingUser = await User.findById(userId).select("profileImage");
      if (existingUser?.profileImage?.publicId) {
        await cloudinary.uploader.destroy(existingUser.profileImage.publicId).catch(() => {});
      }
      userUpdateFields["profileImage.url"] = req.file.path;
      userUpdateFields["profileImage.publicId"] = req.file.filename;
    }
 
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: userUpdateFields },
      { new: true, runValidators: true }
    ).select("-password");
 
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
 
    // ── Step 2: Role-specific model updates ──
 
    // EMPLOYEE: update Employee model fields
    if (role === "employee") {
      const { department } = req.body;
      const empUpdateFields = {};
      if (department !== undefined) empUpdateFields.department = department;
 
      let updatedEmployee = null;
      if (Object.keys(empUpdateFields).length > 0) {
        updatedEmployee = await Employee.findOneAndUpdate(
          { user: userId },
          { $set: empUpdateFields },
          { new: true }
        )
          .populate("user", "name email phone profileImage")
          .populate({ path: "role", select: "name" });
      } else {
        updatedEmployee = await Employee.findOne({ user: userId })
          .populate("user", "name email phone profileImage")
          .populate({ path: "role", select: "name" });
      }
 
      return res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        profileImage: updatedUser.profileImage,
        employee: updatedEmployee
          ? {
              _id: updatedEmployee._id,
              employeeId: updatedEmployee.employeeId,
              department: updatedEmployee.department,
              joiningDate: updatedEmployee.joiningDate,
              status: updatedEmployee.status,
              role: updatedEmployee.role,
            }
          : null,
      });
    }
 
    // CLIENT: update Client model fields
    if (role === "client") {
      const Client = require("../models/Client");
      const { companyName, address, notes } = req.body;
 
      const clientUpdateFields = {};
      if (name !== undefined) clientUpdateFields.clientName = name;
      if (phone !== undefined) clientUpdateFields.phone = phone;
      if (companyName !== undefined) clientUpdateFields.companyName = companyName;
      if (address !== undefined) clientUpdateFields.address = address;
      if (notes !== undefined) clientUpdateFields.notes = notes;
      if (req.file) {
        clientUpdateFields["profileImage.url"] = req.file.path;
        clientUpdateFields["profileImage.publicId"] = req.file.filename;
      }
 
      const updatedClient = await Client.findOneAndUpdate(
        { user: userId },
        { $set: clientUpdateFields },
        { new: true }
      );
 
      return res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        profileImage: updatedUser.profileImage,
        client: updatedClient
          ? {
              _id: updatedClient._id,
              clientName: updatedClient.clientName,
              companyName: updatedClient.companyName,
              phone: updatedClient.phone,
              address: updatedClient.address,
              notes: updatedClient.notes,
              profileImage: updatedClient.profileImage,
            }
          : null,
      });
    }
 
    // ADMIN: only User model fields (name, phone, profileImage)
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Phone number already in use" });
    }
    res.status(500).json({ message: error.message });
  }
};
 
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
 
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "currentPassword, newPassword, and confirmPassword are required" });
    }
 
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "newPassword and confirmPassword do not match" });
    }
 
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }
 
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from the current password" });
    }
 
    // findOne use karo taaki password field zaroor aaye (model mein select:false nahi hai)
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(500).json({ message: "Password data unavailable. Contact support." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
 
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { $set: { password: hashedPassword } });
 
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
exports.unifiedLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
 
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
 
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
 
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
 
    const baseUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
    };
 
    // ── Admin ──
    if (user.role === "admin") {
      return res.json({ token, user: baseUser });
    }
 
    // ── Employee ──
    if (user.role === "employee") {
      const emp = await Employee.findOne({ user: user._id })
        .populate({
          path: "role",
          select: "name permissions parentRole isActive",
          populate: { path: "permissions", select: "name modules actions isActive" },
        });
 
      if (!emp) {
        return res.status(403).json({ message: "No employee record found for this account" });
      }
      if (!emp.role || !emp.role.isActive) {
        return res.status(403).json({ message: "Your role has been deactivated. Contact admin." });
      }
      if (emp.status === "Inactive") {
        return res.status(403).json({ message: "Your account is inactive. Contact admin." });
      }
 
      const moduleMap = {};
      (emp.role.permissions || []).forEach((p) => {
        if (p.isActive) {
          (p.modules || []).forEach((mod) => {
            if (!moduleMap[mod]) moduleMap[mod] = [];
            p.actions.forEach((a) => {
              if (!moduleMap[mod].includes(a)) moduleMap[mod].push(a);
            });
          });
        }
      });
 
      return res.json({
        token,
        user: baseUser,
        employee: {
          _id: emp._id,
          employeeId: emp.employeeId,
          department: emp.department,
          joiningDate: emp.joiningDate,
          status: emp.status,
          role: { _id: emp.role._id, name: emp.role.name },
          modules: moduleMap,
        },
      });
    }
 
    // ── Client ──
    if (user.role === "client") {
      const Client = require("../models/Client");
      const client = await Client.findOne({ user: user._id })
        .populate("createdBy", "name email");
 
      if (!client) {
        return res.status(403).json({ message: "No client record found for this account" });
      }
 
      return res.json({
        token,
        user: baseUser,
        client: {
          _id: client._id,
          clientName: client.clientName,
          companyName: client.companyName,
          phone: client.phone,
          address: client.address,
          profileImage: client.profileImage,
        },
      });
    }
 
    res.status(400).json({ message: "Unknown role" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const baseUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    };

    // ── Employee ──
    if (user.role === "employee") {
      const emp = await Employee.findOne({ user: userId })
        .populate({
          path: "role",
          select: "name permissions parentRole isActive",
          populate: { path: "permissions", select: "name modules actions isActive" },
        });

      if (!emp) {
        return res.status(403).json({ message: "No employee record found for this account" });
      }

      const moduleMap = {};
      (emp.role?.permissions || []).forEach((p) => {
        if (p.isActive) {
          (p.modules || []).forEach((mod) => {
            if (!moduleMap[mod]) moduleMap[mod] = [];
            p.actions.forEach((a) => {
              if (!moduleMap[mod].includes(a)) moduleMap[mod].push(a);
            });
          });
        }
      });

      return res.json({
        user: baseUser,
        employee: {
          _id: emp._id,
          employeeId: emp.employeeId,
          department: emp.department,
          joiningDate: emp.joiningDate,
          status: emp.status,
          role: emp.role
            ? { _id: emp.role._id, name: emp.role.name }
            : null,
          modules: moduleMap,
        },
      });
    }

    // ── Client ──
    if (user.role === "client") {
      const Client = require("../models/Client");
      const client = await Client.findOne({ user: userId });

      if (!client) {
        return res.status(403).json({ message: "No client record found for this account" });
      }

      return res.json({
        user: baseUser,
        client: {
          _id: client._id,
          clientName: client.clientName,
          companyName: client.companyName,
          phone: client.phone,
          address: client.address,
          notes: client.notes,
          profileImage: client.profileImage,
        },
      });
    }

    // ── Admin ──
    res.json({ user: baseUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.clientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
 
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
 
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
 
    if (user.role !== "client") {
      return res.status(403).json({ message: "Access denied. Use the appropriate login endpoint." });
    }
 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
 
    const Client = require("../models/Client");
    const client = await Client.findOne({ user: user._id })
      .populate("createdBy", "name email");
 
    if (!client) {
      return res.status(403).json({ message: "No client record found for this account" });
    }
 
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
 
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
      client: {
        _id: client._id,
        clientName: client.clientName,
        companyName: client.companyName,
        phone: client.phone,
        address: client.address,
        profileImage: client.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};