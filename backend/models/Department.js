import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nameEn: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

export default mongoose.model('Department', departmentSchema);
