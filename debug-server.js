const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

console.log('Démarrage du serveur de debug...');

try {
  console.log('1. Chargement des routes auth...');
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✓ Routes auth chargées');
} catch (error) {
  console.error('✗ Erreur routes auth:', error.message);
  process.exit(1);
}

try {
  console.log('2. Chargement des routes users...');
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  console.log('✓ Routes users chargées');
} catch (error) {
  console.error('✗ Erreur routes users:', error.message);
  process.exit(1);
}

try {
  console.log('3. Chargement des routes tasks...');
  const taskRoutes = require('./routes/tasks');
  app.use('/api/tasks', taskRoutes);
  console.log('✓ Routes tasks chargées');
} catch (error) {
  console.error('✗ Erreur routes tasks:', error.message);
  process.exit(1);
}

try {
  console.log('4. Chargement des routes applications...');
  const applicationRoutes = require('./routes/applications');
  app.use('/api/applications', applicationRoutes);
  console.log('✓ Routes applications chargées');
} catch (error) {
  console.error('✗ Erreur routes applications:', error.message);
  process.exit(1);
}

try {
  console.log('5. Chargement des routes payments...');
  const paymentRoutes = require('./routes/payments');
  app.use('/api/payments', paymentRoutes);
  console.log('✓ Routes payments chargées');
} catch (error) {
  console.error('✗ Erreur routes payments:', error.message);
  process.exit(1);
}

try {
  console.log('6. Chargement des routes notifications...');
  const notificationRoutes = require('./routes/notifications');
  app.use('/api/notifications', notificationRoutes);
  console.log('✓ Routes notifications chargées');
} catch (error) {
  console.error('✗ Erreur routes notifications:', error.message);
  process.exit(1);
}

try {
  console.log('7. Chargement des routes ratings...');
  const ratingRoutes = require('./routes/ratings');
  app.use('/api/ratings', ratingRoutes);
  console.log('✓ Routes ratings chargées');
} catch (error) {
  console.error('✗ Erreur routes ratings:', error.message);
  process.exit(1);
}

console.log('8. Démarrage du serveur...');
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`✓ Serveur démarré sur le port ${PORT}`);
});