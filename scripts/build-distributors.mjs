/**
 * Distributeurslijst voor de Elvedes Disc Brake Pad Finder.
 *
 * Haalt:    https://elvedes.nl/en/find-distributor  (officiële lijst)
 * Schrijft: src/data/distributors.json  (land → distributeurs, met coördinaten)
 *
 * Coördinaten worden éénmalig gegeocodeerd via Nominatim (OpenStreetMap,
 * max 1 verzoek/seconde) en daarna hergebruikt uit de bestaande JSON, zodat
 * een verversing alleen nieuwe adressen opzoekt. Handmatig draaien wanneer
 * de lijst op elvedes.nl wijzigt: npm run build:distributors
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(repoRoot, "src", "data", "distributors.json");

const PAGE_URL = "https://elvedes.nl/en/find-distributor";
const UA = "elvedes-disc-brake-pad-finder/1.0 (build script; contact: info@elvedes.com)";

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

console.log("=== Distributeurslijst ===");
const res = await fetch(PAGE_URL, { headers: { "User-Agent": UA } });
if (!res.ok) {
  console.error(`Kon ${PAGE_URL} niet ophalen: HTTP ${res.status}`);
  process.exit(1);
}
const html = await res.text();

// Bestaande coördinaten hergebruiken (sleutel: naam + eerste adresregel)
let previous = {};
if (fs.existsSync(outFile)) {
  try {
    for (const c of JSON.parse(fs.readFileSync(outFile, "utf8")).countries) {
      for (const d of c.items) {
        if (d.lat != null) previous[`${d.name}|${d.address[0] ?? ""}`] = { lat: d.lat, lon: d.lon };
      }
    }
  } catch {
    previous = {};
  }
}

// Landen: <h2 id="distributor-XX" ...>Naam</h2> gevolgd door distributor__item-blokken
const countryBlocks = html.split(/<div class="distributor-overview__collection-country">/).slice(1);
const countries = [];
for (const block of countryBlocks) {
  const head = block.match(/id="distributor-([A-Z]{2})"[^>]*>\s*([^<]+)</);
  if (!head) continue;
  const code = head[1];
  const countryName = head[2].trim();

  const items = [];
  for (const itemHtml of block.split(/<div class="distributor__item">/).slice(1)) {
    const name = stripTags(itemHtml.match(/distributor__item-name">([\s\S]*?)<\/p>/)?.[1] ?? "");
    if (!name) continue;
    const addressHtml = itemHtml.match(/distributor__item-address">([\s\S]*?)<\/p>/)?.[1] ?? "";
    const address = addressHtml
      .split(/<br\s*\/?>/)
      .map((l) => stripTags(l))
      .filter(Boolean);
    const phoneBlock = itemHtml.match(/distributor__item-phone">([\s\S]*?)<\/p>/)?.[1];
    const phone = phoneBlock ? stripTags(phoneBlock) : null;
    const phoneHref = phoneBlock?.match(/href="(tel:[^"]+)"/)?.[1] ?? null;
    const email = itemHtml.match(/href="mailto:([^"]+)"/)?.[1] ?? null;
    const website = itemHtml.match(/distributor__item-website">[\s\S]*?href="([^"]+)"/)?.[1] ?? null;

    items.push({ name, address, phone, phoneHref, email, website, lat: null, lon: null });
  }
  if (items.length) countries.push({ code, name: countryName, items });
}

const total = countries.reduce((n, c) => n + c.items.length, 0);
console.log(`Landen: ${countries.length}, distributeurs: ${total}`);
if (total < 40) {
  console.error("Dat zijn er verdacht weinig — pagina-opmaak gewijzigd? Gestopt zonder te schrijven.");
  process.exit(1);
}

// Geocoderen (alleen adressen zonder bekende coördinaten)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lookups = 0;
for (const c of countries) {
  for (const d of c.items) {
    const key = `${d.name}|${d.address[0] ?? ""}`;
    if (previous[key]) {
      d.lat = previous[key].lat;
      d.lon = previous[key].lon;
      continue;
    }
    // Volledig adres eerst; lukt dat niet, dan alleen plaats + land
    const queries = [
      d.address.join(", "),
      d.address.slice(1).join(", "),
    ].filter(Boolean);
    for (const q of queries) {
      await sleep(1100);
      lookups++;
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=1` +
        `&countrycodes=${c.code.toLowerCase()}&q=${encodeURIComponent(q)}`;
      try {
        const g = await fetch(url, { headers: { "User-Agent": UA } });
        const hits = await g.json();
        if (Array.isArray(hits) && hits[0]) {
          d.lat = Math.round(parseFloat(hits[0].lat) * 1e5) / 1e5;
          d.lon = Math.round(parseFloat(hits[0].lon) * 1e5) / 1e5;
          break;
        }
      } catch {
        /* offline of Nominatim onbereikbaar: coördinaten blijven leeg */
      }
    }
    if (d.lat == null) console.warn(`  geen coördinaten: ${d.name} (${c.name})`);
  }
}
console.log(`Geocoding-verzoeken: ${lookups}`);

fs.writeFileSync(
  outFile,
  JSON.stringify({ generated: new Date().toISOString(), source: PAGE_URL, countries }) + "\n"
);
console.log(`Geschreven: ${path.relative(repoRoot, outFile)}`);
