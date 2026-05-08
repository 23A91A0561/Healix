import mongoose from 'mongoose';

const medicineLineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: String,
  frequency: String,
  duration: String,
  days: { type: Number, default: 7 },
  notes: String
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  medicines: [medicineLineSchema],
  diagnosis: String,
  notes: String,
  pdfUrl: String
}, { timestamps: true });

export default mongoose.model('Prescription', prescriptionSchema);
