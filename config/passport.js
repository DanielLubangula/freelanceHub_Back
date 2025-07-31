const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Vérifier que les variables d'environnement Google sont définies
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Vérifier que les données essentielles sont présentes
    if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
      return done(new Error('Email non fourni par Google'), null);
    }
    
    // Préparer le nom d'utilisateur à partir du profil Google
    const userName = (profile.displayName || 
                     profile.name?.givenName || 
                     profile.name?.familyName || 
                     profile.emails[0].value.split('@')[0] || 
                     'Utilisateur').trim();
    
    // Vérifier si l'utilisateur existe déjà avec ce Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      // Utilisateur existant avec Google ID - vérifier et corriger les champs requis
      let needsUpdate = false;
      
      if (!user.name || user.name.trim() === '') {
        user.name = userName;
        needsUpdate = true;
      }
      // Le rôle sera défini lors de la sélection
      
      user.lastLogin = new Date();
      user.profilePicture = profile.photos[0]?.value || user.profilePicture;
      
      if (needsUpdate) {
        console.log('Mise à jour des champs manquants pour l\'utilisateur:', user.email);
      }
      
      await user.save();
      return done(null, { user, isNewUser: false });
    }

    // Vérifier si un utilisateur existe avec le même email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Lier le compte Google à l'utilisateur existant
      user.googleId = profile.id;
      user.profilePicture = profile.photos[0]?.value || user.profilePicture;
      user.lastLogin = new Date();
      
      // S'assurer que les champs requis sont présents
      let needsUpdate = false;
      
      if (!user.name || user.name.trim() === '') {
        user.name = userName;
        needsUpdate = true;
      }
      // Le rôle sera défini lors de la sélection
      
      if (needsUpdate) {
        console.log('Correction des champs manquants pour l\'utilisateur existant:', user.email);
      }
      
      await user.save();
      return done(null, { user, isNewUser: false });
    }

    // Créer un nouveau utilisateur
    const newUserData = {
      googleId: profile.id,
      name: userName,
      email: profile.emails[0].value,
      profilePicture: profile.photos[0]?.value || null,
      // Le rôle sera défini lors de la complétion du profil
      isVerified: true,
      lastLogin: new Date()
    };
    
    // Validation finale avant création
    if (!newUserData.name || !newUserData.email) {
      console.error('Données utilisateur incomplètes:', newUserData);
      return done(new Error('Impossible de créer l\'utilisateur - données incomplètes'), null);
    }
    
    console.log('Création d\'un nouvel utilisateur Google:', newUserData.email);
    
    const newUser = new User(newUserData);
    await newUser.save();
    
    return done(null, { user: newUser, isNewUser: true });

  } catch (error) {
    console.error('Erreur dans la stratégie Google:', error);
    return done(error, null);
  }
  }));
} else {
  console.warn('Variables d\'environnement Google OAuth manquantes. L\'authentification Google est désactivée.');
}

passport.serializeUser((data, done) => {
  done(null, data);
});

passport.deserializeUser((data, done) => {
  done(null, data);
});

module.exports = passport;