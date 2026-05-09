const express = require("express");

const router = express.Router();

const {
  createPrescription,

  getPatientPrescriptions,
} = require("../controllers/prescriptionController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createPrescription);

router.get("/patient", protect, getPatientPrescriptions);

module.exports = router;
