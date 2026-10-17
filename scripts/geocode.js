"use strict";

// Writes data/turkey-geometry.json from a curated coordinate table.
// Coordinates are listed in the same order as the entries in content/sites/<CODE>.md,
// so the build fails loudly if the content order changes without updating this table.

const fs = require("fs");
const path = require("path");
const { ROOT, REGIONS, inBbox, loadAllSites } = require("./lib/parse-sites.js");

const OUT = path.join(ROOT, "data", "turkey-geometry.json");

const COORDS = {
  MAR: [
    [41.0065, 28.9765], // Historic Areas of Istanbul (Hippodrome)
    [41.0086, 28.9802], // Hagia Sophia
    [41.0054, 28.9768], // Blue Mosque
    [41.0115, 28.9834], // Topkapı Palace
    [41.0108, 28.9680], // Grand Bazaar
    [41.0084, 28.9779], // Basilica Cistern
    [41.0162, 28.9639], // Süleymaniye Mosque
    [41.0256, 28.9741], // Galata Tower & Beyoğlu
    [41.0392, 29.0000], // Dolmabahçe Palace
    [41.0552, 29.0270], // Bosphorus cruise
    [41.0290, 28.9490], // Balat & Fener
    [40.9900, 29.0270], // Kadıköy & Moda
    [40.8570, 29.1200], // Princes' Islands
    [41.0312, 28.9392], // Chora Church
    [39.9575, 26.2389], // Troy
    [40.2370, 26.2830], // Gallipoli
    [39.4900, 26.3370], // Assos
    [39.8350, 26.0700], // Bozcaada
    [41.6780, 26.5590], // Selimiye Mosque
    [41.6770, 26.5560], // Edirne Old Town
    [40.4300, 29.7200], // İznik
    [40.1855, 29.0555], // Bursa historic core (Yeşil Türbe)
    [40.1750, 29.1720], // Cumalıkızık
    [40.1839, 29.0617], // Bursa Ulu Cami & Koza Han
    [40.0700, 29.2200]  // Uludağ
  ],
  AEG: [
    [37.9230, 29.1200], // Hierapolis-Pamukkale
    [37.9395, 27.3417], // Ephesus
    [39.1320, 27.1840], // Pergamon
    [37.7080, 28.7250], // Aphrodisias
    [38.4880, 28.0400], // Sardis & Bin Tepe
    [37.9500, 27.3670], // Basilica of St John & İsa Bey Mosque
    [37.9450, 27.4330], // Şirince
    [38.4237, 27.1428], // İzmir Kordon & Konak
    [38.4200, 27.1350], // Kemeraltı Bazaar
    [37.8580, 27.2600], // Kuşadası
    [37.5300, 27.2800], // Priene–Miletus–Didyma
    [37.0340, 27.4300], // Bodrum Castle & Mausoleum
    [37.1200, 27.3300], // Bodrum beaches
    [38.2800, 26.3700], // Çeşme & Alaçatı
    [38.6700, 26.7500], // Foça
    [39.3200, 26.6600], // Ayvalık & Cunda
    [38.7560, 30.5390], // Afyonkarahisar Ulu Cami
    [37.6780, 30.5200]  // Sagalassos
  ],
  MED: [
    [36.3560, 29.3180], // Xanthos
    [36.3350, 29.2900], // Letoon
    [36.8840, 30.7050], // Antalya Kaleiçi
    [36.8850, 30.6800], // Antalya Museum
    [36.9600, 30.7300], // Düden Waterfalls
    [36.9600, 30.8500], // Perge
    [36.9390, 31.1720], // Aspendos
    [36.7680, 31.3890], // Side
    [36.5440, 31.9980], // Alanya Castle
    [36.3960, 30.4720], // Olympos & Yanartaş
    [36.5240, 30.5520], // Phaselis
    [36.9820, 30.4650], // Termessos
    [37.1900, 31.1800], // Köprülü Canyon
    [36.2020, 29.6420], // Kaş
    [36.1900, 29.8500], // Kekova & Simena
    [36.2600, 29.3200], // Patara
    [36.6210, 29.1160], // Fethiye
    [36.5500, 29.1200], // Ölüdeniz
    [36.5100, 29.1000], // Butterfly Valley
    [36.4700, 29.4000], // Saklıkent Gorge
    [36.8340, 28.6420], // Dalyan & İztuzu
    [36.8550, 28.2740], // Marmaris
    [36.7530, 28.9400], // Göcek
    [36.2590, 29.9850], // Myra & St Nicholas
    [36.4600, 34.1400], // Kızkalesi & Cennet-Cehennem
    [36.9170, 34.8950], // Tarsus
    [36.2020, 36.1600]  // Antakya & St Pierre
  ],
  CAN: [
    [38.6430, 34.8290], // Göreme NP & Cappadocia
    [38.6400, 34.8450], // Göreme Open-Air Museum
    [38.6310, 34.8060], // Uçhisar Castle
    [38.3730, 34.7350], // Derinkuyu
    [38.3760, 34.7330], // Kaymaklı
    [38.6400, 34.8800], // Paşabağ & Devrent
    [38.7150, 34.8470], // Avanos
    [38.6310, 34.9130], // Ürgüp
    [38.2400, 34.3000], // Ihlara Valley
    [38.3000, 34.3000], // Selime Monastery
    [38.4000, 35.3000], // Soğanlı Valley
    [37.8710, 32.5040], // Mevlana Museum
    [37.8740, 32.4930], // Karatay Madrasa
    [37.9300, 32.4200], // Sille
    [37.6670, 32.8280], // Çatalhöyük
    [37.6770, 31.7260], // Eşrefoğlu Mosque
    [39.9250, 32.8370], // Anıtkabir
    [39.9370, 32.8600], // Museum of Anatolian Civilizations
    [39.9400, 32.8650], // Ankara Castle
    [39.6540, 31.9780], // Gordion
    [39.9400, 32.8700], // Ahi Şerafeddin Mosque
    [39.7700, 30.5250], // Odunpazarı
    [39.4500, 31.5360], // Sivrihisar Ulu Cami
    [39.3710, 38.1140], // Divriği
    [39.7500, 37.0150], // Sivas
    [38.5300, 35.4500], // Erciyes
    [38.7200, 35.4850], // Kayseri Bazaar & Kültepe
    [38.7500, 33.3800]  // Tuz Gölü
  ],
  BLS: [
    [40.0200, 34.6150], // Hattusha
    [40.2350, 34.6950], // Alacahöyük
    [41.2500, 32.6850], // Safranbolu
    [41.7460, 32.3860], // Amasra
    [41.4000, 33.7700], // Kastamonu & Mahmut Bey
    [42.0260, 35.1530], // Sinop
    [40.6530, 35.8330], // Amasya
    [41.2900, 36.3300], // Samsun
    [40.9840, 37.8790], // Ordu Boztepe
    [40.9120, 38.3890], // Giresun
    [41.0030, 39.7200], // Trabzon Hagia Sophia
    [40.6910, 39.6580], // Sümela
    [40.6200, 40.2900], // Uzungöl
    [40.9500, 41.1000], // Ayder
    [40.8500, 41.2000], // Kaçkar Mountains
    [41.0200, 40.5200], // Rize tea gardens
    [40.6100, 31.2800], // Abant Lake
    [40.9400, 31.7500], // Yedigöller
    [41.3500, 42.1000]  // Karagöl Sahara
  ],
  EAN: [
    [40.5070, 43.5720], // Ani
    [40.6010, 43.0970], // Kars
    [39.9040, 41.2700], // Erzurum
    [39.8500, 41.2500], // Palandöken
    [38.5000, 43.3400], // Van Castle
    [38.3410, 43.0360], // Akdamar Church
    [39.0200, 43.7500], // Muradiye Waterfalls
    [39.5200, 44.1300], // İshak Pasha Palace
    [39.7020, 44.2990], // Mount Ararat
    [38.3820, 38.3610], // Arslantepe
    [38.3550, 38.3090], // Malatya
    [38.4800, 39.4000], // Hazar Lake
    [39.2600, 38.5000]  // Kemaliye
  ],
  SAN: [
    [37.9810, 38.7410], // Nemrut Dağ
    [37.9150, 40.2400], // Diyarbakır Fortress
    [37.9120, 40.2390], // Diyarbakır Ulu Cami
    [37.2230, 38.9220], // Göbekli Tepe
    [37.1480, 38.7840], // Balıklıgöl
    [36.8600, 39.0300], // Harran
    [37.1600, 38.7900], // Şanlıurfa Bazaar
    [37.0660, 37.3790], // Zeugma Mosaic Museum
    [37.0660, 37.3820], // Gaziantep Castle
    [37.3130, 40.7350], // Mardin Old Town
    [37.3000, 40.7900], // Deyrulzafaran
    [37.4200, 41.3700], // Midyat & Tur Abdin
    [37.7140, 41.4140], // Hasankeyf
    [37.7800, 38.6200]  // Kahta
  ]
};

function main() {
  const groups = loadAllSites();
  const items = [];
  const problems = [];

  for (const g of groups) {
    const cc = g.region.code;
    const coords = COORDS[cc];
    if (!coords) throw new Error("No coordinate table for region " + cc);
    if (coords.length !== g.entries.length) {
      throw new Error(
        cc + ": coordinate table has " + coords.length +
        " rows but content has " + g.entries.length + " entries"
      );
    }
    for (let i = 0; i < g.entries.length; i++) {
      const e = g.entries[i];
      const lat = coords[i][0];
      const lon = coords[i][1];
      if (!inBbox(lat, lon)) {
        problems.push(cc + " ~ " + e.name + " -> " + lat + "," + lon);
      }
      items.push({ cc, name: e.name, lat, lon, src: "curated" });
      console.log("OK   " + cc + " [" + String(i + 1).padStart(2, "0") + "] " + e.name + " -> " + lat.toFixed(4) + "," + lon.toFixed(4));
    }
  }

  if (problems.length) {
    console.error("\nCoordinates outside Türkiye bbox:");
    problems.forEach((p) => console.error("  " + p));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), items }, null, 1) + "\n");
  console.log("\nWrote " + OUT);
  console.log("Resolved: " + items.length + "/" + items.length);
}

main();
