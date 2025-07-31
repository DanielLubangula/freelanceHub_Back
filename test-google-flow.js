// Test du flux d'authentification Google
console.log('🧪 Test du flux d\'authentification Google\n');

// Simuler les données d'un profil Google
const mockProfile = {
  id: 'google123456',
  displayName: 'John Doe',
  emails: [{ value: 'john.doe@gmail.com' }],
  photos: [{ value: 'https://lh3.googleusercontent.com/photo.jpg' }]
};

console.log('📋 Données du profil Google simulé:');
console.log('- ID:', mockProfile.id);
console.log('- Nom:', mockProfile.displayName);
console.log('- Email:', mockProfile.emails[0].value);
console.log('- Photo:', mockProfile.photos[0].value);

// Test de génération du nom d'utilisateur
const userName = mockProfile.displayName || 
                mockProfile.name?.givenName || 
                mockProfile.emails[0].value.split('@')[0] || 
                'Utilisateur';

console.log('\n✅ Nom d\'utilisateur généré:', userName);

// Test de validation des champs requis
const userData = {
  googleId: mockProfile.id,
  name: userName.trim(),
  email: mockProfile.emails[0].value,
  profilePicture: mockProfile.photos[0]?.value || null,
  role: 'agent',
  isVerified: true,
  lastLogin: new Date()
};

console.log('\n📊 Données utilisateur à créer:');
console.log('- Name:', userData.name, '(requis:', !!userData.name, ')');
console.log('- Email:', userData.email, '(requis:', !!userData.email, ')');
console.log('- Role:', userData.role, '(requis:', !!userData.role, ')');
console.log('- Google ID:', userData.googleId);

// Validation finale
const requiredFields = ['name', 'email', 'role'];
const missingFields = requiredFields.filter(field => !userData[field]);

if (missingFields.length === 0) {
  console.log('\n🎉 Validation réussie - Tous les champs requis sont présents!');
} else {
  console.log('\n❌ Validation échouée - Champs manquants:', missingFields);
}

// Test de l'URL de redirection
const token = 'fake-jwt-token-123';
const isNewUser = true;
const userResponse = { ...userData, _id: 'fake-id-123' };
const frontendUrl = 'http://localhost:5173';

const userData_encoded = encodeURIComponent(JSON.stringify(userResponse));
const redirectUrl = `${frontendUrl}/?token=${token}&isNewUser=${isNewUser}&user=${userData_encoded}`;

console.log('\n🔗 URL de redirection générée:');
console.log(redirectUrl);

console.log('\n✅ Test terminé avec succès!');