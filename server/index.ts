import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createRoutes } from './routes';
import { FileStorage } from './storage.file';

const app = express();
const port = process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 3001);
const httpServer = createServer(app);

// Initialize Socket.IO with CORS support
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.REPLIT_DOMAIN || 'http://localhost:5000']
      : true,
    methods: ['GET', 'POST']
  }
});

// Initialize storage
const storage = new FileStorage();

async function startServer() {
  try {
    await storage.init();
    
    // Middleware - Allow all origins in development for Replit compatibility
    const corsOptions = process.env.NODE_ENV === 'production' 
      ? { origin: [process.env.REPLIT_DOMAIN || 'http://localhost:5000'] }
      : { origin: true }; // Allow all origins in development
    app.use(cors(corsOptions));
    app.use(express.json());

    // API routes with Socket.IO support
    const routes = createRoutes(storage, io);
    app.use(routes);

    // Serve frontend only in production
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static('dist'));
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
        }
      });
    }

    // Socket.IO connection handling - consolidated in routes
    console.log('🔌 Socket.IO server initialized');

    httpServer.listen(parseInt(port.toString()), '0.0.0.0', () => {
      console.log(`🚀 AFK Bot Dashboard server running on 0.0.0.0:${port}`);
      console.log(`📱 Discord bot ready for connections`);
      console.log(`🎮 Minecraft bot ready for connections`);
      console.log(`🔌 Socket.IO server ready for real-time communication`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();