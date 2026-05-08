import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  fileUrl: String
}, { timestamps: true });

export default mongoose.model('Chat', chatSchema);
