const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    profileImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);
