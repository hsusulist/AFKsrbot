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
    app.use(cors());
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

    app.listen(port, 'localhost', () => {
      console.log(`🚀 AFK Bot Dashboard server running on localhost:${port}`);
      console.log(`📱 Discord bot ready for connections`);
      console.log(`🎮 Minecraft bot ready for connections`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();