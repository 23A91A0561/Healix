import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';

await connectDB();

const doctorEmail = 'available-doctor@healix.test';
const startTime = '23:30';
const endTime = '00:00';

try {
  const user = await User.findOne({ email: doctorEmail });
  if (!user) {
    console.error(`❌ User with email ${doctorEmail} not found.`);
    process.exit(1);
  }

  const profile = await DoctorProfile.findOne({ user: user._id });
  if (!profile) {
    console.error(`❌ Profile for doctor ${doctorEmail} not found.`);
    process.exit(1);
  }

  // Set ONLY Monday to the requested slot
  profile.availableSlots = [
    {
      day: 'Monday',
      start: startTime,
      end: endTime,
      isActive: true
    }
  ];

  await profile.save();

  console.log(`✅ Doctor ${doctorEmail} availability updated to ONLY Monday ${startTime} - ${endTime}.`);
  
  await mongoose.disconnect();
} catch (error) {
  console.error('❌ Error updating doctor:', error.message);
  await mongoose.disconnect();
  process.exit(1);
}
