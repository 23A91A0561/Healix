import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import LabTest from '../models/LabTest.js';

await connectDB();
await Promise.all([User.deleteMany({}), DoctorProfile.deleteMany({}), PatientProfile.deleteMany({}), LabTest.deleteMany({})]);

const password = 'Password123!';
const patients = [
  { name: 'Priya Sharma', email: 'patient1@healix.test', bloodGroup: 'O+', emergencyContact: '+91 90000 00001' },
  { name: 'Aarushi Verma', email: 'patient2@healix.test', bloodGroup: 'A+', emergencyContact: '+91 90000 00002' },
  { name: 'Kabir Singh', email: 'patient3@healix.test', bloodGroup: 'B+', emergencyContact: '+91 90000 00003' },
  { name: 'Meera Iyer', email: 'patient4@healix.test', bloodGroup: 'AB+', emergencyContact: '+91 90000 00004' },
  { name: 'Rohan Das', email: 'patient5@healix.test', bloodGroup: 'O-', emergencyContact: '+91 90000 00005' }
];

const doctors = [
  {
    name: 'Dr. Aarav Mehta',
    email: 'doctor1@healix.test',
    specialization: 'Cardiology',
    qualification: 'MBBS, MD',
    experienceYears: 12,
    consultationFee: 800,
    bio: 'Cardiologist focused on preventive and digital care.',
    availableSlots: [{ day: 'Monday', start: '10:00', end: '14:00' }, { day: 'Wednesday', start: '11:00', end: '16:00' }]
  },
  {
    name: 'Dr. Sana Khan',
    email: 'doctor2@healix.test',
    specialization: 'Dermatology',
    qualification: 'MBBS, DDVL',
    experienceYears: 9,
    consultationFee: 700,
    bio: 'Dermatologist specializing in acne, hair fall, and skin allergy care.',
    availableSlots: [{ day: 'Tuesday', start: '09:00', end: '13:00' }, { day: 'Friday', start: '12:00', end: '17:00' }]
  },
  {
    name: 'Dr. Vikram Rao',
    email: 'doctor3@healix.test',
    specialization: 'General Physician',
    qualification: 'MBBS',
    experienceYears: 15,
    consultationFee: 500,
    bio: 'Primary care physician for common illnesses and chronic disease follow-up.',
    availableSlots: [{ day: 'Monday', start: '08:00', end: '12:00' }, { day: 'Thursday', start: '14:00', end: '18:00' }]
  },
  {
    name: 'Dr. Nisha Patel',
    email: 'doctor4@healix.test',
    specialization: 'Pediatrics',
    qualification: 'MBBS, DCH',
    experienceYears: 11,
    consultationFee: 650,
    bio: 'Pediatrician providing child health and vaccination consultations.',
    availableSlots: [{ day: 'Wednesday', start: '09:30', end: '13:30' }, { day: 'Saturday', start: '10:00', end: '14:00' }]
  },
  {
    name: 'Dr. Farhan Ali',
    email: 'doctor5@healix.test',
    specialization: 'Orthopedics',
    qualification: 'MBBS, MS Orthopedics',
    experienceYears: 13,
    consultationFee: 900,
    bio: 'Orthopedic specialist for joint pain, fractures, and mobility issues.',
    availableSlots: [{ day: 'Tuesday', start: '11:00', end: '15:00' }, { day: 'Friday', start: '09:00', end: '12:30' }]
  },
  {
    name: 'Dr. Ravi Kumar',
    email: 'doctor6@healix.test',
    specialization: 'Neurology',
    qualification: 'MBBS, MD Neurology',
    experienceYears: 10,
    consultationFee: 850,
    bio: 'Neurologist specializing in migraines, seizures, and neurological disorders.',
    availableSlots: [{ day: 'Saturday', start: '21:30', end: '23:30' }, { day: 'Sunday', start: '18:00', end: '22:00' }]
  }
];

const [patientUsers, doctorUsers] = await Promise.all([
  User.create(patients.map((patient) => ({ name: patient.name, email: patient.email, password, role: 'patient', isEmailVerified: true }))),
  User.create(doctors.map((doctor) => ({ name: doctor.name, email: doctor.email, password, role: 'doctor', isEmailVerified: true, isApproved: true })))
]);

await User.create({ name: 'Admin User', email: 'admin@healix.test', password, role: 'admin', isEmailVerified: true });

await PatientProfile.create(patients.map((patient, index) => ({
  user: patientUsers[index]._id,
  bloodGroup: patient.bloodGroup,
  emergencyContact: patient.emergencyContact
})));

await DoctorProfile.create(doctors.map((doctor, index) => ({
  user: doctorUsers[index]._id,
  specialization: doctor.specialization,
  qualification: doctor.qualification,
  experienceYears: doctor.experienceYears,
  consultationFee: doctor.consultationFee,
  bio: doctor.bio,
  availableSlots: doctor.availableSlots
})));
await LabTest.create([
  { name: 'Complete Blood Count', price: 499, description: 'CBC with differential count' },
  { name: 'Thyroid Profile', price: 799, description: 'T3, T4, TSH profile' }
]);

console.log('Seeded demo accounts');
await mongoose.disconnect();
