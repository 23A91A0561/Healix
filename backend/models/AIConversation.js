import mongoose from 'mongoose';

const aiConversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  messages: [{ role: { type: String, enum: ['user', 'assistant'] }, text: String, analysis: Object, createdAt: { type: Date, default: Date.now } }],
  memory: Object
}, { timestamps: true });

export default mongoose.model('AIConversation', aiConversationSchema);
