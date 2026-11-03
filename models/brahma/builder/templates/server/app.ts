import express from 'express';
import { registerRoutes } from './routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  registerRoutes(app);
  return app;
}
