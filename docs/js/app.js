"use strict";

// Türkiye tourist sites — single-dataset map app (MapLibre GL + OpenFreeMap).
// Mirrors the layout/behaviour of the Southeast Asia app: search box, region chips
// + UNESCO World Heritage chip, list grouped by region, bilingual detail panel.

(function () {
  const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
  const INDEX_URL = "data/turkey-index.json";
  const DETAILS_URL = "data/turkey-details.json";

  const REGIONS = [
    { code: "MAR", en: "Marmara", zh: "马尔马拉", color: "#e74c3c" },
    { code: "AEG", en: "Aegean", zh: "爱琴海", color: "#3498db" },
    { code: "MED", en: "Mediterranean", zh: "地中海", color: "#16a085" },
    { code: "CAN", en: "Central Anatolia", zh: "中安纳托利亚", color: "#f39c12" },
    { code: "BLS", en: "Black Sea", zh: "黑海", color: "#2ecc71" },
    { code: "EAN", en: "Eastern Anatolia", zh: "东安纳托利亚", color: "#9b59b6" },
    { code: "SAN", en: "Southeastern Anatolia", zh: "东南安纳托利亚", color: "#e67e22" }
  ];
  const REGION = {};
  REGIONS.forEach(function (c) { REGION[c.code] = c; });

  const WH_COLOR = "#b8860b";

  let map = null;
  let mapReady = false;
  let features = [];
  const byId = {};
  let detailsMap = null;
  let query = "";
  const active = new Set();          // region codes selected (empty = all)
  let whOnly = false;                // UNESCO World Heritage filter
  let selectedId = null;
  let collapsed = false;
  let popup = null;
  let popupId = null;

  const langStore = "turkey-lang";
  let lang = "en";
  try { lang = localStorage.getItem(langStore) === "zh" ? "zh" : "en"; } catch (e) { /* ignore */ }
  const TEST = /[?&]test/.test(location.search);

  function $(id) { return document.getElementById(id); }

  /* ---------------- loading / degrade ---------------- */

  function showMapWarning(text) {
    const w = $("map-warning");
    if (w) { w.textContent = text; w.style.display = "block"; }
  }

  /* ---------------- map ---------------- */

  function initMap() {
    if (!window.maplibregl) {
      showMapWarning("Map engine failed to load from CDN. The site list below still works. 地图引擎加载失败，下方列表仍可使用。");
      return;
    }
    try {
      map = new maplibregl.Map({
        container: "map",
        style: STYLE_URL,
        center: [35.2, 39.0],
        zoom: 4.5,
        attributionControl: true
      });
      if (TEST) window.__turkeyMap = map;
      map.on("error", function (e) {
        if (e && e.error && /WebGL|Context|lost/i.test(String(e.error.message || e.error))) {
          showMapWarning("This map needs WebGL, which appears unavailable. The site list below still works. 地图需要 WebGL，您的浏览器可能不支持；下方列表仍可使用。");
        }
      });
      map.on("load", function () {
        mapReady = true;
        addLayers();
        if (features.length) fitMap();
      });
    } catch (err) {
      showMapWarning("Could not start the map. The site list below still works. 地图启动失败；下方列表仍可使用。");
    }
  }

  function addLayers() {
    if (!mapReady || !map) return;
    if (!map.getSource("turkey")) {
      map.addSource("turkey", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      // gold halo under every World Heritage point
      map.addLayer({
        id: "turkey-wh-halo",
        type: "circle",
        source: "turkey",
        filter: ["==", ["get", "wh"], true],
        paint: {
          "circle-radius": 10,
          "circle-color": WH_COLOR,
          "circle-opacity": 0.35,
          "circle-stroke-width": 1.2,
          "circle-stroke-color": "#f5d76e"
        }
      });

      map.addLayer({
        id: "turkey-pts",
        type: "circle",
        source: "turkey",
        paint: {
          "circle-radius": [
            "case",
            ["==", ["id"], selectedId], 13,
            ["==", ["get", "wh"], true], 6.5,
            5.5
          ],
          "circle-color": ["match", ["get", "group"],
            "MAR", "#e74c3c", "AEG", "#3498db", "MED", "#16a085", "CAN", "#f39c12",
            "BLS", "#2ecc71", "EAN", "#9b59b6", "SAN", "#e67e22",
            "#9aa7b5"],
          "circle-stroke-width": ["case", ["==", ["id"], selectedId], 2, 0.8],
          "circle-stroke-color": "#ffffff"
        }
      });

      // invisible wide hit layer so clicks register reliably
      map.addLayer({
        id: "turkey-hit",
        type: "circle",
        source: "turkey",
        paint: {
          "circle-radius": 16,
          "circle-color": "rgba(255,255,255,0.01)",
          "circle-opacity": 1
        }
      });

      map.on("mouseenter", "turkey-hit", function () { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "turkey-hit", function () { map.getCanvas().style.cursor = ""; });

      // Direct DOM click listener on the canvas: more reliable than relying on the
      // MapLibre click pipeline (the cursor already proves events reach the canvas).
      map.getCanvas().addEventListener("click", onCanvasClick);
    }
    syncMapData();
  }

  function onCanvasClick(e) {
    const r = map.getCanvas().getBoundingClientRect();
    handleClickAt(e.clientX - r.left, e.clientY - r.top);
  }

  function syncMapData() {
    if (!mapReady || !map || !features.length) return;
    const src = map.getSource("turkey");
    if (src) src.setData({ type: "FeatureCollection", features: features });
  }

  function closePopup() {
    if (popup) { popup.remove(); popup = null; }
    popupId = null;
  }

  function openPopup(id) {
    if (!mapReady || !map || !byId[id] || !detailsMap) return;
    if (TEST) console.log("[popup] openPopup called id=" + id);
    closePopup();
    const f = byId[id];
    const p = f.properties;
    const det = detailsMap[id] || {};
    const c = REGION[p.group] || { en: "", zh: "" };

    const wrap = document.createElement("div");
    const nameRow = document.createElement("div");
    nameRow.className = "popup-name";
    nameRow.appendChild(document.createTextNode(p.name));
    if (p.nameZh) {
      const zh = document.createElement("span");
      zh.className = "zh";
      zh.textContent = p.nameZh;
      nameRow.appendChild(zh);
    }
    wrap.appendChild(nameRow);

    const meta = document.createElement("div");
    meta.className = "popup-loc";
    meta.textContent = (p.wh ? "\u2605 UNESCO World Heritage \u00b7 " : "") + c.en + " \u00b7 " + c.zh;
    wrap.appendChild(meta);

    const body = document.createElement("div");
    body.className = "popup-intro";
    body.textContent = lang === "zh" ? (det.introZh || det.intro || "") : (det.intro || det.introZh || "");
    wrap.appendChild(body);

    popup = new maplibregl.Popup({ offset: 14, maxWidth: "320px", closeButton: true, closeOnClick: false })
      .setLngLat(f.geometry.coordinates)
      .setDOMContent(wrap)
      .addTo(map);
    if (TEST) console.log("[popup] added to map");
    popup.on("close", function () { if (TEST) console.log("[popup] closed event"); popup = null; popupId = null; });
    popupId = id;
  }

  function fitMap() {
    if (!mapReady || !map) return;
    const b = new maplibregl.LngLatBounds();
    features.forEach(function (f) {
      b.extend(f.geometry.coordinates);
    });
    const wide = window.innerWidth > 900;
    map.fitBounds(b, { padding: { top: 130, right: wide ? 380 : 24, bottom: 90, left: 24 }, duration: 0, maxZoom: 6 });
  }

  function repaintSelection() {
    if (!mapReady || !map) return;
    map.setPaintProperty("turkey-pts", "circle-radius", [
      "case",
      ["==", ["id"], selectedId], 13,
      ["==", ["get", "wh"], true], 6.5,
      5.5
    ]);
  }

  /* ---------------- data ---------------- */

  function loadData() {
    return Promise.all([
      fetch(INDEX_URL).then(function (r) { return r.json(); }),
      fetch(DETAILS_URL).then(function (r) { return r.json(); })
    ]).then(function (res) {
      const fc = res[0];
      detailsMap = res[1];
      fc.features.forEach(function (f) {
        f.properties.pid = f.id;
        f.properties.regionEn = REGION[f.properties.group] ? REGION[f.properties.group].en : "";
        f.properties.regionZh = REGION[f.properties.group] ? REGION[f.properties.group].zh : "";
        features.push(f);
        byId[f.id] = f;
      });
    });
  }

  /* ---------------- filters ---------------- */

  function matches(f) {
    const p = f.properties;
    if (whOnly && !p.wh) return false;
    if (active.size && !active.has(p.group)) return false;
    const q = query;
    if (q) {
      const hay = (p.name + " " + (p.nameZh || "") + " " + (p.regionEn || "") + " " + (p.regionZh || "")).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  /* ---------------- list ---------------- */

  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text !== undefined && text !== null) d.textContent = text;
    return d;
  }

  function buildChips() {
    const wrap = $("tag-chips");
    wrap.innerHTML = "";

    REGIONS.forEach(function (c) {
      const b = el("button", "chip", c.en + " " + c.zh);
      b.type = "button";
      b.dataset.code = c.code;
      b.style.setProperty("--chip-color", c.color);
      if (active.has(c.code)) b.classList.add("active");
      b.addEventListener("click", function () {
        if (active.has(c.code)) active.delete(c.code); else active.add(c.code);
        buildChips(); buildList();
      });
      wrap.appendChild(b);
    });

    const wh = el("button", "chip", "\u2605 UNESCO World Heritage \u00b7 \u4e16\u754c\u9057\u4ea7");
    wh.type = "button";
    wh.style.setProperty("--chip-color", WH_COLOR);
    if (whOnly) wh.classList.add("active");
    wh.addEventListener("click", function () { whOnly = !whOnly; buildChips(); buildList(); });
    wrap.appendChild(wh);
  }

  function buildLegend() {
    // single hint row: gold halo = UNESCO World Heritage
    const lg = $("legend");
    lg.innerHTML = "";
    const item = el("div", "lg-item");
    const dot = el("span", "lg-dot");
    dot.style.background = WH_COLOR;
    item.appendChild(dot);
    item.appendChild(el("span", "", "\u2605 UNESCO World Heritage \u00b7 \u4e16\u754c\u9057\u4ea7 \u00b7 22 properties / " + countWH() + " points"));
    lg.appendChild(item);
  }

  function countWH() {
    return features.filter(function (f) { return f.properties.wh; }).length;
  }

  function buildList() {
    const listEl = $("list");
    listEl.innerHTML = "";

    const visible = features.filter(matches);
    if (!visible.length) {
      listEl.appendChild(el("div", "list-empty", query || whOnly || active.size
        ? "No matches \u65e0\u5339\u914d\u7ed3\u679c \u2014 adjust filters \u8c03\u6574\u7b5b\u9009\u6761\u4ef6"
        : "Loading\u2026"));
      return;
    }

    REGIONS.forEach(function (c) {
      const items = visible.filter(function (f) { return f.properties.group === c.code; });
      if (!items.length) return;

      const head = el("div", "type-head");
      const headDot = el("span", "c-dot");
      headDot.style.cssText = "display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:middle;background:" + c.color;
      head.appendChild(headDot);
      head.appendChild(document.createTextNode(c.en + " " + c.zh + "  (" + items.length + ")"));
      listEl.appendChild(head);

      items.forEach(function (f) {
        const row = el("div", "item");
        row.dataset.id = f.id;
        if (f.id === selectedId) row.classList.add("selected");
        const dot = el("span", "c-dot");
        dot.style.background = c.color;
        row.appendChild(dot);
        const nameWrap = el("span", "c-name");
        nameWrap.appendChild(el("span", "", f.properties.name));
        const zh = el("span", "c-zh", f.properties.nameZh || "");
        nameWrap.appendChild(zh);
        row.appendChild(nameWrap);
        if (f.properties.wh) row.appendChild(el("span", "c-wh", "\u2605"));
        row.addEventListener("click", function () { selectSite(f.id); });
        listEl.appendChild(row);
      });
    });
  }

  /* ---------------- selection / detail ---------------- */

  // Runs a step in isolation so one failure can never silently kill the rest.
  function step(label, fn) {
    try { fn(); }
    catch (err) { console.error("[" + label + "]", err); }
  }

  function selectSite(id) {
    if (!byId[id]) return;
    step("closePopup", closePopup);
    selectedId = id;
    step("repaintSelection", repaintSelection);
    step("buildList", buildList);
    step("renderDetail", renderDetail);
    if (window.innerWidth <= 820) {
      const sb = $("sidebar");
      if (sb && sb.classList.contains("open")) {
        sb.classList.remove("open");
        const h = $("sidebar-handle");
        if (h) h.style.display = "block";
      }
    }
    if (mapReady && map && byId[id]) {
      step("easeTo", function () {
        map.easeTo({ center: byId[id].geometry.coordinates, offset: [0, 0], zoom: Math.max(map.getZoom(), 7), duration: 600 });
      });
    }
  }

  // Selects a site and opens its intro popup, each failure isolated.
  function actOnSite(id) {
    if (!byId[id]) {
      console.error("actOnSite: unknown id", id);
      return;
    }
    step("selectSite", function () { selectSite(id); });
    step("openPopup", function () { openPopup(id); });
  }

  // Hit-test at a CSS-pixel point and act on the topmost site feature found.
  function handleClickAt(x, y) {
    if (TEST) console.log("[canvas click]", Math.round(x), Math.round(y));
    try {
      const hits = map.queryRenderedFeatures([x, y], { layers: ["turkey-pts", "turkey-wh-halo", "turkey-hit"] });
      for (let i = 0; i < hits.length; i++) {
        const id = hits[i].id || (hits[i].properties && hits[i].properties.pid);
        if (id && byId[id]) {
          if (TEST) console.log("[map hit]", id, byId[id].properties.name);
          actOnSite(id);
          return true;
        }
      }
    } catch (err) {
      console.error("[queryRenderedFeatures]", err);
    }
    return false;
  }

  function regionMeta(f) {
    return REGION[f.properties.group] || { en: "", zh: "", color: "#9aa7b5" };
  }

  function renderDetail() {
    const panel = $("detail");
    const content = $("detail-content");
    if (!selectedId || !byId[selectedId] || !detailsMap) {
      panel.classList.add("hidden");
      return;
    }
    const f = byId[selectedId];
    const det = detailsMap[selectedId] || {};
    const c = regionMeta(f);
    const p = f.properties;

    panel.classList.remove("hidden");
    if (collapsed) panel.classList.add("collapsed");

    const barTitle = $("detail-bar-title");
    barTitle.textContent = p.name + (p.nameZh ? " \u00b7 " + p.nameZh : "");
    const langBtn = $("lang-toggle");
    langBtn.textContent = lang === "zh" ? "EN" : "\u4e2d\u6587";

    content.innerHTML = "";

    const title = el("h2", "", p.name + " ");
    title.appendChild(el("span", "d-zh", p.nameZh || ""));
    content.appendChild(title);

    const badges = el("div", "");
    const regionBadge = el("span", "d-badge");
    regionBadge.style.background = c.color;
    regionBadge.textContent = c.en + " \u00b7 " + c.zh;
    badges.appendChild(regionBadge);
    if (p.wh) {
      const badge = el("span", "d-badge");
      badge.style.background = WH_COLOR;
      badge.style.marginLeft = "6px";
      badge.textContent = "UNESCO World Heritage \u00b7 \u4e16\u754c\u9057\u4ea7" + (det.whYear ? " (" + det.whYear + ")" : "");
      badges.appendChild(badge);
    }
    content.appendChild(badges);

    content.appendChild(el("p", "d-loc", det.location || ""));

    const intro = lang === "zh" ? det.introZh : det.intro;
    const sec = el("section", "");
    sec.appendChild(el("h3", "", lang === "zh" ? "\u7b80\u4ecb Intro" : "Intro \u7b80\u4ecb"));
    sec.appendChild(el("p", "", intro || ""));
    content.appendChild(sec);
  }

  /* ---------------- wiring ---------------- */

  function init() {
    // surface any runtime error in the console for debugging
    window.addEventListener("error", function (ev) {
      console.error("[window error]", ev.message || ev.error);
    });
    window.addEventListener("unhandledrejection", function (ev) {
      console.error("[unhandledrejection]", ev.reason);
    });

    const loading = $("loading");
    const handle = $("sidebar-handle");
    const closeBtn = $("sidebar-close");
    const searchEl = $("search");
    const clearBtn = $("clear-btn");
    const langBtn = $("lang-toggle");
    const detailToggle = $("detail-toggle");
    const detailPanel = $("detail");

    handle.addEventListener("click", function () {
      $("sidebar").classList.toggle("open");
      handle.style.display = "none";
    });
    closeBtn.addEventListener("click", function () {
      $("sidebar").classList.remove("open");
      handle.style.display = "block";
    });

    searchEl.addEventListener("input", function () {
      query = searchEl.value.trim().toLowerCase();
      buildList();
    });

    clearBtn.addEventListener("click", function () {
      active.clear();
      whOnly = false;
      query = "";
      searchEl.value = "";
      buildChips();
      buildList();
    });

    langBtn.addEventListener("click", function () {
      lang = lang === "zh" ? "en" : "zh";
      try { localStorage.setItem(langStore, lang); } catch (e) { /* ignore */ }
      renderDetail();
      if (popupId && mapReady && map) openPopup(popupId);
    });

    detailToggle.addEventListener("click", function () {
      collapsed = !collapsed;
      detailPanel.classList.toggle("collapsed", collapsed);
    });

    buildChips();
    buildLegend();
    buildList();

    initMap();

    loadData().then(function () {
      if (loading) loading.style.display = "none";
      const meta = $("meta-line");
      if (meta) meta.textContent = features.length + " sites \u00b7 22 UNESCO properties (" + countWH() + " points) \u00b7 7 regions";
      buildList();
      buildLegend();
      syncMapData();
      if (mapReady && map) fitMap();
    }).catch(function (err) {
      if (loading) loading.textContent = "Failed to load data \u52a0\u8f7d\u5931\u8d25 \u2014 try again later.";
      console.error("loadData failed:", err);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
