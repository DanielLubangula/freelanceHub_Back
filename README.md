socket

socket.on("acceptChallenge", ({ toUserId, message, challengeData }) => {
      console.log("Accepté", toUserId, socket.userId, challengeData);

      const fromSocketId = onlineUsers.get(toUserId); // Demandeur du défi
      const toSocketId = socket.id; // Celui qui accepte

      if (fromSocketId) {
        // Générer un ID unique pour la salle (ordre alphabétique pour éviter les doublons)
        const roomId = [toUserId, socket.userId].sort().join("_");

        // Ajouter les deux sockets dans le salon
        socket.join(roomId);
        io.sockets.sockets.get(fromSocketId)?.join(roomId);

        // Récupérer les questions du thème
        const themeName = challengeData.theme;
        const questionCount = challengeData.questionCount;
        const filename = `${themeName.toLowerCase().replace(/\s+/g, '-')}.md`;
        const filePath = path.join(QUESTIONS_DIR, filename);

        if (!fs.existsSync(filePath)) {
          // Informer les deux utilisateurs que le thème est introuvable
          io.to(roomId).emit("matchError", { message: "Thème introuvable" });
          return;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        const shuffleArray = (array) => {
          for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        };

        try {
          const rawBlocks = content.split(/###\s*(QCM|VF|Libre)/).slice(1);

          const questions = [];
          for (let i = 0; i < rawBlocks.length; i += 2) {
            const type = rawBlocks[i].trim();
            const block = rawBlocks[i + 1];
            const lines = block.trim().split('\n');

            const questionLineIndex = lines.findIndex(l => l.includes('**Question'));
            const question = lines[questionLineIndex + 1]?.trim() || '';

            const responseIndex = lines.findIndex(line => line.trim().startsWith('**Réponses')) + 1;
            const rawOptions = [];

            for (let j = responseIndex; j < lines.length; j++) {
              const line = lines[j].trim();
              if (!line.startsWith('-')) break;

              const isCorrect = line.includes('*');
              const text = line.replace(/\*/g, '').replace(/^-\s*/, '').trim();
              rawOptions.push({ text, isCorrect });
            }

            const shuffled = type === 'QCM' ? shuffleArray(rawOptions) : rawOptions;
            const options = shuffled.map(opt => opt.text);
            const correctIndex = shuffled.findIndex(opt => opt.isCorrect);

            const explanationIndex = lines.findIndex(line => line.trim().startsWith('**Explication')) + 1;
            const explanation = explanationIndex > 0 && lines[explanationIndex]
              ? lines[explanationIndex].trim()
              : '';

            questions.push({
              id: questions.length + 1,
              type,
              question,
              options,
              correct: correctIndex,
              explanation
            });
          }

          const shuffledQuestions = shuffleArray(questions);
          const limitedQuestions = shuffledQuestions.slice(0, questionCount);

        
          // Informer les deux joueurs qu’ils sont dans le même salon et leur envoyer les questions
          io.to(roomId).emit("matchStarted", {
            roomId,
            players: [toUserId, socket.userId],
            challengeData,
            questions: limitedQuestions,
            message: "Le match peut commencer !",
          });

        } catch (err) {
          console.error('Erreur de parsing :', err);
          io.to(roomId).emit("matchError", { message: "Erreur lors de la récupération des questions" });
        }
      } else {
        socket.emit("challengeError", { message: "Utilisateur non connecté" });
      }
    });
    


    ------------------------------------


    challengeData {
  theme: 'equipement-informatique',
  questionCount: 10,
  fromUser: {
    username: 'daniel',
    profilePicture: 'http://localhost:5000/uploads/profil/1751068972735-852831976.jpg',
    id: '685e65d078af10ff8c45e782',
    level: 1
  }
}
🎮 Match lancé dans 685e65d078af10ff8c45e782_685f36f2b11fe8b61aca6056
👥 Joueurs : [
  {
    _id: new ObjectId('685e65d078af10ff8c45e782'),
    username: 'daniel',
    email: 'daniel@gmail.com',
    createdAt: 2025-06-27T09:35:12.133Z,
    updatedAt: 2025-06-28T00:02:52.815Z,
    __v: 0,
    bestStreak: 0,
    currentStreak: 0,
    experience: 0,
    gamesPlayed: 0,
    level: 1,
    nextLevelExp: 1000,
    profilePicture: '/uploads/profil/1751068972735-852831976.jpg',
    rank: { daily: 0, monthly: 0, weekly: 0 },
    totalScore: 0,
    winRate: 0
  },
  {
    _id: new ObjectId('685f36f2b11fe8b61aca6056'),
    username: 'Samuel',
    email: 'samuel@gmail.com',
    profilePicture: '/uploads/profil/1751103358479-628530531.jpg',
    level: 1,
    experience: 0,
    nextLevelExp: 1000,
    gamesPlayed: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalScore: 0,
    rank: { daily: 0, weekly: 0, monthly: 0 },
    createdAt: 2025-06-28T00:27:30.948Z,
    updatedAt: 2025-06-28T09:35:58.511Z,
    __v: 0
  }
]
📋 Questions : [
  {
    id: 6,
    type: 'VF',
    question: 'Un pare-feu peut bloquer les connexions non autorisées.',
    options: [ 'Vrai', 'Faux' ],
    correct: 0,
    explanation: 'Un pare-feu est conçu pour filtrer le trafic réseau et bloquer les connexions non autorisées.'
  },
  {
    id: 3,
    type: 'QCM',
    question: 'Quels outils utilisez-vous pour surveiller les performances du système ?',
    options: [ 'Nagios', 'Photoshop', 'Blender', 'Wireshark' ],
    correct: 0,
    explanation: 'Nagios est un outil populaire pour surveiller les performances des systèmes et des réseaux.' 
  },
  {
    id: 8,
    type: 'Libre',
    question: 'Comment automatiser les tâches administratives avec des scripts ?',
    options: [
      'Utiliser Bash pour Linux',
      'Utiliser PowerShell pour Windows',
      'Utiliser Excel',
      'Utiliser Word'
    ],
    correct: 0,
    explanation: 'Les scripts Bash et PowerShell sont couramment utilisés pour automatiser les tâches administratives sur Linux et Windows respectivement.'
  },
  {
    id: 2,
    type: 'QCM',
    question: "Quelles sont les principales responsabilités d'un administrateur système ?",
    options: [
      'Création de sites web',
      'Gestion des utilisateurs',
      "Développement d'applications",
      'Maintenance des serveurs'
    ],
    correct: 3,
    explanation: "Les principales responsabilités d'un administrateur système incluent la maintenance des serveurs, la gestion des utilisateurs, et la surveillance des performances du système."
  },
  {
    id: 4,
    type: 'VF',
    question: 'Les sauvegardes doivent être effectuées quotidiennement pour garantir la sécurité des données.',    options: [ 'Vrai', 'Faux' ],
    correct: 0,
    explanation: 'Les sauvegardes régulières, idéalement quotidiennes, sont essentielles pour minimiser la perte de données en cas de panne.'
  },
  {
    id: 7,
    type: 'QCM',
    question: "Quelle est la différence entre un système d'exploitation Linux et Windows ?",
    options: [
      'Linux ne supporte pas les interfaces graphiques',
      'Windows est gratuit',
      'Linux est uniquement pour les serveurs',
      'Linux est open-source, Windows est propriétaire'
    ],
    correct: 3,
    explanation: "Linux est un système d'exploitation open-source, tandis que Windows est propriétaire et commercial."
  },
  {
    id: 5,
    type: 'QCM',
    question: 'Expliquez le fonctionnement des VLANs.',
    options: [
      'Ils sont utilisés uniquement dans les réseaux domestiques',
      'Ils augmentent la vitesse des connexions internet',
      'Ils segmentent un réseau en sous-réseaux logiques',
      'Ils remplacent les pare-feu'
    ],
    correct: 2,
    explanation: 'Les VLANs permettent de segmenter un réseau physique en plusieurs sous-réseaux logiques pour 
améliorer la sécurité et la gestion.'
  },
  {
    id: 1,
    type: 'QCM',
    question: "Exact, Quel périphérique est représenté sur l'image ci-dessous ?",
    options: [ 'Firewall', 'Modem', 'Routeur', 'Switch' ],
    correct: 3,
    explanation: ''
  }
]
📋 message : Votre défi a été accepté par daniel.

je voudrais que tu m'aides à mettre un système de xp, 🧠 Fonctionnement du système d’XP par niveau
Le système de points d'expérience est basé sur deux critères :

Le résultat du match (victoire ou défaite),

La différence de niveau entre les deux joueurs.

✅ En cas de victoire :
Le joueur gagne un certain nombre de points XP en fonction du niveau de son adversaire :

Si les deux joueurs sont du même niveau, le gagnant reçoit 100 XP.

Si l’adversaire est 1 niveau plus fort, le gagnant reçoit 150 XP.

Si l’adversaire est 2 niveaux plus fort, le gagnant reçoit 200 XP.

Si l’adversaire est 3 niveaux plus fort, le gagnant reçoit 250 XP.

Si l’adversaire est 4 niveaux plus fort, le gagnant reçoit 300 XP.

Et ainsi de suite, +50 XP supplémentaires par niveau de différence.

❌ En cas de défaite :
Le joueur perd des points XP selon le même barème, mais en sens inverse :

Si les deux joueurs sont du même niveau, le perdant perd 100 XP.

Si l’adversaire est 1 niveau moins fort, il perd 150 XP.

Si l’adversaire est 2 niveaux moins fort, il perd 200 XP

Et ainsi de suite, -50 XP pour chaque niveau d’écart supplémentaire en faveur de l’adversaire.

Tous les 1000 XP obtenus, le joueur passe au niveau suivant.
# freelanceHub_Back
⌢映敲汥湡散畈形慂正•਍