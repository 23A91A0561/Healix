const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",
    },

    patientName: {
      type: String,
    },

    doctorName: {
      type: String,
    },

    date: {
      type: String,
    },

    time: {
      type: String,
    },

    status: {
      type: String,

      enum: ["pending", "approved", "live", "completed", "cancelled"],

      default: "pending",
    },

    consultationRoom: {
      type: String,
    },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Appointment", appointmentSchema);
