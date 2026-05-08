import mongoose from 'mongoose';

const healthFormSchema = new mongoose.Schema({
  weight: Number,
  height: Number,
  age: Number,
  gender: { type: String, enum: ['female', 'male', 'other', 'prefer_not_to_say'] },
  bloodPressure: String,
  sugarLevel: String,
  updatedAt: Date
}, { _id: false });

const patientProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  bloodGroup: String,
  allergies: [String],
  chronicConditions: [String],
  emergencyContact: String,
  healthForm: healthFormSchema
}, { timestamps: true });

export default mongoose.model('PatientProfile', patientProfileSchema);
