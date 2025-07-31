const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');

dotenv.config();  

const app = express();
app.use(cors());
app.use(express.json());

// Test simple sans routes
app.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Serveur test démarré avec succès',
    timestamp: new Date().toISOString()
  });
});

// Création du serveur HTTP
const server = http.createServer(app);

// Démarrage du serveur
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Serveur test démarré sur le port ${PORT}`);
});