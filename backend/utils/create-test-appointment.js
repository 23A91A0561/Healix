import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';

await connectDB();

// Clear all appointments
await Appointment.deleteMany({});
console.log('Cleared all appointments');

// Get the users
const patient = await User.findOne({ email: 'patient1@healix.test' });
const doctor = await User.findOne({ email: 'doctor1@healix.test' });

if (!patient || !doctor) {
  console.log('Patient or doctor not found. Make sure to run seed first.');
  await mongoose.disconnect();
  process.exit(1);
}

// Create appointment for today at 11:00 AM
const today = new Date();
today.setHours(11, 0, 0, 0);

const appointment = await Appointment.create({
  patient: patient._id,
  doctor: doctor._id,
  scheduledAt: today,
  durationMinutes: 30,
  status: 'confirmed',
  type: 'video',
  amount: 800
});

console.log(`Created appointment:`);
console.log(`- Patient: ${patient.name} (${patient.email})`);
console.log(`- Doctor: ${doctor.name} (${doctor.email})`);
console.log(`- Time: ${today.toLocaleString()}`);
console.log(`- Appointment ID: ${appointment._id}`);

await mongoose.disconnect();
console.log('Done!');
