import * as dotenv from 'dotenv'
dotenv.config()
import { cache, cacheParam } from "./cache.ts";
import axios from "axios";
import csv from "csv-parser";
import AdmZip from "adm-zip";
import {Readable} from "node:stream";
interface Zip {
  parse: (name: string) => Promise<any>;
}

// Download and parses all required GTFS files for a city. Caches the result in memory.
// Subsequent calls for the same city will return cached data.

const Cities = {
  jyväskylä: "209",
  lahti: "223",
  oulu: "229",
};
const API_KEY = process.env.API_KEY;


async function loadGtfsData(city: string): Promise<Zip> {
  const zipUrl = `https://tvv.fra1.digitaloceanspaces.com/${city}.zip`;
  const response = await axios.get(zipUrl, { responseType: "arraybuffer" });
  const zip: any = AdmZip(response.data);

  // Helper to parse a CSV file from the zip
  zip.parse = (fileName: string) => {
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

  };
  return zip;
}

/*
const parseData = async () => {
  // Load all three files in parallel
  const [routes, trips, shapesRaw] = await Promise.all([
    parseCsvFile("routes.txt"),
    parseCsvFile("trips.txt"),
    parseCsvFile("shapes.txt"),
  ]);

  if (!routes) throw new Error("routes.txt not found in zip");
  if (!trips) console.warn(`trips.txt missing for ${city} - shapes may not work`);
  if (!shapesRaw) console.warn(`shapes.txt missing for ${city} - cannot draw routes`);

  // Process shapes: group by shape_id and sort by sequence
  const shapes = {};
  if (shapesRaw) {
    for (const row of shapesRaw) {
      const shapeId = row.shape_id;
      if (!shapes[shapeId]) shapes[shapeId] = [];
      shapes[shapeId].push({
        lat: parseFloat(row.shape_pt_lat),
        lng: parseFloat(row.shape_pt_lon),
        sequence: parseInt(row.shape_pt_sequence),
      });
    }
    for (const shapeId in shapes) {
      shapes[shapeId].sort((a, b) => a.sequence - b.sequence);
    }
  }

  const data = { routes, trips, shapes };
  gtfsCache[city] = data;
  return data;
}
*/



const jyvaskyla = cache(() => loadGtfsData(Cities.jyväskylä));

const jyvaskylaData = cache(async () => {
  const jkl = await jyvaskyla();
  const [routes, trips, shapesRaw] = await Promise.all([
    jkl.parse("routes.txt"),
    jkl.parse("trips.txt"),
    jkl.parse("shapes.txt")
  ]);
  const shapes: any[] = []; // TODO
  for (const row of shapesRaw) {
      const shapeId = row.shape_id;
      if (!shapes[shapeId]) shapes[shapeId] = [];
      shapes[shapeId].push({
        lat: parseFloat(row.shape_pt_lat),
        lng: parseFloat(row.shape_pt_lon),
        sequence: parseInt(row.shape_pt_sequence),
      });
    }
    for (const shapeId in shapes) {
      shapes[shapeId].sort((a: { sequence: number; }, b: { sequence: number; }) => a.sequence - b.sequence);
    }
  return {routes, trips, shapes};
});

const getData = cacheParam(async (param: string) => {
  const id = param == "jyväskylä" ? Cities.jyväskylä : param == "lahti" ? Cities.lahti : Cities.oulu;
  const city = await loadGtfsData(id);
  const [routes, trips, shapesRaw] = await Promise.all([
    city.parse("routes.txt"),
    city.parse("trips.txt"),
    city.parse("shapes.txt")
  ]);
  console.log("lol");
  const shapes: any[] = []; // TODO
  for (const row of shapesRaw) {
      const shapeId = row.shape_id;
      if (!shapes[shapeId]) shapes[shapeId] = [];
      shapes[shapeId].push({
        lat: parseFloat(row.shape_pt_lat),
        lng: parseFloat(row.shape_pt_lon),
        sequence: parseInt(row.shape_pt_sequence),
      });
    }
    for (const shapeId in shapes) {
      shapes[shapeId].sort((a: { sequence: number; }, b: { sequence: number; }) => a.sequence - b.sequence);
    }
  return {routes, trips, shapes};
});

const jyvaskylaRoutes = cache(() => jyvaskyla().then((z: Zip) => z.parse("routes.txt")));

export { loadGtfsData, jyvaskylaData, Cities, getData};
