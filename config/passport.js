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
    // Vérifier si l'utilisateur existe déjà avec ce Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      // Utilisateur existant - connexion
      user.lastLogin = new Date();
      await user.save();
      return done(null, { user, isNewUser: false });
    }

    // Vérifier si un utilisateur existe avec le même email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Lier le compte Google à l'utilisateur existant
      user.googleId = profile.id;
      user.profilePicture = profile.photos[0]?.value || null;
      user.lastLogin = new Date();
      await user.save();
      return done(null, { user, isNewUser: false });
    }

    // Créer un nouveau utilisateur
    const newUser = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      profilePicture: profile.photos[0]?.value || null,
      role: 'agent', // Rôle par défaut
      isVerified: true,
      lastLogin: new Date()
    });

    await newUser.save();
    return done(null, { user: newUser, isNewUser: true });

  } catch (error) {
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