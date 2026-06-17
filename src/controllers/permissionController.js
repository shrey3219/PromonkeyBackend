const Permission = require("../models/Permission");
const { VALID_MODULES, VALID_ACTIONS } = require("../models/Permission");
const Role = require("../models/Role");
const { getPaginationOptions, paginatedResponse } = require("../utils/paginate");


function parsePermissions(input) {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: "permissions must be a non-empty array of { module, actions[] } objects" };
  }

  const seenModules = new Set();
  const parsed = [];

  for (const entry of input) {
    if (!entry.module || !entry.actions) {
      return { error: "Each permission entry must have 'module' and 'actions' fields" };
    }

    const module = String(entry.module).trim();
    if (!VALID_MODULES.includes(module)) {
      return {
        error: `Invalid module "${module}". Must be one of: ${VALID_MODULES.join(", ")}`,
      };
    }

    if (seenModules.has(module)) {
      return { error: `Duplicate module "${module}" in permissions array` };
    }
    seenModules.add(module);

    const rawActions = Array.isArray(entry.actions) ? entry.actions : [entry.actions];
    const actions = [...new Set(rawActions.map((a) => String(a).toLowerCase()))];

    const invalidActions = actions.filter((a) => !VALID_ACTIONS.includes(a));
    if (invalidActions.length) {
      return {
        error: `Invalid action(s) for module "${module}": ${invalidActions.join(", ")}. Must be one of: ${VALID_ACTIONS.join(", ")}`,
      };
    }

    if (actions.length === 0) {
      return { error: `At least one action is required for module "${module}"` };
    }

    parsed.push({ module, actions });
  }

  return { parsed };
}

// GET /api/permissions/valid-modules
exports.getValidModules = (_req, res) => {
  res.json({ modules: VALID_MODULES, actions: VALID_ACTIONS });
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

// GET /api/permissions/grouped  — grouped by module for frontend dropdowns
exports.getPermissionsGrouped = async (_req, res) => {
  try {
    const permissions = await Permission.find({ isActive: true }).sort({ name: 1 });

    const grouped = {};
    VALID_MODULES.forEach((m) => { grouped[m] = []; });

    permissions.forEach((p) => {
      p.permissions.forEach(({ module, actions }) => {
        if (!grouped[module]) grouped[module] = [];
        grouped[module].push({
          _id: p._id,
          name: p.name,
          module,
          actions,
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
    const { name, permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({ message: "permissions array is required" });
    }

    const { parsed, error } = parsePermissions(permissions);
    if (error) return res.status(400).json({ message: error });

    if (name) {
      const existing = await Permission.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({ message: "Permission with this name already exists" });
      }
    }

    const permission = await Permission.create({
      ...(name && { name: name.trim() }),
      permissions: parsed,
    });

    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/permissions/:id
exports.updatePermission = async (req, res) => {
  try {
    const { name, permissions } = req.body;

    if (!name && permissions === undefined) {
      return res
        .status(400)
        .json({ message: "Provide at least one field to update: name or permissions" });
    }

    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    if (name) {
      const nameTaken = await Permission.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id },
      });
      if (nameTaken) {
        return res.status(400).json({ message: "Permission with this name already exists" });
      }
      permission.name = name.trim();
    }

    if (permissions !== undefined) {
      const { parsed, error } = parsePermissions(permissions);
      if (error) return res.status(400).json({ message: error });
      permission.permissions = parsed;
    }

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
