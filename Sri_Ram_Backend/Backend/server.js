const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const cors = require("cors");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const authRoutes = require("./routes/authRoutes");

require("dotenv").config();
connectDB();
const appointmentRoutes = require("./routes/appointmentRoutes");

const app = express();

app.use(express.json());

app.use(cors({
  origin: [
    "https://healix-ashy.vercel.app",
    "https://healix-kbflq81fy-23a91a0578s-projects.vercel.app"
  ],
  credentials: true
}));

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
