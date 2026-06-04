const mongoose = require("mongoose");

const requirementDocSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    fileType: {
      type: String, // pdf, docx, png, etc.
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    estimatedEndDate: {
      type: Date,
      required: [true, "Estimated end date is required"],
    },
    actualEndDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "on_hold", "cancelled"],
      default: "not_started",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    requirementDocs: [requirementDocSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
