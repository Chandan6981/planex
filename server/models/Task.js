const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: false, default: null },
  column: { type: String, default: 'todo' },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority: { type: String, enum: ['none', 'low', 'medium', 'high', 'urgent'], default: 'none' },
  status: { type: String, enum: ['todo', 'inprogress', 'review', 'done'], default: 'todo' },
  dueDate: { type: Date },
  startDate: { type: Date },
  completedAt: { type: Date },
  tags: [String],
  order: { type: Number, default: 0 },
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    interval: { type: Number, default: 1 },
    endDate: Date
  },
  subtasks: [{
    title: String,
    completed: { type: Boolean, default: false },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    text: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    editedAt: Date
  }],
  activityLog: [{
    action: String,
    field: String,
    oldValue: String,
    newValue: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  estimatedHours: { type: Number },
  trackedHours: { type: Number, default: 0 },
  timeEntries: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hours: Number,
    note: String,
    date: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

taskSchema.index({ project:   1, createdAt: -1 });
taskSchema.index({ assignees: 1, status:    1  });
taskSchema.index({ createdBy: 1               });
taskSchema.index({ dueDate:   1, status:    1  });
taskSchema.index({ title: 'text', description: 'text' });

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.status === 'done' && !this.completedAt) {
    this.completedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
