import Appointment from '../models/Appointment.js';
import PatientProfile from '../models/PatientProfile.js';
import { createAppointment } from '../services/appointment.service.js';
import { notify } from '../services/notification.service.js';
import { verifyRazorpaySignature } from '../services/payment.service.js';

export async function listAppointments(req, res) {
  const filter = req.user.role === 'doctor' ? { doctor: req.user._id } : req.user.role === 'patient' ? { patient: req.user._id } : {};
  const data = await Appointment.find(filter).populate('doctor patient', 'name email avatar').populate('payment', 'amount currency provider status providerOrderId providerPaymentId').sort({ scheduledAt: -1 });
  res.json(data);
}

export async function bookAppointment(req, res) {
  const result = await createAppointment({ patient: req.user._id, doctor: req.body.doctor, scheduledAt: req.body.scheduledAt, amount: Number(req.body.amount || 0) });
  await notify(req.app.get('io'), req.body.doctor, { title: 'New appointment request', type: 'appointment', message: 'A patient selected a consultation slot. Confirmation is pending payment.' });
  res.status(201).json(result);
}

export async function updateAppointmentStatus(req, res) {
  const appointment = await Appointment.findById(req.params.id).populate('payment');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (req.body.status === 'confirmed' && appointment.amount > 0 && appointment.payment?.status !== 'success') {
    return res.status(400).json({ message: 'Patient must complete payment before this appointment can be confirmed' });
  }
  appointment.status = req.body.status;
  appointment.cancellationReason = req.body.reason;
  await appointment.save();
  if (appointment) await notify(req.app.get('io'), appointment.patient, { title: 'Appointment updated', type: 'appointment', message: `Status: ${appointment.status}` });
  res.json(appointment);
}

export async function verifyAppointmentPayment(req, res) {
  const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user._id }).populate('payment');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (!appointment.payment) return res.status(400).json({ message: 'No payment is linked to this appointment' });

  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (appointment.payment.providerOrderId !== orderId) return res.status(400).json({ message: 'Razorpay order does not match this appointment' });

  const isValid = verifyRazorpaySignature({ orderId, paymentId, signature });
  if (!isValid) {
    appointment.payment.status = 'failed';
    await appointment.payment.save();
    return res.status(400).json({ message: 'Payment verification failed' });
  }

  appointment.payment.status = 'success';
  appointment.payment.providerPaymentId = paymentId;
  await appointment.payment.save();
  appointment.status = 'confirmed';
  await appointment.save();

  await notify(req.app.get('io'), appointment.doctor, { title: 'Appointment confirmed', type: 'appointment', message: 'A patient paid and confirmed a consultation.' });
  await notify(req.app.get('io'), appointment.patient, { title: 'Payment successful', type: 'payment', message: 'Your appointment is confirmed.' });
  res.json({ appointment, payment: appointment.payment });
}

export async function saveHealthForm(req, res) {
  const profile = await PatientProfile.findOneAndUpdate(
    { user: req.user._id },
    { healthForm: { ...req.body, updatedAt: new Date() } },
    { new: true, upsert: true }
  );
  res.json(profile);
}
