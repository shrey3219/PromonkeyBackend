const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const ACTIONS = ["create", "read", "update", "delete"];

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

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // Array of modules this permission applies to
    modules: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((m) => VALID_MODULES.includes(m)),
        message: `Each module must be one of: ${VALID_MODULES.join(", ")}`,
      },
    },

    actions: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((a) => ACTIONS.includes(a)),
        message: `Each action must be one of: ${ACTIONS.join(", ")}`,
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
