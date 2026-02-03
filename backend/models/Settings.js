import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

export default mongoose.model('Settings', settingsSchema);
