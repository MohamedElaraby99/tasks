import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, required: true, enum: ['urgent', 'high', 'medium', 'low'], default: 'medium' },
  status: { type: String, required: true, enum: ['new', 'seen', 'in_progress', 'paused', 'completed', 'rejected'], default: 'new' },
  progress: { type: Number, default: 0 },
  dueDate: { type: Date },
  createdBy: { type: String, required: true },
  assignedTo: { type: String, required: true },
  departmentId: { type: String },
  seenAt: { type: Date },
  startedAt: { type: Date },
  pausedAt: { type: Date },
  completedAt: { type: Date },
  pauseReason: { type: String },
  rejectReason: { type: String },
  creatorRating: { type: Number },
  completionRating: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ departmentId: 1 });
taskSchema.index({ status: 1 });

export default mongoose.model('Task', taskSchema);
