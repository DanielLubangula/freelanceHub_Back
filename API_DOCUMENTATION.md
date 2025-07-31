# API Documentation - FreelanceLink

## Base URL
```
http://localhost:5000/api
```

## Authentification
Toutes les routes privées nécessitent un token JWT dans le header Authorization :
```
Authorization: Bearer <token>
```

---

## 🔐 AUTHENTIFICATION

### POST /auth/register
**Inscription d'un nouvel utilisateur**

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "agent", // "agent" ou "enterprise"
  "companyName": "TechCorp", // pour les entreprises
  "sector": "Technologie", // pour les entreprises
  "bio": "Développeur passionné", // pour les agents
  "skills": ["React", "Node.js"] // pour les agents
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inscription réussie",
  "data": {
    "user": { /* données utilisateur */ },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/login
**Connexion utilisateur**

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": { /* données utilisateur */ },
    "token": "jwt_token_here"
  }
}
```

### GET /auth/me
**Obtenir les informations de l'utilisateur connecté**
*Requiert authentification*

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* données utilisateur */ }
  }
}
```

### POST /auth/logout
**Déconnexion**
*Requiert authentification*

### POST /auth/refresh
**Rafraîchir le token**
*Requiert authentification*

### POST /auth/change-password
**Changer le mot de passe**
*Requiert authentification*

**Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

---

## 📋 TÂCHES

### GET /tasks
**Obtenir toutes les tâches avec filtres**

**Query Parameters:**
- `page` (number): Page (défaut: 1)
- `limit` (number): Nombre d'éléments par page (défaut: 10)
- `status` (string): Statut de la tâche
- `skills` (string): Compétences requises (séparées par des virgules)
- `budgetMin` (number): Budget minimum
- `budgetMax` (number): Budget maximum
- `search` (string): Recherche textuelle
- `category` (string): Catégorie
- `sortBy` (string): Champ de tri (défaut: "createdAt")
- `sortOrder` (string): Ordre de tri (défaut: "desc")

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [ /* liste des tâches */ ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

### POST /tasks
**Créer une nouvelle tâche**
*Requiert authentification (entreprises uniquement)*

**Body:**
```json
{
  "title": "Développement d'une application web",
  "description": "Création d'une application React avec backend Node.js",
  "budget": 500,
  "duration": "2 semaines",
  "skills": "React,Node.js,TypeScript",
  "requiredProofs": "Code source,Screenshots",
  "deadline": "2024-12-31T23:59:59Z",
  "category": "development",
  "priority": "medium",
  "isUrgent": false,
  "location": "Paris, France",
  "isRemote": true,
  "tags": "web,react,nodejs"
}
```

### GET /tasks/:id
**Obtenir une tâche spécifique**

### PUT /tasks/:id
**Mettre à jour une tâche**
*Requiert authentification (propriétaire ou admin)*

### DELETE /tasks/:id
**Supprimer une tâche**
*Requiert authentification (propriétaire ou admin)*

### GET /tasks/my-tasks
**Obtenir les tâches de l'utilisateur connecté**
*Requiert authentification*

### GET /tasks/assigned-tasks
**Obtenir les tâches assignées à l'utilisateur connecté**
*Requiert authentification (agents uniquement)*

---

## 📝 CANDIDATURES

### POST /applications
**Postuler à une tâche**
*Requiert authentification (agents uniquement)*

**Body:**
```json
{
  "taskId": "task_id_here",
  "message": "Je suis intéressé par cette tâche",
  "proposedBudget": 450,
  "proposedDuration": "10 jours",
  "coverLetter": "Lettre de motivation détaillée..."
}
```

### GET /applications/task/:taskId
**Obtenir toutes les candidatures pour une tâche**
*Requiert authentification (propriétaire de la tâche ou admin)*

### GET /applications/my-applications
**Obtenir les candidatures de l'utilisateur connecté**
*Requiert authentification (agents uniquement)*

### GET /applications/:id
**Obtenir une candidature spécifique**
*Requiert authentification*

### PUT /applications/:id/status
**Mettre à jour le statut d'une candidature**
*Requiert authentification (propriétaire de la tâche ou admin)*

**Body:**
```json
{
  "status": "accepted", // "accepted", "rejected", "pending"
  "notes": "Commentaires optionnels"
}
```

### PUT /applications/:id
**Mettre à jour une candidature**
*Requiert authentification (propriétaire de la candidature)*

### DELETE /applications/:id
**Supprimer une candidature**
*Requiert authentification (propriétaire de la candidature)*

---

## 💰 PAIEMENTS

### POST /payments
**Créer un nouveau paiement**
*Requiert authentification (entreprises uniquement)*

**Body:**
```json
{
  "taskId": "task_id_here",
  "amount": 500,
  "method": "Orange Money",
  "description": "Paiement pour la tâche terminée",
  "notes": "Commentaires optionnels"
}
```

### GET /payments
**Obtenir tous les paiements de l'utilisateur connecté**
*Requiert authentification*

### GET /payments/:id
**Obtenir un paiement spécifique**
*Requiert authentification*

### PUT /payments/:id/confirm
**Confirmer un paiement**
*Requiert authentification (bénéficiaire uniquement)*

### PUT /payments/:id/dispute
**Contester un paiement**
*Requiert authentification (payeur ou bénéficiaire)*

**Body:**
```json
{
  "disputeReason": "Raison de la contestation"
}
```

### GET /payments/statistics
**Obtenir les statistiques de paiement**
*Requiert authentification*

**Query Parameters:**
- `period` (string): Période ("week", "month", "year", "all")

---

## 🔔 NOTIFICATIONS

### GET /notifications
**Obtenir toutes les notifications de l'utilisateur connecté**
*Requiert authentification*

**Query Parameters:**
- `page` (number): Page
- `limit` (number): Nombre d'éléments par page
- `type` (string): Type de notification
- `read` (boolean): Filtrer par statut de lecture

### GET /notifications/:id
**Obtenir une notification spécifique**
*Requiert authentification*

### PUT /notifications/:id/read
**Marquer une notification comme lue**
*Requiert authentification*

### PUT /notifications/read-all
**Marquer toutes les notifications comme lues**
*Requiert authentification*

### DELETE /notifications/:id
**Supprimer une notification**
*Requiert authentification*

### DELETE /notifications
**Supprimer toutes les notifications**
*Requiert authentification*

### GET /notifications/unread-count
**Obtenir le nombre de notifications non lues**
*Requiert authentification*

---

## 👥 UTILISATEURS

### GET /users/profile
**Obtenir le profil de l'utilisateur connecté**
*Requiert authentification*

### PUT /users/profile
**Mettre à jour le profil de l'utilisateur connecté**
*Requiert authentification*

**Body:**
```json
{
  "name": "Nouveau nom",
  "bio": "Nouvelle bio",
  "skills": "React,Node.js,TypeScript",
  "location": "Paris, France",
  "phone": "+33 6 12 34 56 78",
  "website": "https://mon-site.com",
  "companyName": "Nouvelle entreprise",
  "sector": "Technologie",
  "description": "Description de l'entreprise",
  "paymentMethod": "Orange Money",
  "paymentNumber": "+243 89 123 4567"
}
```

### GET /users/:id
**Obtenir le profil public d'un utilisateur**

### GET /users/agents
**Obtenir la liste des agents avec filtres**

**Query Parameters:**
- `page` (number): Page
- `limit` (number): Nombre d'éléments par page
- `skills` (string): Compétences (séparées par des virgules)
- `rating` (number): Note minimum
- `search` (string): Recherche textuelle
- `sortBy` (string): Champ de tri
- `sortOrder` (string): Ordre de tri

### GET /users/enterprises
**Obtenir la liste des entreprises avec filtres**

**Query Parameters:**
- `page` (number): Page
- `limit` (number): Nombre d'éléments par page
- `sector` (string): Secteur d'activité
- `rating` (number): Note minimum
- `search` (string): Recherche textuelle
- `sortBy` (string): Champ de tri
- `sortOrder` (string): Ordre de tri

### GET /users/:id/tasks
**Obtenir les tâches d'un utilisateur**

### GET /users/:id/ratings
**Obtenir les évaluations d'un utilisateur**

---

## ⭐ ÉVALUATIONS

### POST /ratings
**Créer une nouvelle évaluation**
*Requiert authentification*

**Body:**
```json
{
  "taskId": "task_id_here",
  "toUserId": "user_id_here",
  "rating": 5,
  "comment": "Excellent travail !",
  "communication": 5,
  "quality": 5,
  "timeliness": 4,
  "professionalism": 5
}
```

### GET /ratings
**Obtenir les évaluations avec filtres**

**Query Parameters:**
- `page` (number): Page
- `limit` (number): Nombre d'éléments par page
- `taskId` (string): ID de la tâche
- `toUserId` (string): ID de l'utilisateur évalué
- `fromUserId` (string): ID de l'utilisateur évaluateur
- `rating` (number): Note minimum
- `sortBy` (string): Champ de tri
- `sortOrder` (string): Ordre de tri

### GET /ratings/:id
**Obtenir une évaluation spécifique**

### PUT /ratings/:id
**Mettre à jour une évaluation**
*Requiert authentification (propriétaire de l'évaluation)*

### DELETE /ratings/:id
**Supprimer une évaluation**
*Requiert authentification (propriétaire ou admin)*

### GET /ratings/statistics
**Obtenir les statistiques d'évaluation**

**Query Parameters:**
- `userId` (string): ID de l'utilisateur

---

## 📁 UPLOAD DE FICHIERS

### Endpoints supportant l'upload
- `POST /tasks` - Fichiers attachés à la tâche
- `POST /applications` - Fichiers de candidature
- `POST /payments` - Preuve de paiement
- `PUT /users/profile` - Avatar utilisateur

### Types de fichiers acceptés
- Images: JPEG, JPG, PNG, GIF
- Documents: PDF, DOC, DOCX
- Texte: TXT
- Archives: ZIP

### Limites
- Taille maximale: 10MB par fichier
- Nombre maximal: 5 fichiers par requête

---

## 🔒 SÉCURITÉ

### Rôles utilisateur
- `agent`: Freelance qui postule aux tâches
- `enterprise`: Entreprise qui publie des tâches
- `admin`: Administrateur avec tous les droits

### Permissions par route
- Routes publiques: Accessibles sans authentification
- Routes privées: Nécessitent un token JWT valide
- Routes spécifiques: Nécessitent un rôle particulier

### Validation des données
- Toutes les entrées sont validées côté serveur
- Messages d'erreur explicites
- Protection contre les injections

---

## 📊 CODES DE RÉPONSE

- `200`: Succès
- `201`: Créé avec succès
- `400`: Requête invalide
- `401`: Non authentifié
- `403`: Non autorisé
- `404`: Ressource non trouvée
- `500`: Erreur serveur

---

## 🚀 DÉMARRAGE

1. Installer les dépendances:
```bash
npm install
```

2. Configurer les variables d'environnement dans `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/freelancelink
JWT_SECRET=your-secret-key-here
```

3. Démarrer le serveur:
```bash
npm start
```

Le serveur sera accessible sur `http://localhost:5000` 