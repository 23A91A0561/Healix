import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
  medicineName: { type: String, required: true },
  schedule: [String],
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['active', 'completed', 'stopped'], default: 'active', index: true },
  logs: [{ date: Date, state: { type: String, enum: ['taken', 'missed'] } }]
}, { timestamps: true });

export default mongoose.model('MedicineReminder', reminderSchema);
