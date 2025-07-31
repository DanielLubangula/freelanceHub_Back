// server.js
const express = require('express');
const dotenv = require('dotenv');
dotenv.config(); // Charger les variables d'environnement en premier

const cors = require('cors');
const path = require('path');
const http = require('http');
const session = require('express-session');
const passport = require('./config/passport');
const { initializeSocket } = require('./socket'); // Import du socket  

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Configuration des sessions pour Passport
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // En production, mettre à true avec HTTPS
}));

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Connexion à MongoDB
const connectDB = require('./config/db');
connectDB();

// Import des routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const applicationRoutes = require('./routes/applications');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const ratingRoutes = require('./routes/ratings');
 
// Middleware de gestion d'erreurs global
const errorHandler = (err, req, res, next) => {
  console.error('Erreur:', err.stack);
   
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID invalide'
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({  
      success: false,
      message: 'Cette ressource existe déjà'   
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ratings', ratingRoutes);
 
// Route de test  
app.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Serveur FreelanceLink démarré avec succès',
    timestamp: new Date().toISOString()
  });
});

// Route pour les fichiers uploadés
app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  res.sendFile(filePath);
});

// Middleware de gestion d'erreurs
// app.use(errorHandler);

// Gestion des routes non trouvées
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route non trouvée'
//   });
// });

// Création du serveur HTTP
const server = http.createServer(app);

// Initialisation de Socket.io
initializeSocket(server);

// Démarrage du serveur
const PORT = process.env.PORT || 5500;
server.listen(PORT, () => {
  console.log(`🚀 Serveur FreelanceLink démarré sur le port ${PORT}`);
  console.log(`📁 Dossier uploads: ${path.join(__dirname, 'uploads')}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
});
