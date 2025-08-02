// Script pour nettoyer les notifications indésirables
const mongoose = require('mongoose');
const Notification = require('./models/Notification');

const cleanupNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelancehub');
    
    // Supprimer toutes les notifications "Tâche publiée"
    const result = await Notification.deleteMany({
      title: 'Tâche publiée'
    });
    
    console.log(`${result.deletedCount} notifications supprimées`);
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
};

cleanupNotifications();