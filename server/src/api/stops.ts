import { Router } from 'express';
import { cityToAuthorityId, fetchData } from '../lib/gtfs';
import { processStops, processStopRoutes, RawStopTime } from '../processing/stopProcessor';
import type { Route } from '../types';
import { RawTrip } from '../ingestion/staticGtfsIngestion';

export const stopsRouter = Router();

stopsRouter.get('/:city', async (req, res) => {
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

stopsRouter.get('/stop-routes/:city/:stopId', async (req, res) => {
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