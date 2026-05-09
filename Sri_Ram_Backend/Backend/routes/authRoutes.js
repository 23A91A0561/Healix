const express = require("express");

const router = express.Router();

const {
  register,
  login,
  getDoctors,
} = require("../controllers/authController");

router.post("/register", register);

router.post("/login", login);
router.get("/doctors", getDoctors);
module.exports = router;
