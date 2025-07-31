const express = require('express');
const Task = require('../models/Task');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const { authenticateToken, authorizeRoles, authorizeTaskAccess } = require('../middlewares/auth');
const { uploadSingle, handleUploadError } = require('../middlewares/upload');

const router = express.Router();

// @route   GET /api/tasks
// @desc    Obtenir toutes les tâches avec filtres
// @access  Public (pour les tâches ouvertes), Private (pour les tâches privées)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      skills,
      budgetMin,
      budgetMax,
      search,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construire le filtre
    const filter = {};

    // Filtrer par statut
    if (status) {
      filter.status = status;
    } else {
      // Par défaut, ne montrer que les tâches ouvertes aux visiteurs non connectés
      if (!req.headers.authorization) {
        filter.status = 'open';
      }
    }

    // Filtrer par compétences
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      filter.skills = { $in: skillsArray };
    }

    // Filtrer par budget
    if (budgetMin || budgetMax) {
      filter.budget = {};
      if (budgetMin) filter.budget.$gte = parseFloat(budgetMin);
      if (budgetMax) filter.budget.$lte = parseFloat(budgetMax);
    }

    // Recherche textuelle
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtrer par catégorie
    if (category) {
      filter.category = category;
    }

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les tâches
    const tasks = await Task.find(filter)
      .populate('createdBy', 'name email avatar companyName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Compter le total
    const total = await Task.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des tâches:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches'
    });
  }
});

// @route   POST /api/tasks
// @desc    Créer une nouvelle tâche
// @access  Private (entreprises uniquement)
router.post('/', authenticateToken, authorizeRoles('enterprise'), uploadSingle, handleUploadError, async (req, res) => {
  try {
    const {
      title,
      description,
      budget,
      duration,
      skills,
      requiredProofs,
      deadline,
      category,
      priority,
      isUrgent,
      location,
      isRemote,
      tags
    } = req.body;

    // Validation des données
    if (!title || !description || !budget || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Titre, description, budget et durée sont obligatoires'
      });
    }

    if (parseFloat(budget) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le budget doit être supérieur à 0'
      });
    }

    // Préparer les données de la tâche
    const taskData = {
      title,
      description,
      budget: parseFloat(budget),
      duration,
      skills: skills ? skills.split(',').map(skill => skill.trim()) : [],
      requiredProofs: requiredProofs ? requiredProofs.split(',').map(proof => proof.trim()) : [],
      createdBy: req.user._id,
      category: category || 'general',
      priority: priority || 'medium',
      isUrgent: isUrgent === 'true',
      location: location || '',
      isRemote: isRemote !== 'false',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    };

    // Ajouter la date limite si fournie
    if (deadline) {
      taskData.deadline = new Date(deadline);
    }

    // Ajouter les fichiers attachés
    if (req.file) {
      taskData.attachments = [{
        filename: req.file.originalname,
        path: req.file.path,
        uploadedAt: new Date()
      }];
    }

    const task = new Task(taskData);
    await task.save();

    // Mettre à jour le compteur de tâches de l'entreprise
    await require('../models/User').findByIdAndUpdate(
      req.user._id,
      { $inc: { postedTasks: 1 } }
    );

    // Créer une notification
    const notification = new Notification({
      userId: req.user._id,
      title: 'Tâche publiée',
      message: `Votre tâche "${title}" a été publiée avec succès`,
      type: 'success',
      relatedTaskId: task._id
    });
    await notification.save();

    // Populate les données de l'utilisateur
    await task.populate('createdBy', 'name email avatar companyName');

    res.status(201).json({
      success: true,
      message: 'Tâche créée avec succès',
      data: { task }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la tâche'
    });
  }
});

// @route   GET /api/tasks/my-tasks
// @desc    Obtenir les tâches de l'utilisateur connecté
// @access  Private
router.get('/my-tasks', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { createdBy: req.user._id };
    if (status) {
      filter.status = status;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des tâches:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches'
    });
  }
});

// @route   GET /api/tasks/assigned-tasks
// @desc    Obtenir les tâches assignées à l'utilisateur connecté
// @access  Private (agents uniquement)
router.get('/assigned-tasks', authenticateToken, authorizeRoles('agent'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { assignedTo: req.user._id };
    if (status) {
      filter.status = status;
    }

    const tasks = await Task.find(filter)
      .populate('createdBy', 'name email avatar companyName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des tâches assignées:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches assignées'
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    Obtenir une tâche spécifique
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email avatar companyName rating')
      .populate('assignedTo', 'name email avatar rating');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    // Incrémenter le compteur de vues
    task.views += 1;
    await task.save();

    res.json({
      success: true,
      data: { task }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la tâche'
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Mettre à jour une tâche
// @access  Private (propriétaire ou admin)
router.put('/:id', authenticateToken, authorizeTaskAccess, uploadSingle, handleUploadError, async (req, res) => {
  try {
    const task = req.task;
    const isOwner = task.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const updateData = { ...req.body };

    // Supprimer les champs non modifiables
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.views;
    delete updateData.applicationsCount;

    // Traiter les champs spéciaux
    if (updateData.skills) {
      updateData.skills = updateData.skills.split(',').map(skill => skill.trim());
    }

    if (updateData.requiredProofs) {
      updateData.requiredProofs = updateData.requiredProofs.split(',').map(proof => proof.trim());
    }

    if (updateData.tags) {
      updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
    }

    if (updateData.deadline) {
      updateData.deadline = new Date(updateData.deadline);
    }

    // Ajouter les nouveaux fichiers
    if (req.file) {
      updateData.attachments = [
        ...(task.attachments || []),
        {
          filename: req.file.originalname,
          path: req.file.path,
          uploadedAt: new Date()
        }
      ];
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email avatar companyName');

    res.json({
      success: true,
      message: 'Tâche mise à jour avec succès',
      data: { task: updatedTask }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la tâche'
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Supprimer une tâche
// @access  Private (propriétaire ou admin)
router.delete('/:id', authenticateToken, authorizeTaskAccess, async (req, res) => {
  try {
    const task = req.task;
    const isOwner = task.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier si la tâche peut être supprimée
    if (task.status !== 'open' && task.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une tâche en cours ou terminée'
      });
    }

    // Supprimer les candidatures associées
    await Application.deleteMany({ taskId: task._id });

    // Supprimer les notifications associées
    await Notification.deleteMany({ relatedTaskId: task._id });

    // Supprimer la tâche
    await Task.findByIdAndDelete(task._id);

    // Mettre à jour le compteur de tâches de l'entreprise
    if (isOwner) {
      await require('../models/User').findByIdAndUpdate(
        req.user._id,
        { $inc: { postedTasks: -1 } }
      );
    }

    res.json({
      success: true,
      message: 'Tâche supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la tâche'
    });
  }
});

module.exports = router; 