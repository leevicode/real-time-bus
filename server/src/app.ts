import express from 'express';
import cors from 'cors';
import path from 'path';
import { routesRouter } from './api/routes';
import { stopsRouter } from './api/stops';
import { shapesRouter } from './api/shapes';
import { setupWebSocket } from './api/websocket';

export function createApp(apiKey: string) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/routes', routesRouter);
  app.use('/api/stops', stopsRouter);
  app.use('/api/shapes', shapesRouter);
  // stop-routes is nested under /api/stops.

  const cleanupWs = setupWebSocket(app, apiKey);

  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist', 'index.html'));
  });

  (app as any).cleanup = cleanupWs;

  return app;
}