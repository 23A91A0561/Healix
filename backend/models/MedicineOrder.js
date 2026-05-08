import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: String,
  quantity: { type: Number, default: 1 },
  price: { type: Number, default: 0 }
}, { _id: false });

const medicineOrderSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  items: [itemSchema],
  total: Number,
  status: { type: String, enum: ['processing', 'shipped', 'delivered'], default: 'processing', index: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  address: String
}, { timestamps: true });

export default mongoose.model('MedicineOrder', medicineOrderSchema);
