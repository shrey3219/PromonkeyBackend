const Permission = require("../models/Permission");
const { VALID_MODULES } = require("../models/Permission");
const Role = require("../models/Role");
const { getPaginationOptions, paginatedResponse } = require("../utils/paginate");

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

function parseModules(input) {
  const raw = Array.isArray(input) ? input : [input];
  const modules = [...new Set(raw.map((m) => String(m).trim()))];

  const invalid = modules.filter((m) => !VALID_MODULES.includes(m));
  if (invalid.length) {
    return {
      error: `Invalid module(s): ${invalid.join(", ")}. Must be one of: ${VALID_MODULES.join(", ")}`,
    };
  }
  if (modules.length === 0) {
    return { error: "At least one module is required." };
  }
  return { modules };
}

// GET /api/permissions/valid-modules  — helper for frontend dropdowns
exports.getValidModules = (_req, res) => {
  res.json({ modules: VALID_MODULES });
};

// GET /api/permissions
exports.getPermissions = async (req, res) => {
  try {
    const { page, limit } = getPaginationOptions(req.query);

    const result = await Permission.paginate(
      {},
      { page, limit, sort: { name: 1 } }
    );

    res.json(paginatedResponse(result));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/permissions/grouped  — grouped by each module
exports.getPermissionsGrouped = async (_req, res) => {
  try {
    const permissions = await Permission.find({ isActive: true }).sort({ name: 1 });

    const grouped = {};

    // Seed all valid modules so every module appears in response
    VALID_MODULES.forEach((m) => {
      grouped[m] = [];
    });

    permissions.forEach((p) => {
      p.modules.forEach((mod) => {
        if (!grouped[mod]) grouped[mod] = [];
        grouped[mod].push({
          _id: p._id,
          name: p.name,
          modules: p.modules,
          actions: p.actions,
        });
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

// POST /api/permissions
exports.createPermission = async (req, res) => {
  try {
    const { name, modules, actions } = req.body;

    if (!modules || !actions) {
      return res.status(400).json({ message: "modules and actions are required" });
    }

    const { modules: parsedModules, error: modError } = parseModules(modules);
    if (modError) return res.status(400).json({ message: modError });

    const { actions: parsedActions, error: actError } = parseActions(actions);
    if (actError) return res.status(400).json({ message: actError });

    if (name) {
      const existing = await Permission.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({ message: "Permission with this name already exists" });
      }
    }

    const permission = await Permission.create({
      ...(name && { name: name.trim() }),
      modules: parsedModules,
      actions: parsedActions,
    });

    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/permissions/:id
exports.updatePermission = async (req, res) => {
  try {
    const { name, modules, actions } = req.body;

    if (!name && modules === undefined && actions === undefined) {
      return res
        .status(400)
        .json({ message: "Provide at least one field to update: name, modules, or actions" });
    }

    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    const newName = name ? name.trim() : permission.name;

    let newModules = permission.modules;
    if (modules !== undefined) {
      const { modules: parsedModules, error: modError } = parseModules(modules);
      if (modError) return res.status(400).json({ message: modError });
      newModules = parsedModules;
    }

    let newActions = permission.actions;
    if (actions !== undefined) {
      const { actions: parsedActions, error: actError } = parseActions(actions);
      if (actError) return res.status(400).json({ message: actError });
      newActions = parsedActions;
    }

    if (name) {
      const nameTaken = await Permission.findOne({
        name: newName,
        _id: { $ne: req.params.id },
      });
      if (nameTaken) {
        return res.status(400).json({ message: "Permission with this name already exists" });
      }
    }

    permission.name = newName;
    permission.modules = newModules;
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

    const rolesUsingPermission = await Role.find({
      permissions: req.params.id,
    }).select("name");

    if (rolesUsingPermission.length > 0) {
      return res.status(400).json({
        message: `Cannot delete. This permission is assigned to ${rolesUsingPermission.length} role(s): ${rolesUsingPermission
          .map((r) => r.name)
          .join(", ")}`,
      });
    }

    await Permission.findByIdAndDelete(req.params.id);

    res.json({ message: "Permission deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
