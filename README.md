# Türkiye Tourist Sites Map · 土耳其旅游地图

An interactive bilingual map of Türkiye's tourist sites — **all 22 UNESCO World
Heritage properties** plus Lonely Planet highlights and popular natural and cultural
attractions — built with the same front-end / back-end separation as the Southeast
Asia project (`interactive_map_SEA`).

- **144 sites** · **28 UNESCO World Heritage map points** (22 properties, serial
  properties split by component) · **7 regions**
- MapLibre GL JS + [OpenFreeMap](https://openfreemap.org/) vector tiles (no API key)
- Bilingual (English / 中文) entries for every site
- Region filter chips (multi-select) + a ★ UNESCO World Heritage filter + search
- Deployable to GitHub Pages straight from `docs/`

## Contents

- `TURKEY_SITES.md` — the master candidate checklist (name / 中文 / location / WH /
  tier A-B-C), used to approve the site list
- `content/sites/<REGION>.md` — bilingual entries per region (source of text)
- `data/turkey-geometry.json` — curated coordinates per entry
- `scripts/` — data pipeline (below)
- `docs/` — the static site (what gets deployed / served)
- `server.js` — tiny static server for local development

## Data pipeline

```
TURKEY_SITES.md  ──(review)──>  content/sites/REGION.md  ──┐
                                                           ├─> scripts/build.js ──> docs/data/turkey-*.json
scripts/geocode.js ──> data/turkey-geometry.json ──────────┘
```

- `node scripts/geocode.js` — zips the curated coordinate table with the content
  entries in order, checks each point against the Türkiye bounding box, and writes
  `data/turkey-geometry.json`
- `node scripts/build.js` — parses `content/sites/*.md` in region order, joins them
  with the geometry, and writes:
  - `docs/data/turkey-index.json` — light GeoJSON index (geometry +
    name/nameZh/group/wh)
  - `docs/data/turkey-details.json` — text (location, intro EN/中文) keyed by id
- `node scripts/smoke.js` — consistency checks on the built data (144 features,
  28 WH points, complete details, coordinates inside Türkiye)

## Run locally

```
node server.js     # http://localhost:3000
```

## Deploy (GitHub Pages)

Commit `docs/` on `main` and enable Pages → branch `main`, folder `/docs`.

## Regions & site counts

| Code | Region | Sites | WH points |
|---|---|---|---:|
| MAR | Marmara 马尔马拉 | 25 | 5 |
| AEG | Aegean 爱琴海 | 18 | 6 |
| MED | Mediterranean 地中海 | 27 | 2 |
| CAN | Central Anatolia 中安纳托利亚 | 28 | 7 |
| BLS | Black Sea 黑海 | 19 | 3 |
| EAN | Eastern Anatolia 东安纳托利亚 | 13 | 2 |
| SAN | Southeastern Anatolia 东南安纳托利亚 | 14 | 3 |
| | **Total** | **144** | **28** |

## UNESCO World Heritage coverage

All 22 properties currently inscribed for Türkiye (through 2026), including
**Sardis and the Lydian Tumuli of Bin Tepe** (2025):

Cappadocia · Divriği · Istanbul · Hattusha · Nemrut Dağ · Hierapolis-Pamukkale ·
Xanthos-Letoon · Safranbolu · Troy · Selimiye · Çatalhöyük · Bursa and Cumalıkızık ·
Pergamon · Diyarbakır · Ephesus · Ani · Aphrodisias · Göbekli Tepe · Arslantepe ·
Gordion · Wooden Hypostyle Mosques of Medieval Anatolia · Sardis

Serial properties are split for the map: Bursa + Cumalıkızık, Xanthos + Letoon, and
the five Wooden Hypostyle Mosques (Afyonkarahisar, Sivrihisar, Ankara, Beyşehir,
Kastamonu). The 22 properties therefore appear as 28 points.

## Customizing

- **Text** — edit `content/sites/<REGION>.md`, then `node scripts/build.js`
- **Coordinates** — edit the `COORDS` table in `scripts/geocode.js`, then
  `node scripts/geocode.js && node scripts/build.js`
- **Region colors** — the `REGIONS` array in `docs/js/app.js`
- **Site list** — `TURKEY_SITES.md` is the master checklist

## Credits

- Map: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors,
  rendered via [OpenFreeMap](https://openfreemap.org/) (OpenMapTiles, no API key)
- Library: [MapLibre GL JS](https://maplibre.org/) (BSD-3-Clause)
- Site selection: UNESCO World Heritage List for Türkiye and Lonely Planet Türkiye
- Text: written for this project; facts checked against UNESCO, Wikipedia and
  Lonely Planet
