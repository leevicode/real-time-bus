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
import { cache, cacheParam } from './cache/cache';
import { processShapes } from './processing/shapeProcessor';

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

      // Filter to actual bus stops (location_type 0 or 1)
      const stops = stopsRaw
        .filter((stop: any) => stop.location_type === '0' || stop.location_type === '1')
        .map((stop: any) => ({
          id: stop.stop_id,
          name: stop.stop_name,
          lat: parseFloat(stop.stop_lat),
          lon: parseFloat(stop.stop_lon),
          code: stop.stop_code,
          locationType: stop.location_type,
        }));

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
        rawData.parse<any[]>("stop_times.txt"),
        rawData.parse<any[]>("trips.txt"),
        rawData.parse<Route[]>("routes.txt"),
      ]);

      // Find all trip_ids that stop at the given stop_id.
      const myStopTimes = stopTimesRaw.filter(st => st.stop_id === stopId);
      const tripIdsForStop = new Set(myStopTimes.map(st => st.trip_id));

      // Map trip_id -> route_id.
      const tripToRoute = new Map(tripsRaw.map(trip => [trip.trip_id, trip.route_id]));

      // Collect unique route_ids.
      const routeIds = new Set<string>();
      for (const tripId of tripIdsForStop) {
        const routeId = tripToRoute.get(tripId);
        if (routeId) routeIds.add(routeId);
      }

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // GTFS time string helper.
      const timeToMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      // For each route, find the earliest future arrival time at this stop.
      const routeNextArrival = new Map<string, number>();

      for (const st of myStopTimes) {
        const tripId = st.trip_id;
        const routeId = tripToRoute.get(tripId);
        if (!routeId || !routeIds.has(routeId)) continue;

        let tripMinutes = timeToMinutes(st.arrival_time);
        // If the scheduled time is earlier than now, it's next day.
        if (tripMinutes < currentMinutes) {
          tripMinutes += 24 * 60;
        }
        const minsUntil = tripMinutes - currentMinutes;

        const existing = routeNextArrival.get(routeId);
        if (existing === undefined || minsUntil < existing) {
          routeNextArrival.set(routeId, minsUntil);
        }
      }

      const routes = routesRaw
        .filter(route => routeIds.has(route.route_id))
        .map(route => ({
          route_id: route.route_id,
          route_short_name: route.route_short_name,
          route_long_name: route.route_long_name,
          next_arrival_minutes: routeNextArrival.get(route.route_id) ?? null,
        }));

      res.json(routes);
    } catch (err) {
      console.error(`Failed to get routes for stop ${stopId} in ${city}:`, err);
      res.status(500).json({ error: "Failed to load stop-routes data." });
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