import mongoose from 'mongoose';

const medicalReportSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  category: String,
  fileUrl: { type: String, required: true },
  publicId: String,
  notes: String
}, { timestamps: true });

export default mongoose.model('MedicalReport', medicalReportSchema);
