import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'ceo', 'manager', 'team_leader', 'employee'] },
  departmentId: { type: String, default: null },
  whatsapp: { type: String, default: '' },
  shiftStart: { type: String },
  shiftEnd: { type: String },
  rating: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  totalTasks: { type: Number, default: 0 },
  isOnline: { type: Number, default: 0 },
  lastSeen: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

userSchema.index({ departmentId: 1 });

export default mongoose.model('User', userSchema);
