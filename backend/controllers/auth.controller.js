import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import { signAccessToken, signRefreshToken } from '../utils/tokens.js';
import { sendEmail } from '../utils/email.js';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const authPayload = (user) => ({ user, accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) });

export async function register(req, res) {
  const { name, email, password, role = 'patient', specialization, qualification, languages } = req.body;
  const user = await User.create({ name, email, password, role, isApproved: role !== 'doctor' });
  if (role === 'doctor') await DoctorProfile.create({
    user: user._id,
    specialization: specialization || 'General Physician',
    qualification,
    languages: Array.isArray(languages) ? languages : typeof languages === 'string' && languages ? [languages] : []
  });
  if (role === 'patient') await PatientProfile.create({ user: user._id });
  const token = crypto.randomBytes(32).toString('hex');
  user.verificationTokenHash = hash(token);
  await user.save();
  await sendEmail({ to: email, subject: 'Verify your Healix account', html: `<p>Verify token: ${token}</p>` });
  res.status(201).json(authPayload(user));
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
  if (user.isBlocked) return res.status(403).json({ message: 'Account blocked' });
  user.lastLoginAt = new Date();
  await user.save();
  res.json(authPayload(user));
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id);
  res.json(authPayload(user));
}

export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = hash(token);
    user.resetTokenExpires = Date.now() + 1000 * 60 * 30;
    await user.save();
    await sendEmail({ to: user.email, subject: 'Reset your password', html: `<p>Reset token: ${token}</p>` });
  }
  res.json({ message: 'If the email exists, reset instructions were sent' });
}

export async function resetPassword(req, res) {
  const user = await User.findOne({ resetTokenHash: hash(req.body.token), resetTokenExpires: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ message: 'Invalid reset token' });
  user.password = req.body.password;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  res.json({ message: 'Password reset complete' });
}

export async function verifyEmail(req, res) {
  const user = await User.findOne({ verificationTokenHash: hash(req.params.token) });
  if (!user) return res.status(400).json({ message: 'Invalid verification token' });
  user.isEmailVerified = true;
  user.verificationTokenHash = undefined;
  await user.save();
  res.json({ message: 'Email verified' });
}
