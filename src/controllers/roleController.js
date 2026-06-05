const Role = require("../models/Role");
const Permission = require("../models/Permission");
const Employee = require("../models/Employee");

// POST /api/roles
exports.createRole = async (req, res) => {
  try {
    const { name, parentRole, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    if (name.toLowerCase() === "admin") {
      return res.status(400).json({ message: "Cannot create a role named 'admin'" });
    }

    const existing = await Role.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Role already exists" });
    }

    if (parentRole) {
      const parent = await Role.findById(parentRole);
      if (!parent) return res.status(400).json({ message: "Parent role not found" });
    }
    
    if (permissions !== undefined && permissions.length > 0) {
      const found = await Permission.find({ _id: { $in: permissions } });
      if (found.length !== permissions.length) {
        return res.status(400).json({ message: "One or more permission IDs are invalid" });
      }
    }

    const role = await Role.create({
      name: name.trim(),
      parentRole: parentRole || null,
      permissions: permissions || [],
    });

    const populated = await role.populate([
      { path: "parentRole", select: "name" },
      { path: "permissions", select: "name module actions" },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/roles
exports.getRoles = async (_req, res) => {
  try {
    const roles = await Role.find()
      .populate("parentRole", "name")
      .populate("permissions", "name module actions")
      .sort({ name: 1 });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/roles/hierarchy
exports.getRoleHierarchy = async (_req, res) => {
  try {
    const roles = await Role.find()
      .populate("permissions", "name module actions")
      .lean();

    const map = {};
    roles.forEach((r) => { map[r._id.toString()] = { ...r, children: [] }; });

    const tree = [];
    roles.forEach((r) => {
      if (r.parentRole) {
        const parent = map[r.parentRole.toString()];
        if (parent) parent.children.push(map[r._id.toString()]);
      } else {
        tree.push(map[r._id.toString()]);
      }
    });

    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/roles/:id
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate("parentRole", "name")
      .populate("permissions", "name module actions");
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/roles/:id
exports.updateRole = async (req, res) => {
  try {
    const { name, parentRole, permissions } = req.body;

    if (name && name.toLowerCase() === "admin") {
      return res.status(400).json({ message: "Cannot use 'admin' as a role name" });
    }

    if (parentRole && parentRole === req.params.id) {
      return res.status(400).json({ message: "A role cannot be its own parent" });
    }

    if (parentRole) {
      const parent = await Role.findById(parentRole);
      if (!parent) return res.status(400).json({ message: "Parent role not found" });
    }

    if (permissions !== undefined && permissions.length > 0) {
      const found = await Permission.find({ _id: { $in: permissions } });
      if (found.length !== permissions.length) {
        return res.status(400).json({ message: "One or more permission IDs are invalid" });
      }
    }

    const role = await Role.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name: name.trim() }),
        ...(parentRole !== undefined && { parentRole: parentRole || null }),
        ...(permissions !== undefined && { permissions }),
      },
      { new: true, runValidators: true }
    )
      .populate("parentRole", "name")
      .populate("permissions", "name module actions");

    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/roles/:id 
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    const children = await Role.find({ parentRole: req.params.id });
    if (children.length > 0) {
      return res.status(400).json({
        message: `Cannot delete. ${children.length} child role(s) depend on it: ${children.map((c) => c.name).join(", ")}`,
      });
    }

    const employeesUsingRole = await Employee.find({
      role: req.params.id,
    }).select("employeeId");

    if (employeesUsingRole.length > 0) {
      return res.status(400).json({
        message: `Cannot delete. ${employeesUsingRole.length} employee(s) are assigned this role: ${employeesUsingRole.map((e) => e.employeeId).join(", ")}`,
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};