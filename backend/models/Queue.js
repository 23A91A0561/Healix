import mongoose from 'mongoose';

const queueItemSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  joinedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['waiting', 'current', 'completed', 'skipped'], default: 'waiting' }
}, { _id: false });

const queueSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  currentAppointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  items: [queueItemSchema]
}, { timestamps: true });

export default mongoose.model('Queue', queueSchema);
