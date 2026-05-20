const mongoose = require("mongoose");

const ACTIONS = ["create", "read", "update", "delete"];

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    module: {
      type: String,
      required: true,
      trim: true,
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

module.exports = mongoose.model("Permission", permissionSchema);
