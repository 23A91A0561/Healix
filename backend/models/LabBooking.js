import mongoose from 'mongoose';

const labBookingSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest', required: true },
  scheduledAt: Date,
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  report: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalReport' }
}, { timestamps: true });

export default mongoose.model('LabBooking', labBookingSchema);
