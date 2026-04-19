import axios from 'axios';
import AdmZip from 'adm-zip';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { cacheParam } from '../cache/cache';

export interface Zip {
  parse: <T>(name: string) => Promise<T>;
}

export async function fetchGftsData(authorityId: string): Promise<Zip> {
  const zipUrl = `https://tvv.fra1.digitaloceanspaces.com/${authorityId}.zip`;
  const response = await axios.get(zipUrl, { responseType: 'arraybuffer' });
  const zip: any = new AdmZip(response.data);
  // Helper to parse a CSV file from the zip
  zip.parse = cacheParam(async (fileName: string) => {
    const entry = zip.getEntry(fileName);
    if (!entry) return null;
    const content = entry.getData().toString("utf8");
    const results: unknown[] = [];
    const stream = Readable.from(content);
    return new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (row: any) => results.push(row))
        .on("end", () => resolve(results))
        .on("error", reject);
    });

  });
  return zip;
}


export interface RawShape {
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
}

export interface RawTrip {
  route_id: string;
  trip_id: string;
  shape_id: string;
}