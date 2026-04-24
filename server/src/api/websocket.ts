import type { Express } from 'express';
import expressWs from 'express-ws';
import { WebSocket } from 'ws';
import { fetchBusPositions } from '../ingestion/gtfsRtIngestion';
import { processVehicle } from '../processing/busProcessor';

export function setupWebSocket(app: Express, apiKey: string) {
  const wsInstance = expressWs(app);
  const wss = wsInstance.getWss();

  (app as any).ws('/api/bus', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    ws.on('close', () => console.log('Client disconnected'));
    ws.on('error', (err: Error) => console.error('WebSocket error:', err));
  });

  const interval = setInterval(async () => {
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
  }, 2000);

  // Return cleanup function
  return () => clearInterval(interval);
}