import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info', enum: ['task', 'comment', 'status', 'reminder', 'info'] },
  read: { type: Number, default: 0 },
  taskId: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

notificationSchema.index({ userId: 1 });

export default mongoose.model('Notification', notificationSchema);
