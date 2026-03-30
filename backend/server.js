const express = require("express");
const cors = require("cors");
const axios = require("axios");
const csv = require("csv-parser");
const { Readable } = require("stream");

const app = express();
app.use(cors());

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
  } catch (error) {
    res.status(500).json({ error: "Failed to load routes data." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
