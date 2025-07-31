const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500
  },
  // Critères spécifiques
  communication: {
    type: Number,
    min: 1,
    max: 5
  },
  quality: {
    type: Number,
    min: 1,
    max: 5
  },
  timeliness: {
    type: Number,
    min: 1,
    max: 5
  },
  professionalism: {
    type: Number,
    min: 1,
    max: 5
  },
  // Métadonnées
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Modération
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    maxlength: 200
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  hiddenAt: {
    type: Date,
    default: null
  },
  hiddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
ratingSchema.index({ taskId: 1 });
ratingSchema.index({ fromUserId: 1, toUserId: 1 });
ratingSchema.index({ toUserId: 1, createdAt: -1 });
ratingSchema.index({ rating: 1 });

// Empêcher les évaluations multiples pour la même tâche
ratingSchema.index({ taskId: 1, fromUserId: 1, toUserId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema); 