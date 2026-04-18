const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");
const path = require("path");
const app = express();
const expressWs = require("express-ws")(app);
const { Cities, getData } = require("./gfts.ts");
app.use(cors());
require("dotenv").config();
const API_KEY = process.env.API_KEY;

// GET /api/routes/:city
app.get("/api/routes/:city", async (req, res) => {
  const city = req.params.city.toLowerCase();
  console.log(city);
  try {
    console.log("b4 await");
    const { routes } = await getData(city);
    console.log("after await");
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
  const routeId = req.params.routeId;
  const city = req.params.city.toLowerCase();

  try {
    const { trips, shapes } = await getData(city);
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
  if (connections.size === 0) return;
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
