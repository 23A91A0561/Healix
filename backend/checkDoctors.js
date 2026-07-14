import dotenv from 'dotenv';
dotenv.config({ path: new URL('./.env', import.meta.url) });

import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected to MongoDB');

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const DoctorProfile = mongoose.model('DoctorProfile', new mongoose.Schema({}, { strict: false }));

const doctors = await User.find({ role: 'doctor' }).select('name email isApproved isBlocked');
console.log(`\nFound ${doctors.length} doctor user(s):`);
doctors.forEach(d => {
  console.log(`  - ${d.name} (${d.email}) | isApproved: ${d.isApproved} | isBlocked: ${d.isBlocked}`);
});

const profiles = await DoctorProfile.find({});
console.log(`\nFound ${profiles.length} doctor profile(s):`);
profiles.forEach(p => {
  console.log(`  - user: ${p.user} | specialization: ${p.specialization} | fee: ${p.consultationFee}`);
});

await mongoose.disconnect();
