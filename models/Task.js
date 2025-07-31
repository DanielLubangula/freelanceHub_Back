const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: String,
    required: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  requiredProofs: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'completed', 'paid', 'cancelled'],
    default: 'open'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deadline: {
    type: Date,
    default: null
  },
  category: {
    type: String,
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    default: ''
  },
  isRemote: {
    type: Boolean,
    default: true
  },
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  views: {
    type: Number,
    default: 0
  },
  applicationsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances de recherche
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ skills: 1 });
taskSchema.index({ budget: 1 });
taskSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Task', taskSchema); 