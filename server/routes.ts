import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { botManager } from "./bot-manager";

export async function registerRoutes(app: Express): Promise<Server> {
  // Bot configuration routes
  app.get('/api/bot/configs', async (req, res) => {
    try {
      const configs = await storage.getAllBotConfigs();
      const activeConfig = await storage.getActiveBotConfig();
      const configsWithActive = configs.map(config => ({
        ...config,
        isActive: activeConfig?.id === config.id
      }));
      res.json(configsWithActive);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bot configurations' });
    }
  });

  app.post('/api/bot/configs', async (req, res) => {
    try {
      const { insertBotConfigSchema } = await import('@shared/schema');
      const validatedData = insertBotConfigSchema.parse(req.body);
      const config = await storage.createBotConfig(validatedData);
      res.status(201).json(config);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid configuration data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create bot configuration' });
      }
    }
  });

  app.put('/api/bot/configs/:id', async (req, res) => {
    try {
      const { insertBotConfigSchema } = await import('@shared/schema');
      const validatedData = insertBotConfigSchema.partial().parse(req.body);
      const config = await storage.updateBotConfig(req.params.id, validatedData);
      if (!config) {
        return res.status(404).json({ error: 'Bot configuration not found' });
      }
      res.json(config);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid configuration data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update bot configuration' });
      }
    }
  });

  app.delete('/api/bot/configs/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteBotConfig(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Bot configuration not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete bot configuration' });
    }
  });

  app.post('/api/bot/configs/:id/activate', async (req, res) => {
    try {
      const config = await storage.setActiveBotConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ error: 'Bot configuration not found' });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to activate bot configuration' });
    }
  });

  // Bot control routes
  app.post('/api/bot/start', async (req, res) => {
    try {
      if (botManager.isConnected()) {
        return res.status(400).json({ error: 'Bot is already running' });
      }

      const config = await storage.getActiveBotConfig();
      if (!config) {
        return res.status(400).json({ error: 'No active bot configuration found' });
      }

      await botManager.connect(config);
      res.json({ message: 'Bot started successfully', status: botManager.getCurrentStatus() });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to start bot', details: error.message });
    }
  });

  app.post('/api/bot/stop', async (req, res) => {
    try {
      if (!botManager.isConnected()) {
        return res.status(400).json({ error: 'Bot is not running' });
      }

      botManager.disconnect();
      res.json({ message: 'Bot stopped successfully', status: botManager.getCurrentStatus() });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to stop bot', details: error.message });
    }
  });

  app.post('/api/bot/restart', async (req, res) => {
    try {
      botManager.restart();
      res.json({ message: 'Bot restart initiated', status: botManager.getCurrentStatus() });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to restart bot', details: error.message });
    }
  });

  // Bot status and data routes
  app.get('/api/bot/status', (req, res) => {
    try {
      const status = botManager.getCurrentStatus();
      const serverInfo = botManager.getServerInfo();
      res.json({ 
        ...status, 
        serverInfo,
        isConnecting: botManager.getIsConnecting()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get bot status' });
    }
  });

  app.get('/api/bot/stats', (req, res) => {
    try {
      const stats = botManager.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get bot statistics' });
    }
  });

  app.get('/api/bot/players', (req, res) => {
    try {
      const players = botManager.getPlayers();
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get player list' });
    }
  });

  app.get('/api/bot/inventory', (req, res) => {
    try {
      const inventory = botManager.getInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get bot inventory' });
    }
  });

  app.get('/api/bot/chat', (req, res) => {
    try {
      const chatHistory = botManager.getChatHistory();
      res.json(chatHistory);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get chat history' });
    }
  });

  app.post('/api/bot/chat', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      if (!botManager.isConnected()) {
        return res.status(400).json({ error: 'Bot is not connected' });
      }

      botManager.sendChat(message);
      res.json({ message: 'Chat message sent successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to send chat message', details: error.message });
    }
  });

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
