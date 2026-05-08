import mongoose from 'mongoose';

const reviewSnapshotSchema = new mongoose.Schema({
  average: { type: Number, default: 0 },
  count: { type: Number, default: 0 }
}, { _id: false });

const slotSchema = new mongoose.Schema({
  day: String,
  start: String,
  end: String,
  isActive: { type: Boolean, default: true }
}, { _id: false });

const doctorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  specialization: { type: String, required: true, index: true },
  qualification: String,
  experienceYears: { type: Number, default: 0, index: true },
  consultationFee: { type: Number, default: 0 },
  bio: String,
  documents: [String],
  availableSlots: [slotSchema],
  earnings: { type: Number, default: 0 },
  rating: { type: reviewSnapshotSchema, default: () => ({}) }
}, { timestamps: true });

doctorProfileSchema.index({ specialization: 'text', qualification: 'text', bio: 'text' });

export default mongoose.model('DoctorProfile', doctorProfileSchema);
