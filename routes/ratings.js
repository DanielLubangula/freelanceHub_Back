const express = require('express');
const Rating = require('../models/Rating');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// @route   POST /api/ratings
// @desc    Créer une nouvelle évaluation
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      taskId,
      toUserId,
      rating,
      comment,
      communication,
      quality,
      timeliness,
      professionalism
    } = req.body;

    // Validation des données
    if (!taskId || !toUserId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'ID de tâche, ID utilisateur et note sont obligatoires'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'La note doit être comprise entre 1 et 5'
      });
    }

    // Vérifier si la tâche existe
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    // Vérifier que l'utilisateur peut évaluer
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo && task.assignedTo.includes(req.user._id);
    const isTargetUser = toUserId === req.user._id;

    if (!isCreator && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez évaluer que les participants de cette tâche'
      });
    }

    if (isTargetUser) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous évaluer vous-même'
      });
    }

    // Vérifier que la tâche est terminée
    if (task.status !== 'completed' && task.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez évaluer que les tâches terminées'
      });
    }

    // Vérifier si l'utilisateur a déjà évalué
    const existingRating = await Rating.findOne({
      taskId,
      fromUserId: req.user._id,
      toUserId
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà évalué cet utilisateur pour cette tâche'
      });
    }

    // Créer l'évaluation
    const ratingData = {
      taskId,
      fromUserId: req.user._id,
      toUserId,
      rating,
      comment,
      communication,
      quality,
      timeliness,
      professionalism
    };

    const newRating = new Rating(ratingData);
    await newRating.save();

    // Mettre à jour la note moyenne de l'utilisateur évalué
    const userRatings = await Rating.find({ toUserId });
    const averageRating = userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;

    await User.findByIdAndUpdate(toUserId, {
      rating: Math.round(averageRating * 10) / 10
    });

    // Créer une notification
    const notification = new Notification({
      userId: toUserId,
      title: 'Nouvelle évaluation reçue',
      message: `Vous avez reçu une évaluation de ${rating}/5 pour la tâche "${task.title}"`,
      type: 'info',
      relatedTaskId: taskId,
      relatedRatingId: newRating._id
    });
    await notification.save();

    // Populate les données
    await newRating.populate('fromUserId', 'name email avatar companyName');
    await newRating.populate('toUserId', 'name email avatar');
    await newRating.populate('taskId', 'title');

    res.status(201).json({
      success: true,
      message: 'Évaluation créée avec succès',
      data: { rating: newRating }
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'évaluation'
    });
  }
});

// @route   GET /api/ratings
// @desc    Obtenir les évaluations avec filtres
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      taskId,
      toUserId,
      fromUserId,
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construire le filtre
    const filter = {};

    if (taskId) filter.taskId = taskId;
    if (toUserId) filter.toUserId = toUserId;
    if (fromUserId) filter.fromUserId = fromUserId;
    if (rating) filter.rating = { $gte: parseFloat(rating) };

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const ratings = await Rating.find(filter)
      .populate('fromUserId', 'name email avatar companyName')
      .populate('toUserId', 'name email avatar')
      .populate('taskId', 'title')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rating.countDocuments(filter);

    res.json({
      success: true,
      data: {
        ratings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des évaluations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des évaluations'
    });
  }
});

// @route   GET /api/ratings/statistics
// @desc    Obtenir les statistiques d'évaluation
// @access  Public
router.get('/statistics', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur requis'
      });
    }

    // Statistiques des évaluations reçues
    const receivedRatings = await Rating.find({ toUserId: userId });
    const averageRating = receivedRatings.length > 0 
      ? receivedRatings.reduce((sum, r) => sum + r.rating, 0) / receivedRatings.length 
      : 0;

    // Statistiques par critère
    const communicationAvg = receivedRatings.length > 0 
      ? receivedRatings.reduce((sum, r) => sum + (r.communication || 0), 0) / receivedRatings.length 
      : 0;

    const qualityAvg = receivedRatings.length > 0 
      ? receivedRatings.reduce((sum, r) => sum + (r.quality || 0), 0) / receivedRatings.length 
      : 0;

    const timelinessAvg = receivedRatings.length > 0 
      ? receivedRatings.reduce((sum, r) => sum + (r.timeliness || 0), 0) / receivedRatings.length 
      : 0;

    const professionalismAvg = receivedRatings.length > 0 
      ? receivedRatings.reduce((sum, r) => sum + (r.professionalism || 0), 0) / receivedRatings.length 
      : 0;

    // Distribution des notes
    const ratingDistribution = {
      1: receivedRatings.filter(r => r.rating === 1).length,
      2: receivedRatings.filter(r => r.rating === 2).length,
      3: receivedRatings.filter(r => r.rating === 3).length,
      4: receivedRatings.filter(r => r.rating === 4).length,
      5: receivedRatings.filter(r => r.rating === 5).length
    };

    res.json({
      success: true,
      data: {
        totalRatings: receivedRatings.length,
        averageRating: Math.round(averageRating * 10) / 10,
        communicationAvg: Math.round(communicationAvg * 10) / 10,
        qualityAvg: Math.round(qualityAvg * 10) / 10,
        timelinessAvg: Math.round(timelinessAvg * 10) / 10,
        professionalismAvg: Math.round(professionalismAvg * 10) / 10,
        ratingDistribution
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

// @route   GET /api/ratings/:id
// @desc    Obtenir une évaluation spécifique
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const rating = await Rating.findById(req.params.id)
      .populate('fromUserId', 'name email avatar companyName')
      .populate('toUserId', 'name email avatar')
      .populate('taskId', 'title');

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Évaluation non trouvée'
      });
    }

    res.json({
      success: true,
      data: { rating }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'évaluation'
    });
  }
});

// @route   PUT /api/ratings/:id
// @desc    Mettre à jour une évaluation
// @access  Private (propriétaire de l'évaluation)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      rating,
      comment,
      communication,
      quality,
      timeliness,
      professionalism
    } = req.body;

    const existingRating = await Rating.findById(req.params.id);

    if (!existingRating) {
      return res.status(404).json({
        success: false,
        message: 'Évaluation non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de l'évaluation
    if (existingRating.fromUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier que l'évaluation peut être modifiée (dans les 24h)
    const hoursSinceCreation = (Date.now() - existingRating.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier une évaluation après 24h'
      });
    }

    // Mettre à jour les champs
    if (rating) existingRating.rating = rating;
    if (comment !== undefined) existingRating.comment = comment;
    if (communication) existingRating.communication = communication;
    if (quality) existingRating.quality = quality;
    if (timeliness) existingRating.timeliness = timeliness;
    if (professionalism) existingRating.professionalism = professionalism;

    await existingRating.save();

    // Mettre à jour la note moyenne de l'utilisateur évalué
    const userRatings = await Rating.find({ toUserId: existingRating.toUserId });
    const averageRating = userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;

    await User.findByIdAndUpdate(existingRating.toUserId, {
      rating: Math.round(averageRating * 10) / 10
    });

    // Populate les données
    await existingRating.populate('fromUserId', 'name email avatar companyName');
    await existingRating.populate('toUserId', 'name email avatar');
    await existingRating.populate('taskId', 'title');

    res.json({
      success: true,
      message: 'Évaluation mise à jour avec succès',
      data: { rating: existingRating }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'évaluation'
    });
  }
});

// @route   DELETE /api/ratings/:id
// @desc    Supprimer une évaluation
// @access  Private (propriétaire de l'évaluation ou admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const rating = await Rating.findById(req.params.id);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Évaluation non trouvée'
      });
    }

    // Vérifier les permissions
    const isOwner = rating.fromUserId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Supprimer l'évaluation
    await Rating.findByIdAndDelete(req.params.id);

    // Mettre à jour la note moyenne de l'utilisateur évalué
    const userRatings = await Rating.find({ toUserId: rating.toUserId });
    const averageRating = userRatings.length > 0 
      ? userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length 
      : 0;

    await User.findByIdAndUpdate(rating.toUserId, {
      rating: Math.round(averageRating * 10) / 10
    });

    res.json({
      success: true,
      message: 'Évaluation supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'évaluation'
    });
  }
});

module.exports = router; 