const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");

// Verifies JWT and attaches req.user
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      next();
    } else {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Restricts route to admin only
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
    }
    next();
  };
};

// Checks table-style permission: checkPermission("employee", "delete")
// Admin always passes — employees are checked against their role's permissions table
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      // Admin bypasses all permission checks
      if (req.user.role === "admin") {
        return next();
      }

      const employee = await Employee.findOne({ user: req.user._id }).populate("role");

      if (!employee || !employee.role) {
        return res.status(403).json({
          success: false,
          message: "No role assigned to this user",
        });
      }

      if (!employee.role.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your role has been deactivated",
        });
      }

      const allowed = employee.role.permissions?.[resource]?.[action];

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You do not have "${action}" permission on "${resource}"`,
        });
      }

      req.employeeRole = employee.role;
      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

module.exports = { protect, authorize, checkPermission };
