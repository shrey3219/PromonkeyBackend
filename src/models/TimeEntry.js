const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const timeEntrySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task is required"],
    },
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
    // Employee who logged the time
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    hoursLogged: {
      type: Number,
      required: [true, "Hours logged is required"],
      min: [0.1, "Minimum 0.1 hours required"],
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

timeEntrySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("TimeEntry", timeEntrySchema);
