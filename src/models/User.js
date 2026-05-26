const mongoose = require("mongoose");


const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,  // allows multiple docs without phone (null/undefined)
    },
    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "employee", "client"],
      default: "employee",
    },
    profileImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" }, 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
