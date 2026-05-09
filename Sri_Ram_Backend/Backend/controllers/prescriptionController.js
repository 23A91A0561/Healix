const Prescription = require("../models/Prescription");

const Appointment = require("../models/Appointment");

const createPrescription = async (req, res) => {
  try {
    const { appointmentId, medicines, dosage, notes } = req.body;

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can create prescriptions",
      });
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can only create prescriptions for your own appointments",
      });
    }

    if (appointment.status !== "completed") {
      return res.status(400).json({
        message: "Prescription can be created only for completed appointments",
      });
    }

    const existingPrescription = await Prescription.findOne({
      appointment: appointmentId,
    });

    if (existingPrescription) {
      return res.status(400).json({
        message: "Prescription already exists for this appointment",
      });
    }

    const prescription = await Prescription.create({
      appointment: appointmentId,

      doctor: appointment.doctor,

      patient: appointment.patient,

      medicines,

      dosage,

      notes,
    });

    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({
      patient: req.user.id,
    })

      .populate("doctor", "name email")

      .populate("patient", "name email age");

    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createPrescription,
  getPatientPrescriptions,
};
