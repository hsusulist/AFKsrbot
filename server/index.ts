import express from 'express';
import cors from 'cors';
import path from 'path';
import { createRoutes } from './routes';
import { MemStorage } from './storage';

const app = express();
const port = process.env.PORT || 3001;

// Initialize storage
const storage = new MemStorage();

async function startServer() {
  try {
    await storage.init();
    
    // Middleware
    const corsOptions = process.env.NODE_ENV === 'production' 
      ? { origin: [process.env.REPLIT_DOMAIN || 'http://localhost:5000'] }
      : { origin: ['http://localhost:5000', 'http://0.0.0.0:5000'] };
    app.use(cors(corsOptions));
    app.use(express.json());

    // API routes
    const routes = createRoutes(storage);
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

    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 AFK Bot Dashboard server running on 0.0.0.0:${port}`);
      console.log(`📱 Discord bot ready for connections`);
      console.log(`🎮 Minecraft bot ready for connections`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();