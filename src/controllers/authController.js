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

    // Optional profile image via Cloudinary
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

    // Only admin can use this endpoint
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

// Employee login — separate endpoint for mobile app
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

    // Only employees can use this endpoint
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
        populate: { path: "permissions", select: "name module actions isActive" },
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
        if (!moduleMap[p.module]) moduleMap[p.module] = [];
        moduleMap[p.module].push(...(p.actions || []));
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

// PUT /api/auth/update-profile — logged-in user (admin or employee) apna profile update kar sakta hai
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, phone } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;

    // Agar naya image upload hua hai
    if (req.file) {
      // Purana image Cloudinary se delete karo
      const existingUser = await User.findById(userId).select("profileImage");
      if (existingUser?.profileImage?.publicId) {
        await cloudinary.uploader.destroy(existingUser.profileImage.publicId).catch(() => {});
      }

      updateFields["profileImage.url"] = req.file.path;
      updateFields["profileImage.publicId"] = req.file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

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

// Client login — for client portal app
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
