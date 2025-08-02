const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;
const connectedUsers = new Map();

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  // Middleware d'authentification pour Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Token manquant'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('Utilisateur non trouvé'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Utilisateur connecté: ${socket.user.name} (${socket.userId})`);
    
    // Stocker la connexion
    connectedUsers.set(socket.userId, socket.id);

    // Rejoindre une room personnelle
    socket.join(`user_${socket.userId}`);

    socket.on('disconnect', () => {
      console.log(`Utilisateur déconnecté: ${socket.user.name}`);
      connectedUsers.delete(socket.userId);
    });
  });

  return io;
};

// Fonction pour envoyer une notification à un utilisateur spécifique
const sendNotificationToUser = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('newNotification', notification);
  }
};

// Fonction pour mettre à jour le compteur de notifications
const updateNotificationCount = (userId, count) => {
  if (io) {
    io.to(`user_${userId}`).emit('notificationCountUpdate', count);
  }
};

module.exports = {
  initializeSocket,
  sendNotificationToUser,
  updateNotificationCount,
  getIO: () => io
};