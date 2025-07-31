const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const Rating = require('../models/Rating');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { uploadSingle, handleUploadError } = require('../middlewares/upload');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Obtenir le profil de l'utilisateur connecté
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Mettre à jour le profil de l'utilisateur connecté
// @access  Private
router.put('/profile', authenticateToken, uploadSingle, handleUploadError, async (req, res) => {
  try {
    const {
      name,
      bio,
      skills,
      location,
      phone,
      website,
      companyName,
      sector,
      description,
      paymentMethod,
      paymentNumber
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour les champs communs
    if (name) user.name = name;
    if (location) user.location = location;
    if (phone) user.phone = phone;
    if (website) user.website = website;

    // Mettre à jour les champs spécifiques selon le rôle
    if (user.role === 'agent') {
      if (bio) user.bio = bio;
      if (skills) {
        user.skills = skills.split(',').map(skill => skill.trim());
      }
      if (paymentMethod) user.paymentMethod = paymentMethod;
      if (paymentNumber) user.paymentNumber = paymentNumber;
    } else if (user.role === 'enterprise') {
      if (companyName) user.companyName = companyName;
      if (sector) user.sector = sector;
      if (description) user.description = description;
    }

    // Ajouter l'avatar si fourni
    if (req.file) {
      user.avatar = req.file.path;
    }

    await user.save();

    const userResponse = user.toPublicJSON();

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// @route   GET /api/users/agents
// @desc    Obtenir la liste des agents avec filtres
// @access  Public
router.get('/agents', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      skills,
      rating,
      search,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construire le filtre
    const filter = { role: 'agent', isActive: true };

    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      filter.skills = { $in: skillsArray };
    }

    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ];
    }

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const agents = await User.find(filter)
      .select('-password -email -phone -paymentNumber -isActive -lastLogin')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        agents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des agents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des agents'
    });
  }
});

// @route   GET /api/users/enterprises
// @desc    Obtenir la liste des entreprises avec filtres
// @access  Public
router.get('/enterprises', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sector,
      rating,
      search,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construire le filtre
    const filter = { role: 'enterprise', isActive: true };

    if (sector) {
      filter.sector = { $regex: sector, $options: 'i' };
    }

    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const enterprises = await User.find(filter)
      .select('-password -email -phone -isActive -lastLogin')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        enterprises,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des entreprises:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des entreprises'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Obtenir le profil public d'un utilisateur
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email -phone -paymentNumber -isActive -lastLogin');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les statistiques de l'utilisateur
    const stats = await getUserStats(req.params.id);

    res.json({
      success: true,
      data: {
        user,
        stats
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

// @route   GET /api/users/:id/tasks
// @desc    Obtenir les tâches d'un utilisateur
// @access  Public
router.get('/:id/tasks', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const filter = {};
    if (user.role === 'enterprise') {
      filter.createdBy = req.params.id;
    } else {
      filter.assignedTo = req.params.id;
    }

    if (status) {
      filter.status = status;
    }

    const tasks = await Task.find(filter)
      .populate('createdBy', 'name email avatar companyName')
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

// @route   GET /api/users/:id/ratings
// @desc    Obtenir les évaluations d'un utilisateur
// @access  Public
router.get('/:id/ratings', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const ratings = await Rating.find({ toUserId: req.params.id })
      .populate('fromUserId', 'name email avatar companyName')
      .populate('taskId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rating.countDocuments({ toUserId: req.params.id });

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

// Fonction utilitaire pour obtenir les statistiques d'un utilisateur
async function getUserStats(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    let stats = {};

    if (user.role === 'agent') {
      // Statistiques pour les agents
      const completedTasks = await Task.countDocuments({
        assignedTo: userId,
        status: 'completed'
      });

      const totalEarnings = await Payment.aggregate([
        {
          $match: {
            payeeId: userId,
            status: 'confirmed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$netAmount' }
          }
        }
      ]);

      const averageRating = await Rating.aggregate([
        {
          $match: { toUserId: userId }
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        }
      ]);

      stats = {
        completedTasks,
        totalEarnings: totalEarnings[0]?.total || 0,
        averageRating: averageRating[0]?.average || 0,
        totalRatings: averageRating[0]?.count || 0
      };
    } else if (user.role === 'enterprise') {
      // Statistiques pour les entreprises
      const postedTasks = await Task.countDocuments({
        createdBy: userId
      });

      const totalSpent = await Payment.aggregate([
        {
          $match: {
            payerId: userId,
            status: 'confirmed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const averageRating = await Rating.aggregate([
        {
          $match: { toUserId: userId }
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        }
      ]);

      stats = {
        postedTasks,
        totalSpent: totalSpent[0]?.total || 0,
        averageRating: averageRating[0]?.average || 0,
        totalRatings: averageRating[0]?.count || 0
      };
    }

    return stats;
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    return null;
  }
}

module.exports = router; 