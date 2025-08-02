const express = require('express');
const Application = require('../models/Application');
const Task = require('../models/Task');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { uploadMultiple, handleUploadError } = require('../middlewares/upload');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

// @route   POST /api/applications
// @desc    Postuler à une tâche
// @access  Private (agents uniquement)
router.post('/', authenticateToken, authorizeRoles('agent'), uploadMultiple, handleUploadError, async (req, res) => {
  try {
    const {
      taskId,
      message,
      proposedBudget,
      proposedDuration,
      coverLetter
    } = req.body;

    // Validation des données
    if (!taskId || !message) {
      return res.status(400).json({
        success: false,
        message: 'ID de tâche et message sont obligatoires'
      });
    }

    // Vérifier si la tâche existe et est ouverte
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    if (task.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Cette tâche n\'accepte plus de candidatures'
      });
    }

    // Vérifier si l'agent a déjà postulé
    const existingApplication = await Application.findOne({
      taskId,
      agentId: req.user._id
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà postulé à cette tâche'
      });
    }

    // Préparer les données de candidature
    const applicationData = {
      taskId,
      agentId: req.user._id,
      message,
      proposedBudget: proposedBudget ? parseFloat(proposedBudget) : undefined,
      proposedDuration,
      coverLetter
    };

    // Ajouter les fichiers attachés
    if (req.files && req.files.length > 0) {
      applicationData.attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        uploadedAt: new Date()
      }));
    }

    const application = new Application(applicationData);
    await application.save();

    // Mettre à jour le compteur de candidatures de la tâche
    await Task.findByIdAndUpdate(taskId, {
      $inc: { applicationsCount: 1 }
    });

    // Créer une notification pour l'entreprise
    await createNotification(
      task.createdBy,
      'Nouvelle candidature',
      `${req.user.name} a postulé pour votre tâche "${task.title}"`,
      'info',
      {
        taskId: taskId,
        applicationId: application._id
      }
    );

    // Populate les données
    await application.populate('agentId', 'name email avatar rating skills');
    await application.populate('taskId', 'title budget');

    res.status(201).json({
      success: true,
      message: 'Candidature envoyée avec succès',
      data: { application }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la candidature:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la candidature'
    });
  }
});

// @route   GET /api/applications/my-applications
// @desc    Obtenir les candidatures de l'utilisateur connecté
// @access  Private (agents uniquement)
router.get('/my-applications', authenticateToken, authorizeRoles('agent'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { agentId: req.user._id };
    if (status) {
      filter.status = status;
    }

    const applications = await Application.find(filter)
      .populate('taskId', 'title budget status createdBy')
      .populate('taskId.createdBy', 'name email companyName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(filter);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des candidatures:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des candidatures'
    });
  }
});

// @route   GET /api/applications/task/:taskId
// @desc    Obtenir toutes les candidatures pour une tâche
// @access  Private (propriétaire de la tâche ou admin)
router.get('/task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Vérifier si la tâche existe
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    // Vérifier les permissions
    const isOwner = task.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Construire le filtre
    const filter = { taskId };
    if (status) {
      filter.status = status;
    }

    const applications = await Application.find(filter)
      .populate('agentId', 'name email avatar rating skills bio completedTasks')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(filter);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des candidatures:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des candidatures'
    });
  }
});

// @route   GET /api/applications/:id
// @desc    Obtenir une candidature spécifique
// @access  Private (propriétaire de la candidature, propriétaire de la tâche ou admin)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('agentId', 'name email avatar rating skills bio')
      .populate('taskId', 'title budget status createdBy')
      .populate('taskId.createdBy', 'name email companyName');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier les permissions
    const isApplicant = application.agentId._id.toString() === req.user._id.toString();
    const isTaskOwner = application.taskId.createdBy._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isApplicant && !isTaskOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.json({
      success: true,
      data: { application }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la candidature:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la candidature'
    });
  }
});

// @route   PUT /api/applications/:id/status
// @desc    Mettre à jour le statut d'une candidature
// @access  Private (propriétaire de la tâche ou admin)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status || !['accepted', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const application = await Application.findById(req.params.id)
      .populate('taskId', 'title createdBy status assignedTo')
      .populate('agentId', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier les permissions
    const isTaskOwner = application.taskId.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isTaskOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier que la tâche est encore ouverte
    if (application.taskId.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Cette tâche n\'accepte plus de candidatures'
      });
    }

    // Mettre à jour le statut
    application.status = status;
    application.respondedAt = new Date();
    
    if (notes) {
      application.enterpriseNotes = notes;
    }

    await application.save();

    // Si la candidature est acceptée, assigner l'agent à la tâche
    if (status === 'accepted') {
      await Task.findByIdAndUpdate(application.taskId._id, {
        status: 'assigned',
        assignedTo: [application.agentId._id]
      });
    }

    // Créer une notification pour l'agent
    const notificationMessage = status === 'accepted' 
      ? `Votre candidature pour "${application.taskId.title}" a été acceptée !`
      : `Votre candidature pour "${application.taskId.title}" a été rejetée.`;

    await createNotification(
      application.agentId._id,
      status === 'accepted' ? 'Candidature acceptée' : 'Candidature rejetée',
      notificationMessage,
      status === 'accepted' ? 'success' : 'warning',
      {
        taskId: application.taskId._id,
        applicationId: application._id
      }
    );

    res.json({
      success: true,
      message: `Candidature ${status === 'accepted' ? 'acceptée' : 'rejetée'} avec succès`,
      data: { application }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
});

// @route   PUT /api/applications/:id
// @desc    Mettre à jour une candidature
// @access  Private (propriétaire de la candidature)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { message, proposedBudget, proposedDuration, coverLetter } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de la candidature
    if (application.agentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier que la candidature peut être modifiée
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier une candidature traitée'
      });
    }

    // Mettre à jour les champs
    if (message) application.message = message;
    if (proposedBudget) application.proposedBudget = parseFloat(proposedBudget);
    if (proposedDuration) application.proposedDuration = proposedDuration;
    if (coverLetter) application.coverLetter = coverLetter;

    await application.save();

    res.json({
      success: true,
      message: 'Candidature mise à jour avec succès',
      data: { application }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la candidature:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la candidature'
    });
  }
});

// @route   DELETE /api/applications/:id
// @desc    Supprimer une candidature
// @access  Private (propriétaire de la candidature)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('taskId', 'title applicationsCount');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de la candidature
    if (application.agentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier que la candidature peut être supprimée
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une candidature traitée'
      });
    }

    // Supprimer la candidature
    await Application.findByIdAndDelete(req.params.id);

    // Mettre à jour le compteur de candidatures de la tâche
    if (application.taskId) {
      await Task.findByIdAndUpdate(application.taskId._id, {
        $inc: { applicationsCount: -1 }
      });
    }

    res.json({
      success: true,
      message: 'Candidature supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la candidature:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la candidature'
    });
  }
});

module.exports = router; 