import Prescription from '../models/Prescription.js';
import MedicineReminder from '../models/MedicineReminder.js';
import { createPrescriptionPdf } from '../utils/pdf.js';

export async function listPrescriptions(req, res) {
  const filter = req.user.role === 'doctor' ? { doctor: req.user._id } : req.user.role === 'patient' ? { patient: req.user._id } : {};
  res.json(await Prescription.find(filter).populate('doctor patient', 'name email').sort({ createdAt: -1 }));
}

export async function createPrescription(req, res) {
  const prescription = await Prescription.create({ ...req.body, doctor: req.user._id });
  const reminders = prescription.medicines.map((med) => ({
    patient: prescription.patient,
    prescription: prescription._id,
    medicineName: med.name,
    schedule: ['09:00'],
    startDate: new Date(),
    endDate: new Date(Date.now() + (med.days || 7) * 86400000)
  }));
  await MedicineReminder.insertMany(reminders);
  res.status(201).json(prescription);
}

export async function prescriptionPdf(req, res) {
  const prescription = await Prescription.findById(req.params.id).populate('doctor patient', 'name email');
  if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=prescription-${prescription._id}.pdf`);
  createPrescriptionPdf(prescription).pipe(res);
}
