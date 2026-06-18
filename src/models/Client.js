const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const clientSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
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

clientSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Client", clientSchema);
