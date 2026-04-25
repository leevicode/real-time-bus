import { Router } from 'express';
import { cityToAuthorityId, fetchData, shapeProcessor } from '../lib/gtfs';
import type { RawTrip, RawShape } from '../ingestion/staticGtfsIngestion';

export const shapesRouter = Router();

shapesRouter.get('/:city/:routeId', async (req, res) => {
  const city = req.params.city.toLowerCase();
  const routeId = req.params.routeId;
  const authorityId = cityToAuthorityId[city];
  if (!authorityId) {
    return res.status(400).json({ error: `City "${city}" not supported.` });
  }

  try {
    const rawData = await fetchData(authorityId);
    const [tripsRaw, shapesRaw] = await Promise.all([
      rawData.parse<RawTrip[]>("trips.txt"),
      rawData.parse<RawShape[]>("shapes.txt"),
    ]);
    const shapes = await shapeProcessor(routeId, tripsRaw, shapesRaw);
    res.json({ shapes });
  } catch (err: any) {
    console.error(`Failed to load shapes for route ${routeId} in ${city}:`, err);
    res.status(404).json({ error: err.message || "Failed to load route shape." });
  }
});