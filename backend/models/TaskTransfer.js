import mongoose from 'mongoose';

const taskTransferSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  taskId: { type: String, required: true },
  fromUserId: { type: String, required: true },
  toUserId: { type: String, required: true },
  transferredBy: { type: String, required: true },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

export default mongoose.model('TaskTransfer', taskTransferSchema);
