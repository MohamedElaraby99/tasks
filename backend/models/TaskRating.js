import mongoose from 'mongoose';

const taskRatingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  taskId: { type: String, required: true },
  ratedBy: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  type: { type: String, required: true, enum: ['completion', 'quality'] },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

export default mongoose.model('TaskRating', taskRatingSchema);
