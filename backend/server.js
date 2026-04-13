const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fetch = require("node-fetch");
const csv = require("csv-parser");
const { Readable } = require("stream");
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");
const path = require("path");
require("dotenv").config();

const app = express();
const expressWs = require("express-ws")(app);
app.use(cors());

const API_KEY = process.env.API_KEY;

const cityToAuthorityId = {
  jyväskylä: "209",
  lahti: "223",
  oulu: "229",
};

const routesCache = {};

// Download and parse routes.txt for a given authority ID.
async function fetchRoutes(authorityId) {
  const zipUrl = `https://tvv.fra1.digitaloceanspaces.com/${authorityId}.zip`;
  try {
    const response = await axios.get(zipUrl, { responseType: "arraybuffer" });
    const zipBuffer = response.data;

    // Extract routes.txt from the zip buffer.
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(zipBuffer);
    const routesEntry = zip.getEntry("routes.txt");
    if (!routesEntry) {
      throw new Error("routes.txt not found in zip");
    }
    const routesCsv = routesEntry.getData().toString("utf8");

    // Parse CSV
    const routes = [];
    const stream = Readable.from(routesCsv);
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (row) => {
          routes.push({
            route_id: row.route_id,
            route_short_name: row.route_short_name,
            route_long_name: row.route_long_name,
            route_type: row.route_type,
          });
        })
        .on("end", resolve)
        .on("error", reject);
    });
    return routes;
  } catch (error) {
    console.error(
      `Error fetching routes for authority ${authorityId}:`,
      error.message,
    );
    throw error;
  }
}

// GET /api/routes/:city
app.get("/api/routes/:city", async (req, res) => {
  const city = req.params.city.toLowerCase();
  const authorityId = cityToAuthorityId[city];
  if (!authorityId) {
    return res.status(400).json({ error: `City "${city}" not supported.` });
  }

  // Return cached routes if available.
  if (routesCache[city]) {
    return res.json(routesCache[city]);
  }

  try {
    const routes = await fetchRoutes(authorityId);
    routesCache[city] = routes;
    res.json(routes);
  } catch {
    res.status(500).json({ error: "Failed to load routes data." });
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
      Authorization: `Basic ${API_KEY}`,
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
  return (vehicles = entities.map((e) => e.vehicle));
};

const broadcastBuses = async (connections) => {
  if (connections.length === 0) {
    return;
  }
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
