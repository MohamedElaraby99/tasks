import mongoose from 'mongoose';

const dailyLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, required: true, enum: ['in_progress', 'paused', 'completed'], default: 'in_progress' },
  pauseReason: { type: String },
  startDate: { type: String, required: true },
  endDate: { type: String },
  rating: { type: Number },
  ratedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

dailyLogSchema.index({ userId: 1 });

export default mongoose.model('DailyLog', dailyLogSchema);
