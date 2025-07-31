const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  proposedBudget: {
    type: Number,
    min: 0
  },
  proposedDuration: {
    type: String
  },
  coverLetter: {
    type: String,
    maxlength: 2000
  },
  portfolio: [{
    title: String,
    description: String,
    link: String,
    type: {
      type: String,
      enum: ['project', 'certificate', 'other']
    }
  }],
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  enterpriseNotes: {
    type: String,
    maxlength: 500
  },
  agentNotes: {
    type: String,
    maxlength: 500
  },
  // Champs pour le suivi
  viewedByEnterprise: {
    type: Boolean,
    default: false
  },
  viewedAt: {
    type: Date,
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
applicationSchema.index({ taskId: 1, agentId: 1 }, { unique: true });
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ agentId: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema); 