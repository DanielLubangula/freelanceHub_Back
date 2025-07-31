# Documentation Authentification Google

## Configuration

Les variables d'environnement suivantes sont nécessaires dans le fichier `.env` :

```
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
```

## Routes disponibles

### 1. Initier l'authentification Google
```
GET /api/auth/google
```
Redirige l'utilisateur vers la page d'authentification Google.

### 2. Callback Google
```
GET /api/auth/google/callback
```
Route de callback automatique après authentification Google.
Redirige vers le frontend avec les paramètres :
- `token` : JWT token
- `isNewUser` : boolean indiquant si c'est un nouvel utilisateur
- `user` : données utilisateur encodées

### 3. Vérification du token Google
```
POST /api/auth/google/success
Body: { "token": "jwt_token" }
```

## Flux d'authentification

1. **Frontend** : Rediriger vers `GET /api/auth/google`
2. **Google** : Authentification utilisateur
3. **Backend** : Traitement du callback et création/connexion utilisateur
4. **Redirection** : Vers le frontend avec les données
5. **Frontend** : Récupération et stockage des données utilisateur

## Réponse type

```json
{
  "success": true,
  "message": "Authentification Google réussie",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "Nom Utilisateur",
      "email": "email@example.com",
      "profilePicture": "url_photo",
      "role": "agent",
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token",
    "isNewUser": false
  }
}
```

## Gestion des utilisateurs

- **Nouvel utilisateur** : Création automatique avec rôle "agent" par défaut
- **Utilisateur existant** : Connexion et mise à jour de `lastLogin`
- **Liaison de compte** : Si un utilisateur existe avec le même email, liaison automatique du compte Google

## Champs utilisateur Google

- `googleId` : ID unique Google
- `profilePicture` : URL de la photo de profil Google
- `name` : Nom complet depuis Google
- `email` : Email depuis Google
- `isVerified` : Automatiquement `true` pour les comptes Google