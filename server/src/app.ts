import express from 'express';
import cors from 'cors';
import expressWs from 'express-ws';
import path from 'path';
import { WebSocket } from 'ws';
import { fetchBusPositions } from './ingestion/gtfsRtIngestion';
import { fetchGftsData } from './ingestion/staticGtfsIngestion';
import { processVehicle } from './processing/busProcessor';
import { processRoute } from './processing/routeProcessor';
import { Route } from './types';
import { cacheParam } from './cache/cache';

const cityToAuthorityId: Record<string, string> = {
  jyväskylä: '209',
  lahti: '223',
  oulu: '229',
};

export function createApp(apiKey: string) {
  const app = express();
  const wsInstance = expressWs(app);
  app.use(cors());
  app.use(express.json());
  const fetchData = cacheParam(fetchGftsData);

  // GET /api/routes/:city - returns array of routes for the city
  app.get('/api/routes/:city', async (req, res) => {
    const city = req.params.city.toLowerCase();
    const authorityId = cityToAuthorityId[city];
    if (!authorityId) {
      return res.status(400).json({ error: `City "${city}" not supported.` });
    }

    try {
      const rawData = await fetchData(authorityId);
      const routes = (await rawData.parse<Route[]>("routes.txt"))
        .map(processRoute);
      res.json(routes);
    } catch (err) {
      console.error(`Failed to load routes for ${city}:`, err);
      res.status(500).json({ error: 'Failed to load routes data.' });
    }
  });

  // GET /api/shapes/:city/:routeId - returns array of shape points for the route
  app.get('/api/shapes/:city/:routeId', async (req, res) => {
    const city = req.params.city.toLowerCase();
    const routeId = req.params.routeId;
    const authorityId = cityToAuthorityId[city];

    if (!authorityId) {
      return res.status(400).json({ error: `City "${city}" not supported.` });
    }

    try {
      // Get cached GTFS data.
      const rawData = await fetchData(authorityId);

      // Parse trips and shapes in parallel.
      const [trips, shapesRaw] = await Promise.all([
        rawData.parse<any[]>("trips.txt"),
        rawData.parse<any[]>("shapes.txt"),
      ]);

      if (!trips || trips.length === 0) {
        return res.status(404).json({ error: "Trips data missing for this city." });
      }
      if (!shapesRaw || shapesRaw.length === 0) {
        return res.status(404).json({ error: "Shapes data missing for this city." });
      }

      // Find all shape_ids used by trips of this route
      const routeTrips = trips.filter(t => t.route_id === routeId);
      const shapeIds = [...new Set(routeTrips.map(t => t.shape_id).filter(id => id))];

      if (shapeIds.length === 0) {
        return res.status(404).json({ error: "No shape points found for this route." });
      }

      // Group shapes by shape_id and sort by sequence
      type ShapePoint = { lat: number; lng: number; sequence: number };
      const shapesMap = new Map<string, ShapePoint[]>();
      for (const row of shapesRaw) {
        const shapeId = row.shape_id;
        if (!shapeIds.includes(shapeId)) continue; // only keep shapes needed for this route

        if (!shapesMap.has(shapeId)) {
          shapesMap.set(shapeId, []);
        }
        shapesMap.get(shapeId)!.push({
          lat: parseFloat(row.shape_pt_lat),
          lng: parseFloat(row.shape_pt_lon),
          sequence: parseInt(row.shape_pt_sequence),
        });
      }

      // Convert to array of polylines.
      const shapesPoints: Array<Array<[number, number]>> = [];
      for (const [_, points] of shapesMap.entries()) {
        points.sort((a, b) => a.sequence - b.sequence);
        shapesPoints.push(points.map(p => [p.lat, p.lng]));
      }

      if (shapesPoints.length === 0) {
        return res.status(404).json({ error: "No shape points found for this route." });
      }

      res.json({ shapes: shapesPoints });
    } catch (err) {
      console.error(`Failed to load shapes for route ${routeId} in ${city}:`, err);
      res.status(500).json({ error: "Failed to load route shape." });
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