import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  taskId: { type: String, required: true },
  userId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

commentSchema.index({ taskId: 1 });

export default mongoose.model('Comment', commentSchema);
