const Permission = require("../models/Permission");
const Role = require("../models/Role");

const VALID_ACTIONS = ["create", "read", "update", "delete"];

function parseActions(input) {
  const raw = Array.isArray(input) ? input : [input];
  const actions = [...new Set(raw.map((a) => String(a).toLowerCase()))];

  const invalid = actions.filter((a) => !VALID_ACTIONS.includes(a));
  if (invalid.length) {
    return {
      error: `Invalid action(s): ${invalid.join(", ")}. Must be one of: ${VALID_ACTIONS.join(", ")}`,
    };
  }
  if (actions.length === 0) {
    return { error: "At least one action is required." };
  }
  return { actions };
}

// GET /api/permissions 
exports.getPermissions = async (_req, res) => {
  try {
    const permissions = await Permission.find().sort({ module: 1 });
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/permissions/grouped 
exports.getPermissionsGrouped = async (_req, res) => {
  try {
    const permissions = await Permission.find().sort({ module: 1 });

    const grouped = {};
    permissions.forEach((p) => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push({
        _id: p._id,
        name: p.name,
        actions: p.actions,
      });
    });

    const result = Object.entries(grouped).map(([module, perms]) => ({
      module,
      permissions: perms,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/permissions — admin creates a permission
exports.createPermission = async (req, res) => {
  try {
    const { name, module, actions } = req.body;

    if (!module || !actions) {
      return res.status(400).json({ message: "module and actions are required" });
    }

    const { actions: parsedActions, error } = parseActions(actions);
    if (error) return res.status(400).json({ message: error });

    if (name) {
      const existing = await Permission.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({ message: "Permission with this name already exists" });
      }
    }

    const permission = await Permission.create({
      ...(name && { name: name.trim() }),
      module: module.trim(),
      actions: parsedActions,
    });

    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/permissions/:id — update name, module, and/or actions
exports.updatePermission = async (req, res) => {
  try {
    const { name, module, actions } = req.body;

    if (!module && actions === undefined) {
      return res.status(400).json({ message: "Provide at least one field to update: name, module, or actions" });
    }

    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    const newName   = name   ? name.trim()   : permission.name;
    const newModule = module ? module.trim()  : permission.module;

    let newActions = permission.actions;
    if (actions !== undefined) {
      const { actions: parsedActions, error } = parseActions(actions);
      if (error) return res.status(400).json({ message: error });
      newActions = parsedActions;
    }

    // Name uniqueness
    if (name) {
      const nameTaken = await Permission.findOne({ name: newName, _id: { $ne: req.params.id } });
      if (nameTaken) {
        return res.status(400).json({ message: "Permission with this name already exists" });
      }
    }

    permission.name    = newName;
    permission.module  = newModule;
    permission.actions = newActions;
    await permission.save();

    res.json(permission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/permissions/:id
exports.deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    // Block deletion if any role is using this permission
    const rolesUsingPermission = await Role.find({
      permissions: req.params.id,
    }).select("name");

    if (rolesUsingPermission.length > 0) {
      return res.status(400).json({
        message: `Cannot delete. This permission is assigned to ${rolesUsingPermission.length} role(s): ${rolesUsingPermission.map((r) => r.name).join(", ")}`,
      });
    }

    await Permission.findByIdAndDelete(req.params.id);

    res.json({ message: "Permission deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
