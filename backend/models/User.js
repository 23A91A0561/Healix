import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient', index: true },
  phone: String,
  avatar: String,
  isEmailVerified: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  refreshTokenHash: String,
  resetTokenHash: String,
  resetTokenExpires: Date,
  verificationTokenHash: String,
  lastLoginAt: Date
}, { timestamps: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
