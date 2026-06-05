const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    phase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Phase",
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
    },
    taggedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

commentSchema.pre("save", function (next) {
  if (!this.task && !this.phase && !this.project) {
    return next(new Error("Either task, phase, or project is required"));
  }
  next();
});

module.exports = mongoose.model("Comment", commentSchema);
