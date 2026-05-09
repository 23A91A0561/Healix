const express = require("express");

const router = express.Router();

const {
  createConsultation,
  getConsultation,
} = require("../controllers/consultationController");

router.post("/", createConsultation);

router.get("/:id", getConsultation);

module.exports = router;
