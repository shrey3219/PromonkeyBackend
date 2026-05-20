const User = require("../models/User");
const Employee = require("../models/Employee");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    let employeeData = null;
    if (user.role === "employee") {
      const emp = await Employee.findOne({ user: user._id })
        .populate({
          path: "role",
          select: "name permissions parentRole",
          populate: { path: "permissions", select: "name module action" },
        })
        .select("-__v");

      if (emp) {
        const moduleMap = {};
        (emp.role?.permissions || []).forEach((p) => {
          if (!moduleMap[p.module]) moduleMap[p.module] = [];
          moduleMap[p.module].push({ action: p.action });
        });

        employeeData = {
          _id: emp._id,
          employeeId: emp.employeeId,
          department: emp.department,
          role: {
            _id: emp.role._id,
            name: emp.role.name,
          },
          modules: moduleMap,
        };
      }
    }

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...(employeeData && { employee: employeeData }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
