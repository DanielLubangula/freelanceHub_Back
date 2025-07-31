const express = require('express');
const Payment = require('../models/Payment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { uploadSingle, handleUploadError } = require('../middlewares/upload');

const router = express.Router();

// @route   POST /api/payments
// @desc    Créer un nouveau paiement
// @access  Private (entreprises uniquement)
router.post('/', authenticateToken, authorizeRoles('enterprise'), uploadSingle, handleUploadError, async (req, res) => {
  try {
    const {
      taskId,
      amount,
      method,
      description,
      notes
    } = req.body;

    // Validation des données
    if (!taskId || !amount || !method) {
      return res.status(400).json({
        success: false,
        message: 'ID de tâche, montant et méthode de paiement sont obligatoires'
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant doit être supérieur à 0'
      });
    }

    // Vérifier si la tâche existe
    const task = await Task.findById(taskId)
      .populate('assignedTo', 'name email paymentMethod paymentNumber');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de la tâche
    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier que la tâche a un agent assigné
    if (!task.assignedTo || task.assignedTo.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun agent assigné à cette tâche'
      });
    }

    // Calculer les frais de plateforme (5%)
    const platformFee = parseFloat(amount) * 0.05;
    const netAmount = parseFloat(amount) - platformFee;

    // Générer une référence de transaction unique
    const transactionRef = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Préparer les données de paiement
    const paymentData = {
      taskId,
      amount: parseFloat(amount),
      method,
      payerId: req.user._id,
      payeeId: task.assignedTo[0]._id,
      platformFee,
      netAmount,
      description: description || `Paiement pour la tâche "${task.title}"`,
      notes,
      transactionRef
    };

    // Ajouter la preuve de paiement si fournie
    if (req.file) {
      paymentData.proof = req.file.path;
    }

    const payment = new Payment(paymentData);
    await payment.save();

    // Mettre à jour le statut de la tâche
    await Task.findByIdAndUpdate(taskId, {
      status: 'paid'
    });

    // Créer une notification pour l'agent
    const notification = new Notification({
      userId: task.assignedTo[0]._id,
      title: 'Paiement reçu',
      message: `Vous avez reçu un paiement de ${amount} USD pour la tâche "${task.title}"`,
      type: 'success',
      relatedTaskId: taskId,
      relatedPaymentId: payment._id
    });
    await notification.save();

    // Populate les données
    await payment.populate('payerId', 'name email companyName');
    await payment.populate('payeeId', 'name email');
    await payment.populate('taskId', 'title');

    res.status(201).json({
      success: true,
      message: 'Paiement créé avec succès',
      data: { payment }
    });

  } catch (error) {
    console.error('Erreur lors de la création du paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du paiement'
    });
  }
});

// @route   GET /api/payments
// @desc    Obtenir tous les paiements de l'utilisateur connecté
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, method } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construire le filtre
    const filter = {
      $or: [
        { payerId: req.user._id },
        { payeeId: req.user._id }
      ]
    };

    if (status) {
      filter.status = status;
    }

    if (method) {
      filter.method = method;
    }

    const payments = await Payment.find(filter)
      .populate('payerId', 'name email companyName')
      .populate('payeeId', 'name email')
      .populate('taskId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des paiements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements'
    });
  }
});

// @route   GET /api/payments/statistics
// @desc    Obtenir les statistiques de paiement de l'utilisateur
// @access  Private
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const { period = 'all' } = req.query;

    // Construire le filtre de date
    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      dateFilter = { createdAt: { $gte: startDate } };
    }

    // Statistiques des paiements reçus (pour les agents)
    const receivedPayments = await Payment.find({
      payeeId: req.user._id,
      status: 'confirmed',
      ...dateFilter
    });

    const totalReceived = receivedPayments.reduce((sum, payment) => sum + payment.netAmount, 0);
    const averageReceived = receivedPayments.length > 0 ? totalReceived / receivedPayments.length : 0;

    // Statistiques des paiements effectués (pour les entreprises)
    const sentPayments = await Payment.find({
      payerId: req.user._id,
      ...dateFilter
    });

    const totalSent = sentPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const averageSent = sentPayments.length > 0 ? totalSent / sentPayments.length : 0;

    // Statistiques par méthode de paiement
    const methodStats = await Payment.aggregate([
      {
        $match: {
          $or: [
            { payerId: req.user._id },
            { payeeId: req.user._id }
          ],
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Statistiques par statut
    const statusStats = await Payment.aggregate([
      {
        $match: {
          $or: [
            { payerId: req.user._id },
            { payeeId: req.user._id }
          ],
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        received: {
          total: totalReceived,
          average: averageReceived,
          count: receivedPayments.length
        },
        sent: {
          total: totalSent,
          average: averageSent,
          count: sentPayments.length
        },
        methodStats,
        statusStats
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// @route   GET /api/payments/:id
// @desc    Obtenir un paiement spécifique
// @access  Private (payeur, bénéficiaire ou admin)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('payerId', 'name email companyName')
      .populate('payeeId', 'name email')
      .populate('taskId', 'title description');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier les permissions
    const isPayer = payment.payerId._id.toString() === req.user._id.toString();
    const isPayee = payment.payeeId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPayer && !isPayee && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.json({
      success: true,
      data: { payment }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du paiement'
    });
  }
});

// @route   PUT /api/payments/:id/confirm
// @desc    Confirmer un paiement
// @access  Private (bénéficiaire uniquement)
router.put('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('payeeId', 'name email')
      .populate('taskId', 'title');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le bénéficiaire
    if (payment.payeeId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Seul le bénéficiaire peut confirmer le paiement'
      });
    }

    // Vérifier que le paiement est en attente
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Ce paiement ne peut plus être confirmé'
      });
    }

    // Mettre à jour le statut
    payment.status = 'confirmed';
    payment.confirmedAt = new Date();
    await payment.save();

    // Créer une notification pour le payeur
    const notification = new Notification({
      userId: payment.payerId,
      title: 'Paiement confirmé',
      message: `Votre paiement pour "${payment.taskId.title}" a été confirmé`,
      type: 'success',
      relatedTaskId: payment.taskId._id,
      relatedPaymentId: payment._id
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Paiement confirmé avec succès',
      data: { payment }
    });

  } catch (error) {
    console.error('Erreur lors de la confirmation du paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la confirmation du paiement'
    });
  }
});

// @route   PUT /api/payments/:id/dispute
// @desc    Contester un paiement
// @access  Private (payeur ou bénéficiaire)
router.put('/:id/dispute', authenticateToken, async (req, res) => {
  try {
    const { disputeReason } = req.body;

    if (!disputeReason) {
      return res.status(400).json({
        success: false,
        message: 'Raison de la contestation requise'
      });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('payerId', 'name email')
      .populate('payeeId', 'name email')
      .populate('taskId', 'title');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le payeur ou le bénéficiaire
    const isPayer = payment.payerId._id.toString() === req.user._id.toString();
    const isPayee = payment.payeeId._id.toString() === req.user._id.toString();

    if (!isPayer && !isPayee) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier que le paiement peut être contesté
    if (payment.status === 'disputed' || payment.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Ce paiement ne peut plus être contesté'
      });
    }

    // Mettre à jour le statut
    payment.status = 'disputed';
    payment.disputeReason = disputeReason;
    payment.isDisputed = true;
    await payment.save();

    // Créer une notification pour l'autre partie
    const otherUserId = isPayer ? payment.payeeId._id : payment.payerId._id;
    const notification = new Notification({
      userId: otherUserId,
      title: 'Paiement contesté',
      message: `Le paiement pour "${payment.taskId.title}" a été contesté`,
      type: 'warning',
      relatedTaskId: payment.taskId._id,
      relatedPaymentId: payment._id
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Paiement contesté avec succès',
      data: { payment }
    });

  } catch (error) {
    console.error('Erreur lors de la contestation du paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la contestation du paiement'
    });
  }
});

module.exports = router; 