import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 600 }
}, { timestamps: true });

reviewSchema.index({ patient: 1, doctor: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
