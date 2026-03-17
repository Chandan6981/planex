const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  icon: { type: String, default: '📋' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  columns: [{
    id: String,
    name: String,
    color: String,
    order: Number
  }],
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  dueDate: { type: Date },
  tags: [String],
  isPrivate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.columns.length === 0) {
    this.columns = [
      { id: 'todo', name: 'To Do', color: '#64748b', order: 0 },
      { id: 'inprogress', name: 'In Progress', color: '#f59e0b', order: 1 },
      { id: 'review', name: 'In Review', color: '#8b5cf6', order: 2 },
      { id: 'done', name: 'Done', color: '#10b981', order: 3 }
    ];
  }
  next();
});

// Virtual for task count
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true
});

module.exports = mongoose.model('Project', projectSchema);
