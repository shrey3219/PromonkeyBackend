const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const VALID_ACTIONS = ["create", "read", "update", "delete"];

const VALID_MODULES = [
  "Projects",
  "Tasks",
  "Clients",
  "Employees",
  "Phases",
  "Comments",
  "TimeEntries",
  "Roles",
  "Permissions",
  "Dashboard",
];

const modulePermissionSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      enum: {
        values: VALID_MODULES,
        message: `module must be one of: ${VALID_MODULES.join(", ")}`,
      },
    },
    actions: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((a) => VALID_ACTIONS.includes(a)),
        message: `Each action must be one of: ${VALID_ACTIONS.join(", ")}`,
      },
    },
  },
  { _id: false }
);

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    
    permissions: {
      type: [modulePermissionSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one module-permission entry is required",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

permissionSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Permission", permissionSchema);
module.exports.VALID_MODULES = VALID_MODULES;
module.exports.VALID_ACTIONS = VALID_ACTIONS;
