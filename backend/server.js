const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fetch = require("node-fetch");
const csv = require("csv-parser");
const { Readable } = require("stream");
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");
const path = require("path");
require("dotenv").config();
const AdmZip = require("adm-zip");

const app = express();
const expressWs = require("express-ws")(app);
app.use(cors());

const API_KEY = process.env.API_KEY;

const cityToAuthorityId = {
  jyväskylä: "209",
  lahti: "223",
  oulu: "229",
};

const gtfsCache = {};

// Download and parses all required GTFS files for a city. Caches the result in memory.
// Subsequent calls for the same city will return cached data.
async function loadGtfsData(city, authorityId) {
  if (gtfsCache[city]) {
    return gtfsCache[city];
  }

  const zipUrl = `https://tvv.fra1.digitaloceanspaces.com/${authorityId}.zip`;
  const response = await axios.get(zipUrl, { responseType: "arraybuffer" });
  const zip = new AdmZip(response.data);

  // Helper to parse a CSV file from the zip
  const parseCsvFile = (fileName) => {
    const entry = zip.getEntry(fileName);
    if (!entry) return null;
    const content = entry.getData().toString("utf8");
    const results = [];
    const stream = Readable.from(content);
    return new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", () => resolve(results))
        .on("error", reject);
    });
  };

  // Load all three files in parallel
  const [routes, trips, shapesRaw] = await Promise.all([
    parseCsvFile("routes.txt"),
    parseCsvFile("trips.txt"),
    parseCsvFile("shapes.txt"),
  ]);

  if (!routes) throw new Error("routes.txt not found in zip");
  if (!trips) console.warn(`trips.txt missing for ${city} – shapes may not work`);
  if (!shapesRaw) console.warn(`shapes.txt missing for ${city} – cannot draw routes`);

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

// GET /api/routes/:city
app.get("/api/routes/:city", async (req, res) => {
  const city = req.params.city.toLowerCase();
  const authorityId = cityToAuthorityId[city];
  if (!authorityId) {
    return res.status(400).json({ error: `City "${city}" not supported.` });
  }

  try {
    const { routes } = await loadGtfsData(city, authorityId);
    // Transform to the expected format
    const formattedRoutes = routes.map(route => ({
      route_id: route.route_id,
      route_short_name: route.route_short_name,
      route_long_name: route.route_long_name,
      route_type: route.route_type,
    }));
    res.json(formattedRoutes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load routes data." });
  }
});

// GET /api/shapes/:city/:routeId
app.get("/api/shapes/:city/:routeId", async (req, res) => {
  const city = req.params.city.toLowerCase();
  const routeId = req.params.routeId;
  const authorityId = cityToAuthorityId[city];
  if (!authorityId) {
    return res.status(400).json({ error: `City "${city}" not supported.` });
  }

  try {
    const { trips, shapes } = await loadGtfsData(city, authorityId);
    if (!trips || !shapes) {
      return res.status(404).json({ error: "Trips or shapes data missing for this city." });
    }

    // Find all shape_ids used by trips of this route
    const routeTrips = trips.filter(t => t.route_id == routeId);
    const shapeIds = [...new Set(routeTrips.map(t => t.shape_id).filter(id => id))];

    // Collect points from all those shapes
    // Collect each shape as its own polyline.
    const shapesPoints = [];
    for (const shapeId of shapeIds) {
      if (shapes[shapeId]) {
        shapesPoints.push(shapes[shapeId].map(p => [p.lat, p.lng]));
      }
    }

    if (shapesPoints.length === 0) {
      return res.status(404).json({ error: "No shape points found for this route." });
    }
    res.json({ shapes: shapesPoints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load route shape." });
  }
});

app.ws("/api/bus", (ws) => {
  console.log("WebSocket client connected");
  ws.on("close", () => console.log("Client disconnected"));
  ws.on("error", (err) => console.error("WebSocket error:", err));
});
const busSocket = expressWs.getWss("/api/bus");

const fetchBuses = async () => {
  const url = `https://data.waltti.fi/jyvaskyla/api/gtfsrealtime/v1.0/feed/vehicleposition`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Basic ${API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = new Error(
      `${response.url}: ${response.status} ${response.statusText}`,
    );
    error.response = response;
    throw error;
  }
  const buffer = await response.arrayBuffer();
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer),
  );
  const entities = Array.from(feed.entity);
  return entities.map((e) => e.vehicle);
};

const broadcastBuses = async (connections) => {
  if (connections.length === 0) return;
  try {
    const buses = await fetchBuses();
    connections.forEach((client) => client.send(JSON.stringify(buses)));
  } catch (error) {
    console.log("error fetching buses: ", error);
  }
};

setInterval(() => broadcastBuses(busSocket.clients), 2000);

app.use(express.static(path.join(__dirname, "dist")));

app.get((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
