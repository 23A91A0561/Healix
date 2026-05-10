import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';

await connectDB();

const doctorData = {
  name: 'Dr. Availa Bell',
  email: 'available-doctor@healix.test',
  password: 'Password123!',
  specialization: 'General Medicine',
  qualification: 'MBBS, MD',
  experienceYears: 20,
  consultationFee: 500,
  bio: 'Available 24/7 for consultations. General practitioner with extensive experience.',
  availableSlots: [
    { day: 'Monday', start: '00:00', end: '23:59', isActive: true },
    { day: 'Tuesday', start: '00:00', end: '23:59', isActive: true },
    { day: 'Wednesday', start: '00:00', end: '23:59', isActive: true },
    { day: 'Thursday', start: '00:00', end: '23:59', isActive: true },
    { day: 'Friday', start: '00:00', end: '23:59', isActive: true },
    { day: 'Saturday', start: '00:00', end: '23:59', isActive: true },
    { day: 'Sunday', start: '00:00', end: '23:59', isActive: true }
  ]
};

try {
  // Create doctor user
  const doctorUser = await User.create({
    name: doctorData.name,
    email: doctorData.email,
    password: doctorData.password,
    role: 'doctor',
    isEmailVerified: true,
    isApproved: true
  });

  // Create doctor profile
  const doctorProfile = await DoctorProfile.create({
    user: doctorUser._id,
    specialization: doctorData.specialization,
    qualification: doctorData.qualification,
    experienceYears: doctorData.experienceYears,
    consultationFee: doctorData.consultationFee,
    bio: doctorData.bio,
    availableSlots: doctorData.availableSlots
  });

  console.log('✅ Doctor created successfully!');
  console.log('Doctor Details:');
  console.log(`  Name: ${doctorData.name}`);
  console.log(`  Email: ${doctorData.email}`);
  console.log(`  Password: ${doctorData.password}`);
  console.log(`  Specialization: ${doctorData.specialization}`);
  console.log(`  Available: Every day, 00:00 - 23:59`);
  console.log(`  Doctor ID: ${doctorProfile._id}`);
  
  await mongoose.disconnect();
} catch (error) {
  console.error('❌ Error creating doctor:', error.message);
  await mongoose.disconnect();
  process.exit(1);
}
