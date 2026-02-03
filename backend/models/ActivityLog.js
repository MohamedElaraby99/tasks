import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  taskId: { type: String, required: true },
  userId: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

activityLogSchema.index({ taskId: 1 });

export default mongoose.model('ActivityLog', activityLogSchema);
