import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { botManager } from "./bot-manager";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);
  
  // Setup Socket.IO for real-time updates
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  setupWebSocketHandlers(io);

  return httpServer;
}

function setupWebSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log('Client connected to WebSocket');
    
    // Send initial bot state when client connects
    socket.emit('botStatus', botManager.getCurrentStatus());
    socket.emit('serverInfo', botManager.getServerInfo());
    socket.emit('stats', botManager.getStats());
    socket.emit('players', botManager.getPlayers());
    socket.emit('inventory', botManager.getInventory());
    socket.emit('chatHistory', botManager.getChatHistory());

    // Listen for bot manager events and forward to clients
    const statusHandler = (status: any) => socket.emit('botStatus', status);
    const chatHandler = (message: any) => socket.emit('chatMessage', message);
    const playerHandler = (players: any) => socket.emit('players', players);
    const inventoryHandler = (items: any) => socket.emit('inventory', items);
    const serverInfoHandler = (info: any) => socket.emit('serverInfo', info);
    const errorHandler = (error: string) => socket.emit('botError', error);

    // Attach event listeners
    botManager.on('statusUpdate', statusHandler);
    botManager.on('chatMessage', chatHandler);
    botManager.on('playerUpdate', playerHandler);
    botManager.on('inventoryUpdate', inventoryHandler);
    botManager.on('serverInfoUpdate', serverInfoHandler);
    botManager.on('error', errorHandler);

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected from WebSocket');
      
      // Clean up event listeners to prevent memory leaks
      botManager.removeListener('statusUpdate', statusHandler);
      botManager.removeListener('chatMessage', chatHandler);
      botManager.removeListener('playerUpdate', playerHandler);
      botManager.removeListener('inventoryUpdate', inventoryHandler);
      botManager.removeListener('serverInfoUpdate', serverInfoHandler);
      botManager.removeListener('error', errorHandler);
    });

    // Handle client requests for current data
    socket.on('requestBotStatus', () => {
      socket.emit('botStatus', botManager.getCurrentStatus());
    });

    socket.on('requestStats', () => {
      socket.emit('stats', botManager.getStats());
    });

    socket.on('requestChatHistory', () => {
      socket.emit('chatHistory', botManager.getChatHistory());
    });
  });
}
