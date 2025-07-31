const mongoose = require('mongoose');
const User = require('./models/User');

// Script pour vérifier et corriger les utilisateurs existants
async function checkAndFixUsers() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/netwebback');
    console.log('✅ Connecté à MongoDB');

    // Trouver tous les utilisateurs avec des champs manquants
    const usersWithMissingFields = await User.find({
      $or: [
        { name: { $exists: false } },
        { name: '' },
        { name: null },
        { role: { $exists: false } },
        { role: '' },
        { role: null }
      ]
    });

    console.log(`\n📊 Trouvé ${usersWithMissingFields.length} utilisateur(s) avec des champs manquants:`);

    for (const user of usersWithMissingFields) {
      console.log(`\n👤 Utilisateur: ${user.email}`);
      console.log(`   - ID: ${user._id}`);
      console.log(`   - Name: "${user.name}" (manquant: ${!user.name})`);
      console.log(`   - Role: "${user.role}" (manquant: ${!user.role})`);
      console.log(`   - Google ID: ${user.googleId || 'Non défini'}`);

      // Corriger les champs manquants
      let updated = false;

      if (!user.name || user.name.trim() === '') {
        user.name = user.email.split('@')[0] || 'Utilisateur';
        updated = true;
        console.log(`   ✏️  Name corrigé: "${user.name}"`);
      }

      if (!user.role) {
        user.role = 'agent';
        updated = true;
        console.log(`   ✏️  Role corrigé: "${user.role}"`);
      }

      if (updated) {
        try {
          await user.save();
          console.log(`   ✅ Utilisateur mis à jour avec succès`);
        } catch (error) {
          console.log(`   ❌ Erreur lors de la mise à jour:`, error.message);
        }
      }
    }

    // Vérifier que tous les utilisateurs ont maintenant les champs requis
    const stillProblematic = await User.find({
      $or: [
        { name: { $exists: false } },
        { name: '' },
        { name: null },
        { role: { $exists: false } },
        { role: '' },
        { role: null }
      ]
    });

    if (stillProblematic.length === 0) {
      console.log('\n🎉 Tous les utilisateurs ont maintenant les champs requis!');
    } else {
      console.log(`\n⚠️  Il reste ${stillProblematic.length} utilisateur(s) avec des problèmes`);
    }

    // Test de création d'un nouvel utilisateur Google
    console.log('\n🧪 Test de création d\'un utilisateur Google...');
    
    const testGoogleUser = {
      googleId: 'test_' + Date.now(),
      name: 'Test User Google',
      email: `test_${Date.now()}@gmail.com`,
      role: 'agent',
      isVerified: true,
      lastLogin: new Date()
    };

    try {
      const newUser = new User(testGoogleUser);
      await newUser.save();
      console.log('✅ Test de création réussi');
      
      // Nettoyer le test
      await User.deleteOne({ _id: newUser._id });
      console.log('🧹 Utilisateur de test supprimé');
    } catch (error) {
      console.log('❌ Test de création échoué:', error.message);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Déconnecté de MongoDB');
  }
}

// Charger les variables d'environnement
require('dotenv').config();

// Exécuter le script
checkAndFixUsers();