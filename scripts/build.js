"use strict";

// Assembles the static data the frontend fetches:
//   docs/data/turkey-index.json   — light index (geometry + name/nameZh/group/wh)
//   docs/data/turkey-details.json — text (location, intro EN/ZH) keyed by id
// Reads: content/sites/*.md (in region order) + data/turkey-geometry.json

const fs = require("fs");
const path = require("path");
const { ROOT, REGIONS, loadAllSites } = require("./lib/parse-sites.js");

const OUT_DIR = path.join(ROOT, "docs", "data");

function main() {
  const groups = loadAllSites();
  const geometry = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "turkey-geometry.json"), "utf8"));

  const features = [];
  const details = {};
  const missing = [];

  let n = 0;
  for (const g of groups) {
    for (let i = 0; i < g.entries.length; i++) {
      const e = g.entries[i];
      n += 1;
      const id = g.region.code.toLowerCase() + "-" + n;
      const geo = geometry.items.find((x) => x.cc === g.region.code && x.name === e.name);

      if (!geo || geo.lat === null || geo.lon === null) {
        missing.push(g.region.code + " ~ " + e.name);
        continue;
      }

      features.push({
        type: "Feature",
        id: id,
        geometry: { type: "Point", coordinates: [geo.lon, geo.lat] },
        properties: {
          name: e.name,
          nameZh: e.nameZh || "",
          group: g.region.code,
          wh: !!e.wh
        }
      });

      details[id] = {
        location: [e.location, e.locationZh].filter(Boolean).join(" · "),
        whYear: e.whYear || "",
        intro: e.intro || "",
        introZh: e.introZh || "",
        region: g.region.en,
        regionZh: g.region.zh
      };
    }
  }

  if (missing.length) {
    console.error("Missing geometry for " + missing.length + " entries:");
    missing.forEach((m) => console.error("  " + m));
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "turkey-index.json"),
    JSON.stringify({ type: "FeatureCollection", features }) + "\n"
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "turkey-details.json"),
    JSON.stringify(details) + "\n"
  );

  const whCount = features.filter((f) => f.properties.wh).length;
  const byRegion = {};
  features.forEach((f) => {
    byRegion[f.properties.group] = (byRegion[f.properties.group] || 0) + 1;
  });
  console.log("Wrote turkey-index.json (" + features.length + " features, " + whCount + " WH) and turkey-details.json (" + Object.keys(details).length + " entries).");
  REGIONS.forEach((c) => console.log("  " + c.code + " " + c.en + ": " + (byRegion[c.code] || 0)));
}

main();
