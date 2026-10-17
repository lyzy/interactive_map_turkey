"use strict";

// Shared helpers for the Türkiye build: region order/metadata and the parser for
// the per-region content markdown files (content/sites/<CODE>.md).

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");

// Region order = display order on the map + list.
const REGIONS = [
  { code: "MAR", en: "Marmara", zh: "马尔马拉" },
  { code: "AEG", en: "Aegean", zh: "爱琴海" },
  { code: "MED", en: "Mediterranean", zh: "地中海" },
  { code: "CAN", en: "Central Anatolia", zh: "中安纳托利亚" },
  { code: "BLS", en: "Black Sea", zh: "黑海" },
  { code: "EAN", en: "Eastern Anatolia", zh: "东安纳托利亚" },
  { code: "SAN", en: "Southeastern Anatolia", zh: "东南安纳托利亚" }
];

// Approximate bounding box for Türkiye (west, south, east, north).
const BBOX = [25.5, 35.8, 45.0, 42.2];

function inBbox(lat, lon) {
  return lat >= BBOX[1] && lat <= BBOX[3] && lon >= BBOX[0] && lon <= BBOX[2];
}

// Parses one region markdown file into entries:
// { name, nameZh, location, locationZh, wh, whYear, intro, introZh }
function parseSiteMd(md) {
  const lines = md.split(/\r?\n/);
  const entries = [];
  let cur = null;
  let section = null;
  let buf = [];

  function flush() {
    if (!cur || !section) return;
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    buf = [];
    if (!text) return;
    if (section === "nameLine") {
      const m = text.match(/^English:\s*(.+?)\s*·\s*中文:\s*(.+)$/);
      if (m) {
        cur.name = m[1].trim();
        cur.nameZh = m[2].trim();
      }
    } else if (section === "location") {
      const i = text.indexOf(" · ");
      if (i > -1) {
        cur.location = text.slice(0, i).trim();
        cur.locationZh = text.slice(i + 3).trim();
      } else {
        cur.location = text;
      }
    } else if (section === "wh") {
      cur.wh = /^yes/i.test(text);
      const y = text.match(/\((\d{4})\)/);
      cur.whYear = y ? y[1] : "";
    } else if (section === "intro") {
      cur.intro = text;
    } else if (section === "introZh") {
      cur.introZh = text;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    const head = line.match(/^##\s+(.+?)\s*$/);
    if (head) {
      flush();
      buf = [];
      section = null;
      cur = { name: head[1], nameZh: "", location: "", locationZh: "", wh: false, whYear: "", intro: "", introZh: "" };
      entries.push(cur);
      continue;
    }
    if (!cur) continue;

    const sec = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (sec) {
      flush();
      const label = sec[1].trim();
      if (/^名称/.test(label) || /^Name/.test(label)) section = "nameLine";
      else if (/^位置/.test(label) || /^Location/.test(label)) section = "location";
      else if (/^UNESCO/.test(label) || /^World Heritage/.test(label)) section = "wh";
      else if (/^Intro/.test(label)) section = "intro";
      else if (/^简介/.test(label)) section = "introZh";
      else section = null;
      continue;
    }

    if (line.trim() === "") { flush(); continue; }
    if (/^---+$/.test(line.trim())) { flush(); section = null; continue; }

    buf.push(line.trim());
  }
  flush();
  return entries;
}

// Reads every content/sites/<CODE>.md in region order and returns flat groups.
function loadAllSites() {
  const dir = path.join(ROOT, "content", "sites");
  const groups = [];
  for (const c of REGIONS) {
    const file = path.join(dir, c.code + ".md");
    if (!fs.existsSync(file)) {
      throw new Error("Missing content file: " + file);
    }
    const list = parseSiteMd(fs.readFileSync(file, "utf8"));
    if (!list.length) {
      throw new Error("No entries parsed from " + file);
    }
    list.forEach((e) => {
      e.cc = c.code;
      e.region = c.en;
      e.regionZh = c.zh;
    });
    groups.push({ region: c, entries: list });
  }
  return groups;
}

module.exports = { ROOT, REGIONS, BBOX, inBbox, parseSiteMd, loadAllSites };
