import { Router } from 'express';
import { cityToAuthorityId, fetchData } from '../lib/gtfs';
import { processRoute } from '../processing/routeProcessor';
import type { Route } from '../types';

export const routesRouter = Router();

routesRouter.get('/:city', async (req, res) => {
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