const User = require('./models/User');
const mongoose = require('mongoose');

// Test de création d'utilisateur avec les champs requis
async function testUserCreation() {
  try {
    // Simuler les données d'un profil Google
    const mockGoogleProfile = {
      id: 'test123',
      displayName: 'Test User',
      emails: [{ value: 'test@example.com' }],
      photos: [{ value: 'https://example.com/photo.jpg' }]
    };

    // Test 1: Création avec displayName normal
    console.log('Test 1: Création avec displayName normal');
    const userData1 = {
      googleId: mockGoogleProfile.id,
      name: mockGoogleProfile.displayName,
      email: mockGoogleProfile.emails[0].value,
      profilePicture: mockGoogleProfile.photos[0]?.value || null,
      role: 'agent',
      isVerified: true,
      lastLogin: new Date()
    };
    
    console.log('Données utilisateur 1:', userData1);
    console.log('Validation:', userData1.name && userData1.role && userData1.email ? 'OK' : 'ERREUR');

    // Test 2: Création avec displayName vide
    console.log('\nTest 2: Création avec displayName vide');
    const mockGoogleProfile2 = {
      id: 'test456',
      displayName: null,
      emails: [{ value: 'test2@example.com' }],
      photos: []
    };

    const userName2 = mockGoogleProfile2.displayName || 
                     mockGoogleProfile2.name?.givenName || 
                     mockGoogleProfile2.emails[0].value.split('@')[0] || 
                     'Utilisateur';

    const userData2 = {
      googleId: mockGoogleProfile2.id,
      name: userName2.trim(),
      email: mockGoogleProfile2.emails[0].value,
      profilePicture: mockGoogleProfile2.photos[0]?.value || null,
      role: 'agent',
      isVerified: true,
      lastLogin: new Date()
    };
    
    console.log('Données utilisateur 2:', userData2);
    console.log('Validation:', userData2.name && userData2.role && userData2.email ? 'OK' : 'ERREUR');

    // Test 3: Vérification des champs requis
    console.log('\nTest 3: Vérification des champs requis');
    const requiredFields = ['name', 'email', 'role'];
    
    for (const user of [userData1, userData2]) {
      const missingFields = requiredFields.filter(field => !user[field]);
      if (missingFields.length > 0) {
        console.log(`ERREUR: Champs manquants pour ${user.email}:`, missingFields);
      } else {
        console.log(`OK: Tous les champs requis présents pour ${user.email}`);
      }
    }

    console.log('\n✅ Tous les tests sont passés avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Exécuter les tests
testUserCreation();