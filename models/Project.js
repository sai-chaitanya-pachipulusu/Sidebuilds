const { Schema, model, models } = require('mongoose');

const ProjectSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  techStack: [{ type: String }],
  demoUrl: { type: String },
  githubUrl: { type: String },
  status: { type: String, enum: ['active', 'sold', 'pending'], default: 'active' },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = models.Project || model('Project', ProjectSchema); 