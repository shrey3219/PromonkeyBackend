const mongoose = require("mongoose");

const phaseSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
    },
    name: {
      type: String,
      required: [true, "Phase name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    estimatedDuration: {
      type: Number, // in hours
      default: 0,
    },
    actualStart: {
      type: Date,
    },
    actualEnd: {
      type: Date,
    },
    estimatedEndDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "on_hold"],
      default: "not_started",
    },
    // Employees assigned to this phase
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Phase", phaseSchema);
