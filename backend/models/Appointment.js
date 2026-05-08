import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduledAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, default: 30 },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending', index: true },
  type: { type: String, enum: ['video', 'clinic'], default: 'video' },
  amount: Number,
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  healthFormSnapshot: Object,
  cancellationReason: String
}, { timestamps: true });

appointmentSchema.index({ doctor: 1, scheduledAt: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } });

export default mongoose.model('Appointment', appointmentSchema);
