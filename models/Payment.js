const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    required: true,
    enum: ['Orange Money', 'Airtel Money', 'M-Pesa', 'Visa', 'Mastercard', 'PayPal', 'Bank Transfer']
  },
  proof: {
    type: String,
    default: null
  },
  transactionRef: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'disputed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  disputeReason: {
    type: String,
    maxlength: 500
  },
  // Informations sur le payeur et le bénéficiaire
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Informations de paiement
  paymentDetails: {
    accountNumber: String,
    accountName: String,
    bankName: String,
    swiftCode: String,
    iban: String
  },
  // Frais et commission
  platformFee: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  // Métadonnées
  description: {
    type: String,
    maxlength: 200
  },
  notes: {
    type: String,
    maxlength: 500
  },
  // Champs pour le suivi
  isDisputed: {
    type: Boolean,
    default: false
  },
  disputeResolvedAt: {
    type: Date,
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
paymentSchema.index({ taskId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ payerId: 1, createdAt: -1 });
paymentSchema.index({ payeeId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema); 