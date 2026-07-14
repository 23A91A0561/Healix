import Prescription from '../models/Prescription.js';
import MedicineReminder from '../models/MedicineReminder.js';
import Appointment from '../models/Appointment.js';
import { createPrescriptionPdf } from '../utils/pdf.js';
import { notify } from '../services/notification.service.js';

export async function listPrescriptions(req, res) {
  const filter = req.user.role === 'doctor' ? { doctor: req.user._id } : req.user.role === 'patient' ? { patient: req.user._id } : {};
  res.json(await Prescription.find(filter).populate('doctor patient', 'name email').sort({ createdAt: -1 }));
}

export async function createPrescription(req, res) {
  try {
    const { appointmentId, complaintDescription, medicines, dosage, notes } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId is required' });
    }

    const appointment = await Appointment.findById(appointmentId).catch(() => null);
    if (!appointment) {
      return res.status(404).json({ message: `Appointment not found (id: ${appointmentId})` });
    }

    let medicinesArray = [];
    if (typeof medicines === 'string' && medicines.trim()) {
      medicinesArray = medicines.split('\n').filter(m => m.trim()).map(name => ({
        name: name.trim()
      }));
    } else if (Array.isArray(medicines)) {
      medicinesArray = medicines;
    }

    const prescription = await Prescription.create({
      appointment: appointment._id,
      patient: appointment.patient,
      doctor: req.user._id,
      complaintDescription,
      medicines: medicinesArray,
      dosage,
      notes
    });

    // Create medicine reminders — non-fatal if it fails
    try {
      const reminders = prescription.medicines.map((med) => ({
        patient: prescription.patient,
        prescription: prescription._id,
        medicineName: med.name,
        schedule: ['09:00'],
        startDate: new Date(),
        endDate: new Date(Date.now() + (med.days || 7) * 86400000)
      }));
      if (reminders.length > 0) {
        await MedicineReminder.insertMany(reminders);
      }
    } catch (reminderErr) {
      console.warn('Medicine reminders creation failed (non-fatal):', reminderErr.message);
    }

    // Notify the patient — non-fatal if it fails
    try {
      await notify(req.app.get('io'), prescription.patient, {
        title: 'New Prescription',
        type: 'prescription',
        message: `Dr. ${req.user.name} has created a prescription for your appointment.`
      });
    } catch (notifyErr) {
      console.warn('Prescription notification failed (non-fatal):', notifyErr.message);
    }

    res.status(201).json(prescription);
  } catch (error) {
    console.error('Prescription creation error:', error);
    res.status(500).json({ message: error.message });
  }
}

export async function prescriptionPdf(req, res) {
  const prescription = await Prescription.findById(req.params.id).populate('doctor patient', 'name email');
  if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=prescription-${prescription._id}.pdf`);
  createPrescriptionPdf(prescription).pipe(res);
}
