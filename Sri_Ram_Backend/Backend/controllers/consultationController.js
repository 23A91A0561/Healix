const Consultation = require("../models/Consultation");

const createConsultation = async (req, res) => {
  try {
    const { doctor, patient, appointmentId } = req.body;

    const roomId = `heal-${appointmentId}`;

    const consultation = await Consultation.create({
      doctor,
      patient,
      appointmentId,
      roomId,
    });

    res.status(201).json(consultation);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return res.status(404).json({
        message: "Consultation not found",
      });
    }

    res.json(consultation);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createConsultation,
  getConsultation,
};
