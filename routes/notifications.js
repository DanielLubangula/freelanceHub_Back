const express = require('express');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Obtenir toutes les notifications de l'utilisateur connecté
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, read } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construire le filtre
    const filter = { userId: req.user._id };

    if (type) {
      filter.type = type;
    }

    if (read !== undefined) {
      filter.read = read === 'true';
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        unreadCount
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications'
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Obtenir le nombre de notifications non lues
// @access  Private
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false
    });

    res.json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    console.error('Erreur lors du comptage des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du comptage des notifications'
    });
  }
});

// @route   GET /api/notifications/:id
// @desc    Obtenir une notification spécifique
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de la notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.json({
      success: true,
      data: { notification }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la notification'
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Marquer toutes les notifications comme lues
// @access  Private
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    // Mettre à jour le compteur en temps réel
    const { updateNotificationCount } = require('../socket');
    updateNotificationCount(req.user._id.toString(), 0);

    res.json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des notifications'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Marquer une notification comme lue
// @access  Private
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de la notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Marquer comme lue seulement si pas déjà lue
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();

      // Mettre à jour le compteur en temps réel
      const { updateNotificationCount } = require('../socket');
      const unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        read: false
      });
      updateNotificationCount(req.user._id.toString(), unreadCount);
    }

    res.json({
      success: true,
      message: 'Notification marquée comme lue',
      data: { notification }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la notification'
    });
  }
});

// @route   DELETE /api/notifications/all
// @desc    Supprimer toutes les notifications de l'utilisateur
// @access  Private
router.delete('/all', authenticateToken, async (req, res) => {
  try {
    const { type, read } = req.query;

    // Construire le filtre
    const filter = { userId: req.user._id };

    if (type) {
      filter.type = type;
    }

    if (read !== undefined) {
      filter.read = read === 'true';
    }

    const result = await Notification.deleteMany(filter);

    // Mettre à jour le compteur en temps réel
    try {
      const { updateNotificationCount } = require('../socket');
      const unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        read: false
      });
      updateNotificationCount(req.user._id.toString(), unreadCount);
    } catch (socketError) {
      console.error('Erreur lors de la mise à jour du compteur via socket:', socketError);
      // Ne pas faire échouer la requête si le socket échoue
    }

    res.json({
      success: true,
      message: `${result.deletedCount} notification(s) supprimée(s) avec succès`
    });

  } catch (error) {
    console.error('Erreur lors de la suppression des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression des notifications'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Supprimer une notification
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de la notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const wasUnread = !notification.read;
    await Notification.findByIdAndDelete(req.params.id);

    // Mettre à jour le compteur en temps réel si la notification était non lue
    if (wasUnread) {
      const { updateNotificationCount } = require('../socket');
      const unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        read: false
      });
      updateNotificationCount(req.user._id.toString(), unreadCount);
    }

    res.json({
      success: true,
      message: 'Notification supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la notification'
    });
  }
});

module.exports = router; 