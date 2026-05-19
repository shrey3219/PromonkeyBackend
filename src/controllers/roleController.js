const Role = require("../models/Role");
const { RESOURCES, ACTIONS } = require("../models/Role");

// Validates that the permissions object only contains known resources and actions
const validatePermissions = (permissions) => {
  for (const resource of Object.keys(permissions)) {
    if (!RESOURCES.includes(resource)) {
      return `Unknown resource: "${resource}"`;
    }
    for (const action of Object.keys(permissions[resource])) {
      if (!ACTIONS.includes(action)) {
        return `Unknown action: "${action}" on resource "${resource}"`;
      }
      if (typeof permissions[resource][action] !== "boolean") {
        return `Permission "${resource}.${action}" must be true or false`;
      }
    }
  }
  return null;
};

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
      if (!parent) {
        return res.status(400).json({ message: "Parent role not found" });
      }
    }

    if (permissions) {
      const error = validatePermissions(permissions);
      if (error) return res.status(400).json({ message: error });
    }

    const role = await Role.create({
      name: name.trim(),
      parentRole: parentRole || null,
      ...(permissions && { permissions }),
    });

    const populated = await role.populate("parentRole", "name");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/roles
exports.getRoles = async (_req, res) => {
  try {
    const roles = await Role.find({ isActive: true })
      .populate("parentRole", "name")
      .sort({ name: 1 });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/roles/hierarchy
exports.getRoleHierarchy = async (_req, res) => {
  try {
    const roles = await Role.find({ isActive: true }).lean();

    const map = {};
    roles.forEach((r) => {
      map[r._id] = { ...r, children: [] };
    });

    const tree = [];
    roles.forEach((r) => {
      if (r.parentRole) {
        const parent = map[r.parentRole];
        if (parent) parent.children.push(map[r._id]);
      } else {
        tree.push(map[r._id]);
      }
    });

    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/roles/permissions-schema — returns the table structure for the frontend
exports.getPermissionsSchema = async (_req, res) => {
  res.json({ resources: RESOURCES, actions: ACTIONS });
};

// GET /api/roles/:id
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate("parentRole", "name");
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

    if (permissions) {
      const error = validatePermissions(permissions);
      if (error) return res.status(400).json({ message: error });
    }

    const role = await Role.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name: name.trim() }),
        ...(parentRole !== undefined && { parentRole: parentRole || null }),
        ...(permissions && { permissions }),
      },
      { new: true, runValidators: true }
    ).populate("parentRole", "name");

    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/roles/:id — soft delete
exports.deleteRole = async (req, res) => {
  try {
    const children = await Role.find({ parentRole: req.params.id, isActive: true });
    if (children.length > 0) {
      return res.status(400).json({
        message: `Cannot deactivate role. ${children.length} child role(s) depend on it: ${children.map((c) => c.name).join(", ")}`,
      });
    }

    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json({ message: "Role deactivated successfully", role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
