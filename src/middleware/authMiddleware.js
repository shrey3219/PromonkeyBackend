const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");

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
      return res.status(401).json({ success: false, message: "Not authorized, token missing" });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Admin-only routes
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required: ${allowedRoles.join(" or ")}`,
      });
    }
    next();
  };
};

const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      if (req.user.role === "admin") return next();
      if (req.user.role === "client") return next();

      const employee = await Employee.findOne({ user: req.user._id }).populate({
        path: "role",
        populate: { path: "permissions", select: "permissions isActive" },
      });

      if (!employee || !employee.role) {
        return res.status(403).json({ success: false, message: "No role assigned to this user" });
      }

      if (!employee.role.isActive) {
        return res.status(403).json({ success: false, message: "Your role has been deactivated" });
      }

      const hasPermission = employee.role.permissions.some(
        (p) =>
          p.isActive &&
          Array.isArray(p.permissions) &&
          p.permissions.some(
            (entry) =>
              entry.module === module &&
              Array.isArray(entry.actions) &&
              entry.actions.includes(action.toLowerCase())
          )
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You do not have "${action}" permission on "${module}"`,
        });
      }

      req.employeeRole = employee.role;
      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

const blockClient = (req, res, next) => {
  if (req.user && req.user.role === "client") {
    return res.status(403).json({ success: false, message: "Access denied for client role" });
  }
  next();
};

module.exports = { protect, authorize, checkPermission, blockClient };
