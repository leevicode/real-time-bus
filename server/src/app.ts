import express from 'express';
import cors from 'cors';
import expressWs from 'express-ws';
import path from 'path';
import { WebSocket } from 'ws';
import { fetchBusPositions } from './ingestion/gtfsRtIngestion';
import { fetchGftsData, Zip, RawShape, RawTrip } from './ingestion/staticGtfsIngestion';
import { processVehicle } from './processing/busProcessor';
import { processRoute } from './processing/routeProcessor';
import { Route } from './types';
import { cacheParam } from './cache/cache';
import { processShapes } from './processing/shapeProcessor';
import { processStops, processStopRoutes, RawStopTime } from './processing/stopProcessor';

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
  const _shapeProcessor =
  /* C */ cacheParam(async (routeId: string) =>
  /* A */ cacheParam(async (tripsRaw: RawTrip[]) =>
  /* C */ cacheParam(async (shapesRaw: RawShape[]) =>
  /* H */ processShapes(routeId, tripsRaw, shapesRaw)
  /* E */ )));
  const shapeProcessor = async (a: string, b: RawTrip[], c: RawShape[]) => (await (await _shapeProcessor(a))(b))(c)

  // GET /api/routes/:city - returns array of routes for the city
  app.get('/api/routes/:city', async (req, res) => {
    console.log("city");
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

  // GET /api/stops/:city - returns array of stops for the city
  app.get('/api/stops/:city', async (req, res) => {
    const city = req.params.city.toLowerCase();
    const authorityId = cityToAuthorityId[city];
    if (!authorityId) {
      return res.status(400).json({ error: `City "${city}" not supported.` });
    }

    try {
      const rawData = await fetchData(authorityId);
      const stopsRaw = await rawData.parse<any[]>("stops.txt");
      const stops = processStops(stopsRaw);
      res.json(stops);
    } catch (err) {
      console.error(`Failed to load stops for ${city}:`, err);
      res.status(500).json({ error: 'Failed to load stops data.' });
    }
  });

  // GET /api/stop-routes/:city/:stopId
  app.get('/api/stop-routes/:city/:stopId', async (req, res) => {
    const city = req.params.city.toLowerCase();
    const stopId = req.params.stopId;
    const authorityId = cityToAuthorityId[city];
    if (!authorityId) {
      return res.status(400).json({ error: `City "${city}" not supported.` });
    }

    try {
      const rawData = await fetchData(authorityId);
      const [stopTimesRaw, tripsRaw, routesRaw] = await Promise.all([
        rawData.parse<RawStopTime[]>("stop_times.txt"),
        rawData.parse<RawTrip[]>("trips.txt"),
        rawData.parse<Route[]>("routes.txt"),
      ]);

      const routes = processStopRoutes(stopId, stopTimesRaw, tripsRaw, routesRaw);
      res.json(routes);
    } catch (err) {
      console.error(`Failed to load stop-routes for stop ${stopId} in ${city}:`, err);
      res.status(500).json({ error: 'Failed to load stop-routes data.' });
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
      const [tripsRaw, shapesRaw] = await Promise.all([
        rawData.parse<RawTrip[]>("trips.txt"),
        rawData.parse<RawShape[]>("shapes.txt"),
      ]);
      try {
        const shapes = await shapeProcessor(routeId, tripsRaw, shapesRaw);
        res.json({ shapes: shapes });
      } catch (err) {
        console.error(err);
        res.status(404).json({ error: err });
      }
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