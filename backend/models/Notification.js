import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: String,
  type: { type: String, enum: ['appointment', 'queue', 'medicine', 'payment', 'system', 'prescription'], default: 'system' },
  readAt: Date,
  metadata: Object
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
