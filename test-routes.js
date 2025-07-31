const express = require('express');
const app = express();

// Test des routes une par une pour identifier le problème
try {
  console.log('Test des routes auth...');
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✓ Routes auth OK');
} catch (error) {
  console.error('✗ Erreur routes auth:', error.message);
}

try {
  console.log('Test des routes tasks...');
  const taskRoutes = require('./routes/tasks');
  app.use('/api/tasks', taskRoutes);
  console.log('✓ Routes tasks OK');
} catch (error) {
  console.error('✗ Erreur routes tasks:', error.message);
}

try {
  console.log('Test des routes applications...');
  const applicationRoutes = require('./routes/applications');
  app.use('/api/applications', applicationRoutes);
  console.log('✓ Routes applications OK');
} catch (error) {
  console.error('✗ Erreur routes applications:', error.message);
}

try {
  console.log('Test des routes payments...');
  const paymentRoutes = require('./routes/payments');
  app.use('/api/payments', paymentRoutes);
  console.log('✓ Routes payments OK');
} catch (error) {
  console.error('✗ Erreur routes payments:', error.message);
}

try {
  console.log('Test des routes notifications...');
  const notificationRoutes = require('./routes/notifications');
  app.use('/api/notifications', notificationRoutes);
  console.log('✓ Routes notifications OK');
} catch (error) {
  console.error('✗ Erreur routes notifications:', error.message);
}

try {
  console.log('Test des routes users...');
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  console.log('✓ Routes users OK');
} catch (error) {
  console.error('✗ Erreur routes users:', error.message);
}

try {
  console.log('Test des routes ratings...');
  const ratingRoutes = require('./routes/ratings');
  app.use('/api/ratings', ratingRoutes);
  console.log('✓ Routes ratings OK');
} catch (error) {
  console.error('✗ Erreur routes ratings:', error.message);
}

console.log('Test terminé');