const Permission = require("../models/Permission");

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

// GET /api/permissions — flat list of all active permissions
exports.getPermissions = async (_req, res) => {
  try {
    const permissions = await Permission.find({ isActive: true }).sort({ module: 1 });
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/permissions/grouped — permissions grouped by module
exports.getPermissionsGrouped = async (_req, res) => {
  try {
    const permissions = await Permission.find({ isActive: true }).sort({ module: 1 });

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

    if (!name || !module || !actions) {
      return res.status(400).json({ message: "name, module, and actions are required" });
    }

    const { actions: parsedActions, error } = parseActions(actions);
    if (error) return res.status(400).json({ message: error });

    const existing = await Permission.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Permission with this name already exists" });
    }

    const permission = await Permission.create({
      name: name.trim(),
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

    if (!name && !module && actions === undefined) {
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

    // Name uniqueness (excluding self)
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
    const permission = await Permission.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    res.json({ message: "Permission deactivated", permission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
