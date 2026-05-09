const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },

    roomId: String,

    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      default: "waiting",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Consultation", consultationSchema);
