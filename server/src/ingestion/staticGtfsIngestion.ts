import axios from 'axios';
import AdmZip from 'adm-zip';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { Route } from '../types';

export async function fetchRoutesFromZip(authorityId: string): Promise<Route[]> {
  const zipUrl = `https://tvv.fra1.digitaloceanspaces.com/${authorityId}.zip`;
  const response = await axios.get(zipUrl, { responseType: 'arraybuffer' });
  const zip = new AdmZip(response.data);
  const routesEntry = zip.getEntry('routes.txt');
  if (!routesEntry) throw new Error('routes.txt not found in zip');

  const routesCsv = routesEntry.getData().toString('utf8');
  const routes: Route[] = [];

  await new Promise((resolve, reject) => {
    Readable.from(routesCsv)
      .pipe(csv())
      .on('data', (row) => {
        routes.push({
          route_id: row.route_id,
          route_short_name: row.route_short_name,
          route_long_name: row.route_long_name,
          route_type: row.route_type,
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  return routes;
}