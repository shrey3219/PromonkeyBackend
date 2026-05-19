const mongoose = require("mongoose");

// Add new resources here as the app grows — no other file needs to change
const RESOURCES = ["employee", "role"];
const ACTIONS = ["create", "read", "update", "delete"];

// Builds a default permissions object with all actions set to false
// e.g. { employee: { create: false, read: false, update: false, delete: false }, role: { ... } }
const defaultPermissions = () => {
  const perms = {};
  RESOURCES.forEach((resource) => {
    perms[resource] = {};
    ACTIONS.forEach((action) => {
      perms[resource][action] = false;
    });
  });
  return perms;
};

// Dynamically build the nested schema from RESOURCES and ACTIONS
const buildPermissionsSchema = () => {
  const schema = {};
  RESOURCES.forEach((resource) => {
    schema[resource] = {};
    ACTIONS.forEach((action) => {
      schema[resource][action] = { type: Boolean, default: false };
    });
  });
  return schema;
};

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Parent role in the hierarchy — null means top-level (directly under admin)
    parentRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },

    // Table-style permissions
    // { employee: { create: true, read: true, update: false, delete: false }, role: { ... } }
    permissions: {
      type: buildPermissionsSchema(),
      default: defaultPermissions,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", roleSchema);
module.exports.RESOURCES = RESOURCES;
module.exports.ACTIONS = ACTIONS;
