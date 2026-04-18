import express from 'express';
import cors from 'cors';
import expressWs from 'express-ws';
import path from 'path';
import { WebSocket } from 'ws';
import { fetchBusPositions } from './ingestion/gtfsRtIngestion';
import { fetchRoutesFromZip } from './ingestion/staticGtfsIngestion';
import { processVehicle } from './processing/busProcessor';
import { processRoute } from './processing/routeProcessor';

const cityToAuthorityId: Record<string, string> = {
  jyväskylä: '209',
  lahti: '223',
  oulu: '229',
};

export function createApp(apiKey: string) {
  const app = express();
  const wsInstance =expressWs(app);
  app.use(cors());
  app.use(express.json());

  app.get('/api/routes/:city', async (req, res) => {
    const city = req.params.city.toLowerCase();
    const authorityId = cityToAuthorityId[city];
    if (!authorityId) {
      return res.status(400).json({ error: `City "${city}" not supported.` });
    }

    try {
      const rawRoutes = await fetchRoutesFromZip(authorityId);
      const processedRoutes = rawRoutes.map(processRoute);
      res.json(processedRoutes);
    } catch (err) {
      console.error(`Failed to load routes for ${city}:`, err);
      res.status(500).json({ error: 'Failed to load routes data.' });
    }
  });

  const wss = wsInstance.getWss();

  (app as any).ws('/api/bus', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    ws.on('close', () => console.log('Client disconnected'));
    ws.on('error', (err: Error) => console.error('WebSocket error:', err));
  });

  async function broadcastBuses() {
    if (wss.clients.size === 0) return;
    try {
      const rawVehicles = await fetchBusPositions(apiKey);
      const vehicles = rawVehicles.map(processVehicle);
      const message = JSON.stringify(vehicles);
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(message);
      });
    } catch (error) {
      console.error('Error broadcasting buses:', error);
    }
  }

  // Broadcast every 2 seconds
  const interval = setInterval(broadcastBuses, 2000);

  app.use(express.static(path.join(__dirname, '../dist')));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });

  (app as any).cleanup = () => clearInterval(interval);

  return app;
}