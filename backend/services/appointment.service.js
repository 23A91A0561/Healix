import Appointment from '../models/Appointment.js';
import PatientProfile from '../models/PatientProfile.js';
import { createRazorpayPayment } from './payment.service.js';

export async function createAppointment({ patient, doctor, scheduledAt, amount }) {
  const existing = await Appointment.findOne({ doctor, scheduledAt, status: { $in: ['pending', 'confirmed'] } });
  if (existing) {
    const err = new Error('This slot is already booked');
    err.statusCode = 409;
    throw err;
  }
  const profile = await PatientProfile.findOne({ user: patient });
  const appointment = await Appointment.create({ patient, doctor, scheduledAt, amount, healthFormSnapshot: profile?.healthForm || {} });

  if (amount > 0) {
    try {
      const { payment, checkout } = await createRazorpayPayment({
        user: patient,
        amount,
        purpose: 'consultation',
        metadata: { appointmentId: String(appointment._id), doctor: String(doctor) }
      });
      appointment.payment = payment._id;
      await appointment.save();
      return { appointment, payment, razorpay: checkout };
    } catch (error) {
      appointment.status = 'cancelled';
      appointment.cancellationReason = 'Payment order creation failed';
      await appointment.save();
      throw error;
    }
  }

  appointment.status = 'confirmed';
  await appointment.save();
  return { appointment };
}
