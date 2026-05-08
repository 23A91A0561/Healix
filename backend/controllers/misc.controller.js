import Notification from '../models/Notification.js';
import Queue from '../models/Queue.js';
import MedicalReport from '../models/MedicalReport.js';
import LabTest from '../models/LabTest.js';
import LabBooking from '../models/LabBooking.js';
import MedicineOrder from '../models/MedicineOrder.js';
import Review from '../models/Review.js';
import DoctorProfile from '../models/DoctorProfile.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Payment.js';
import { createPayment } from '../services/payment.service.js';
import { analyzeSymptoms } from '../ai/ai.service.js';
import { symptomDataset } from '../ai/symptomDataset.js';

export const listNotifications = async (req, res) => res.json(await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }));
export const markNotificationRead = async (req, res) => res.json(await Notification.findByIdAndUpdate(req.params.id, { readAt: new Date() }, { new: true }));
export const getQueue = async (req, res) => res.json(await Queue.findOne({ doctor: req.params.doctorId }).populate('items.patient currentAppointment', 'name scheduledAt'));
export const uploadReport = async (req, res) => res.status(201).json(await MedicalReport.create({ patient: req.user._id, title: req.body.title || req.file.originalname, fileUrl: `/uploads/${req.file.filename}`, category: req.body.category }));
export const listLabs = async (_req, res) => res.json(await LabTest.find({ isActive: true }));
export const bookLab = async (req, res) => res.status(201).json(await LabBooking.create({ patient: req.user._id, ...req.body }));
export const createOrder = async (req, res) => res.status(201).json(await MedicineOrder.create({ patient: req.user._id, ...req.body }));
export const listOrders = async (req, res) => res.json(await MedicineOrder.find({ patient: req.user._id }).sort({ createdAt: -1 }));
export const createPaymentIntent = async (req, res) => res.status(201).json(await createPayment({ user: req.user._id, ...req.body }));
export const verifyPayment = async (req, res) => res.json(await Payment.findByIdAndUpdate(req.body.paymentId, { status: req.body.status || 'success' }, { new: true }));
export async function createReview(req, res) {
  const review = await Review.findOneAndUpdate({ patient: req.user._id, doctor: req.body.doctor }, { rating: req.body.rating, comment: req.body.comment }, { new: true, upsert: true });
  const stats = await Review.aggregate([{ $match: { doctor: review.doctor } }, { $group: { _id: '$doctor', average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  await DoctorProfile.findOneAndUpdate({ user: review.doctor }, { rating: { average: stats[0].average, count: stats[0].count } });
  res.status(201).json(review);
}
export const analyzeAi = async (req, res) => res.json(await analyzeSymptoms({ user: req.user?._id, text: req.body.text, conversationId: req.body.conversationId }));
export const listSymptoms = async (_req, res) => res.json(symptomDataset);
export async function adminStats(_req, res) {
  const [users, doctors, appointments, revenue] = await Promise.all([
    User.countDocuments(), User.countDocuments({ role: 'doctor' }), Appointment.countDocuments(), Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);
  res.json({ users, doctors, appointments, revenue: revenue[0]?.total || 0 });
}
export const blockUser = async (req, res) => res.json(await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true }));
