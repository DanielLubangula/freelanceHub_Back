const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const passport = require('../config/passport');
const User = require('../models/User');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId, userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Inscription d'un nouvel utilisateur
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, companyName, sector, bio, skills } = req.body;

    // Validation des données
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    if (!['agent', 'enterprise'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
      });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Créer l'utilisateur
    const userData = {
      name,
      email,
      password,
      role
    };

    // Ajouter les champs spécifiques selon le rôle
    if (role === 'enterprise') {
      userData.companyName = companyName || '';
      userData.sector = sector || '';
    } else if (role === 'agent') {
      userData.bio = bio || '';
      userData.skills = skills || [];
    }

    const user = new User(userData);
    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    // Retourner les données utilisateur (sans mot de passe)
    const userResponse = user.toPublicJSON();

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Connexion utilisateur
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation des données
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé'
      });
    }

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    // Retourner les données utilisateur
    const userResponse = user.toPublicJSON();

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Obtenir les informations de l'utilisateur connecté
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      data: {
        user
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

// @route   POST /api/auth/logout
// @desc    Déconnexion (côté client)
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // En production, vous pourriez ajouter le token à une liste noire
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Rafraîchir le token
// @access  Private
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Générer un nouveau token
    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rafraîchissement du token'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Changer le mot de passe
// @access  Private
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Ancien et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    const user = await User.findById(req.user._id);
    
    // Vérifier l'ancien mot de passe
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Ancien mot de passe incorrect'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
});

// @route   GET /api/auth/google
// @desc    Initier l'authentification Google
// @access  Public
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Authentification Google non configurée'
    });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// @route   GET /api/auth/google/callback
// @desc    Callback Google OAuth
// @access  Public
router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentification Google non configurée`);
  }
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Erreur d\'authentification Google:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(err.message || 'Erreur lors de l\'authentification')}`);
    }
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentification échouée`);
    }
    req.user = user;
    next();
  })(req, res, next);
}, async (req, res) => {
    try {
      const { user, isNewUser } = req.user;
      
      // Vérifier que l'utilisateur a les champs requis de base
      if (!user || !user._id || !user.name || !user.email) {
        throw new Error('Données utilisateur incomplètes');
      }
      
      // Générer le token JWT
      const token = generateToken(user._id);
      
      // Préparer les données utilisateur
      const userResponse = user.toPublicJSON();
      
      // Rediriger vers le frontend avec les données
      const userData = encodeURIComponent(JSON.stringify(userResponse));
      const redirectUrl = `${process.env.FRONTEND_URL}/?token=${token}&isNewUser=${isNewUser}&user=${userData}`;
      
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('Erreur lors du callback Google:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(error.message || 'Erreur lors de l\'authentification')}`);
    }
  }
);

// @route   POST /api/auth/google/success
// @desc    Route pour récupérer les données après authentification Google
// @access  Public
router.post('/google/success', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token manquant'
      });
    }
    
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Authentification Google réussie',
      data: {
        user: user.toPublicJSON(),
        token,
        isNewUser: user.createdAt.getTime() === user.updatedAt.getTime()
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification du token Google:', error);
    res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
});

// @route   POST /api/auth/complete-profile
// @desc    Compléter le profil après authentification Google
// @access  Private
router.post('/complete-profile', authenticateToken, async (req, res) => {
  try {
    const { 
      role, 
      // Champs communs
      location, 
      phone,
      // Champs agent
      bio, 
      skills, 
      paymentMethod, 
      paymentNumber,
      // Champs entreprise
      companyName, 
      sector, 
      description, 
      website 
    } = req.body;
    
    if (!role || !['agent', 'enterprise'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle valide requis (agent ou enterprise)'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Mettre à jour le rôle
    user.role = role;
    
    // Champs communs
    if (location !== undefined) user.location = location;
    if (phone !== undefined) user.phone = phone;
    
    // Champs spécifiques selon le rôle
    if (role === 'enterprise') {
      if (companyName !== undefined) user.companyName = companyName;
      if (sector !== undefined) user.sector = sector;
      if (description !== undefined) user.description = description;
      if (website !== undefined) user.website = website;
    } else if (role === 'agent') {
      if (bio !== undefined) user.bio = bio;
      if (skills !== undefined) user.skills = skills;
      if (paymentMethod !== undefined) user.paymentMethod = paymentMethod;
      if (paymentNumber !== undefined) user.paymentNumber = paymentNumber;
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profil complété avec succès',
      data: {
        user: user.toPublicJSON()
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la complétion du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la complétion du profil'
    });
  }
});

module.exports = router; 