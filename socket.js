const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

let io;
const onlineUsers = new Map();

// Initialisation de Socket.io
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Token manquant"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Token invalide"));
    }
  });

  io.on("connection", async (socket) => {
    console.log("Nouvelle connexion:", socket.id, "User:", socket.userId);

   
  });
};

const getSocketInstance = () => io;
const getOnlineUsers = () => onlineUsers;

module.exports = { initializeSocket, getSocketInstance, getOnlineUsers };