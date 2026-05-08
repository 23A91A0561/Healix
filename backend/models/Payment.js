import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purpose: { type: String, enum: ['consultation', 'medicine', 'lab'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  provider: { type: String, enum: ['stripe', 'razorpay', 'mock'], default: 'stripe' },
  providerOrderId: String,
  providerPaymentId: String,
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending', index: true },
  metadata: Object
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
