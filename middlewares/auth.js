const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token d\'accès requis' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Compte désactivé' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token invalide' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expiré' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur d\'authentification' 
    });
  }
};

// Middleware pour vérifier les rôles spécifiques
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentification requise' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé pour ce rôle' 
      });
    }

    next();
  };
};

// Middleware pour vérifier si l'utilisateur est propriétaire de la ressource
const authorizeOwner = (model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ 
          success: false, 
          message: 'Ressource non trouvée' 
        });
      }

      // Vérifier si l'utilisateur est propriétaire ou admin
      const isOwner = resource.createdBy && resource.createdBy.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accès non autorisé' 
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la vérification des permissions' 
      });
    }
  };
};

// Middleware pour vérifier si l'utilisateur peut accéder à une tâche
const authorizeTaskAccess = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const Task = require('../models/Task');
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tâche non trouvée' 
      });
    }

    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo && task.assignedTo.includes(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAssigned && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé à cette tâche' 
      });
    }

    req.task = task;
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la vérification des permissions' 
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeOwner,
  authorizeTaskAccess
}; 