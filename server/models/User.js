const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  notifications: [{
    message: String,
    type: { type: String, enum: ['task', 'project', 'comment', 'mention'] },
    read: { type: Boolean, default: false },
    link: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Auto-assign color based on name
userSchema.pre('save', function(next) {
  if (!this.color || this.color === '#6366f1') {
    const colors = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];
    const index = this.name.charCodeAt(0) % colors.length;
    this.color = colors[index];
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
