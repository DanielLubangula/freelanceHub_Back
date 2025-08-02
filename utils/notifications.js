const Notification = require('../models/Notification');
const { sendNotificationToUser, updateNotificationCount } = require('../socket');

const createNotification = async (userId, title, message, type = 'info', data = null) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      data,
      read: false
    });

    await notification.save();

    // Envoyer la notification en temps réel
    sendNotificationToUser(userId.toString(), notification);

    // Mettre à jour le compteur
    const unreadCount = await Notification.countDocuments({
      userId,
      read: false
    });
    updateNotificationCount(userId.toString(), unreadCount);

    return notification;
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    throw error;
  }
};

const createNotificationForMultipleUsers = async (userIds, title, message, type = 'info', data = null) => {
  try {
    const notifications = [];
    
    for (const userId of userIds) {
      const notification = await createNotification(userId, title, message, type, data);
      notifications.push(notification);
    }

    return notifications;
  } catch (error) {
    console.error('Erreur lors de la création des notifications multiples:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  createNotificationForMultipleUsers
};