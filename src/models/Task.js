const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    phase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phase",
      required: [true, "Phase is required"],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
    },
    name: {
      type: String,
      required: [true, "Task name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    estimatedHours: {
      type: Number,
      default: 0,
    },
    actualHoursLogged: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "on_hold"],
      default: "not_started",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
