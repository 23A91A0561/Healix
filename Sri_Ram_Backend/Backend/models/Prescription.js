const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    medicines: String,

    dosage: String,

    notes: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
