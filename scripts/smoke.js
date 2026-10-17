"use strict";

// Data consistency checks for the Türkiye build output (docs/data/turkey-*.json).

const fs = require("fs");
const path = require("path");
const { REGIONS, inBbox } = require("./lib/parse-sites.js");

const index = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "data", "turkey-index.json"), "utf8"));
const details = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "data", "turkey-details.json"), "utf8"));

const EXPECTED_FEATURES = 144;
const EXPECTED_WH = 28;

// All 22 UNESCO properties, with serial ones split into their mapped components.
const EXPECTED_WH_NAMES = [
  "Historic Areas of Istanbul",
  "Archaeological Site of Troy",
  "Selimiye Mosque & Complex",
  "Bursa historic core",
  "Cumalıkızık",
  "Hierapolis-Pamukkale",
  "Ephesus",
  "Pergamon",
  "Aphrodisias",
  "Sardis & Bin Tepe",
  "Afyonkarahisar Ulu Cami",
  "Xanthos",
  "Letoon",
  "Göreme National Park & Rock Sites of Cappadocia",
  "Neolithic Site of Çatalhöyük",
  "Eşrefoğlu Mosque",
  "Gordion",
  "Ahi Şerafeddin (Arslanhane) Mosque",
  "Sivrihisar Ulu Cami",
  "Great Mosque & Hospital of Divriği",
  "Hattusha: the Hittite Capital",
  "City of Safranbolu",
  "Kastamonu & Mahmut Bey Mosque",
  "Archaeological Site of Ani",
  "Arslantepe Mound",
  "Nemrut Dağ",
  "Diyarbakır Fortress & Hevsel Gardens",
  "Göbekli Tepe"
];

let errors = [];
const okCodes = {};
REGIONS.forEach((c) => (okCodes[c.code] = c));

const feats = index.features;
if (feats.length !== EXPECTED_FEATURES) errors.push("expected " + EXPECTED_FEATURES + " features, got " + feats.length);

const ids = new Set();
feats.forEach((f) => {
  if (!f.id) errors.push("feature missing id");
  else ids.add(f.id);
  if (!f.geometry || f.geometry.type !== "Point" || !Array.isArray(f.geometry.coordinates)) errors.push(f.id + " bad geometry");
  else if (!inBbox(f.geometry.coordinates[1], f.geometry.coordinates[0])) errors.push(f.id + " out of Türkiye bbox");
  if (!okCodes[f.properties.group]) errors.push(f.id + " unknown group " + f.properties.group);
  if (!f.properties.name || !f.properties.nameZh) errors.push(f.id + " missing bilingual name");
  if (typeof f.properties.wh !== "boolean") errors.push(f.id + " wh not boolean");
});

const detailIds = Object.keys(details);
if (detailIds.length !== ids.size) errors.push("details count mismatch: " + detailIds.length + " vs " + ids.size);
detailIds.forEach((id) => {
  if (!ids.has(id)) errors.push("detail without feature: " + id);
  const d = details[id];
  if (!d.location || !d.intro || !d.introZh) errors.push("detail incomplete: " + id);
});
ids.forEach((id) => {
  if (!details[id]) errors.push("feature without detail: " + id);
});

const whFeatures = feats.filter((f) => f.properties.wh);
const wh = whFeatures.length;
if (wh !== EXPECTED_WH) errors.push("expected " + EXPECTED_WH + " WH points, got " + wh);
const whNames = new Set(whFeatures.map((f) => f.properties.name));
EXPECTED_WH_NAMES.forEach((name) => {
  if (!whNames.has(name)) errors.push("missing UNESCO point: " + name);
});
if (whNames.size !== EXPECTED_WH_NAMES.length) {
  errors.push("WH name count mismatch: " + whNames.size + " vs " + EXPECTED_WH_NAMES.length);
}

if (errors.length) {
  console.log("FAIL (" + errors.length + "):");
  errors.slice(0, 40).forEach((e) => console.log("  " + e));
  process.exit(1);
}
console.log("SMOKE PASSED: " + feats.length + " features, " + wh + " WH points, all details complete, all coords in Türkiye bbox.");
