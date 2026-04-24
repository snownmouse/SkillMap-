import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

import { getConfig } from './src/server/config';
import { getDb } from './src/server/database';
import { treeRouter } from './src/server/routes/tree';
import { chatRouter } from './src/server/routes/chat';
import { authRouter } from './src/server/routes/auth';
import { careerRouter } from './src/server/routes/career';
import { debugRouter } from './src/server/routes/debug';
import { optionalAuth } from './src/server/controllers/authController';
import { treeController } from './src/server/controllers/treeController';
import { initWebSocket, notifyTaskUpdate } from './src/server/websocket';
import { rateLimit, sanitizeInput, securityHeaders } from './src/server/middleware/security';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const config = getConfig();
  const app = express();
  const PORT = config.port;

  getDb();

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '5mb' }));
  app.use(securityHeaders);
  app.use(sanitizeInput);

  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 30 }), authRouter);
  app.use('/api/careers', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }), optionalAuth, careerRouter);
  app.use('/api/debug', optionalAuth, debugRouter);

  app.get('/api/tasks/:taskId', optionalAuth, treeController.getTaskStatus);
  app.post('/api/tasks/:taskId/cancel', optionalAuth, treeController.cancelTask);

  app.use('/api/trees/:treeId/chat', rateLimit({ windowMs: 60 * 1000, maxRequests: 30 }), optionalAuth, chatRouter);
  app.use('/api/trees', rateLimit({ windowMs: 60 * 1000, maxRequests: 60 }), optionalAuth, treeRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const server = createHttpServer(app);

  initWebSocket(server);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  });

  server.listen(PORT, '0.0.0.0', () => {
    const config = getConfig();
    console.log(`SkillMap server running on http://localhost:${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
    console.log(`LLM Provider: ${config.llm.provider}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
