/**
 * Databouw voor de Elvedes Disc Brake Pad Finder.
 *
 * Leest:
 *  - data/Disc_brake_pad_Compatibility.xlsx  (tabblad "Compatibiliteit lang")  → hoofdbron
 *  - data/Beschrijvingen_Brake.xlsx          (tabblad "Disc brake pads")      → omschrijvingen
 *
 * Schrijft: src/data/padfinder.json
 *
 * Regels (afgestemd, zie prompt):
 *  - `Bron`-kolom volledig weglaten.
 *  - `Compound` alleen intern: controleren dat compound-varianten naar hetzelfde
 *    Elvedes SKU wijzen; expliciet flaggen als dat niet zo is. Niet in output.
 *  - `Artikelnummer(s)` splitsen op komma tot array + omgekeerde index (OEM → SKU).
 *  - Lege `Serie` → null (cascade slaat de stap over).
 *  - Omschrijvingen koppelen op basisartikelnummer (pakket-suffix strippen);
 *    ontbrekende SKU's loggen, geen placeholder-tekst genereren.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const norm = (v) => (v == null ? "" : String(v).trim());
const normHeader = (h) => norm(h).toLowerCase().replace(/\s+/g, " ");

function sheetRows(path, sheetName) {
  const wb = XLSX.read(readFileSync(path), { type: "buffer" });
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Tabblad "${sheetName}" niet gevonden in ${path}. Aanwezig: ${wb.SheetNames.join(", ")}`);
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
}

// Kolomnamen tolerant matchen op genormaliseerde header
function col(row, ...candidates) {
  for (const key of Object.keys(row)) {
    const nk = normHeader(key);
    if (candidates.some((c) => nk === normHeader(c) || nk.startsWith(normHeader(c)))) return norm(row[key]);
  }
  return "";
}

/* ---------- 1. Compatibiliteit lang ---------- */
const compatRows = sheetRows(join(root, "data/Disc_brake_pad_Compatibility.xlsx"), "Compatibiliteit lang");

const records = [];
const warnings = [];
for (const row of compatRows) {
  const merk = col(row, "Merk");
  const model = col(row, "Model");
  const sku = col(row, "Elvedes SKU");
  if (!merk && !model && !sku) continue; // lege rij
  if (!merk || !model || !sku) {
    warnings.push(`Onvolledige rij overgeslagen: merk="${merk}" model="${model}" sku="${sku}"`);
    continue;
  }
  const serie = col(row, "Serie") || null;
  const padcode = col(row, "Padcode (OEM)", "Padcode") || null;
  const oemRaw = col(row, "Artikelnummer(s)", "Artikelnummer");
  const compound = col(row, "Compound") || null; // alleen intern
  const oemArtikelnummers = oemRaw
    ? oemRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  records.push({ merk, serie, model, padcode, oemArtikelnummers, elvedesSku: sku, _compound: compound });
}

/* Padcode zonder compound-suffix (bv. "MDP 8.P" → "MDP 8") — voor weergave in het
   resultaat, waar de compound-letter nooit getoond mag worden. */
const stripCompound = (pc, compound) => {
  if (!pc) return null;
  if (compound && pc.toUpperCase().endsWith(`.${compound.toUpperCase()}`)) return pc.slice(0, -(compound.length + 1));
  return pc;
};

/* Compound-sanitycheck: compound-varianten binnen dezelfde padcode-FAMILIE
   (padcode zonder compound-suffix, bv. "MDP 8.P"/"MDP 8.R" → "MDP 8") moeten
   naar één SKU wijzen. Eén model mag wél meerdere families hebben (bv. Magura
   MT5: MDP 8.x → 6904 én MDP 9.x → 6902 — twee blokvormen, geen conflict). */
const compoundGroups = new Map();
for (const r of records) {
  if (!r._compound) continue;
  const key = `${r.merk}|${r.serie ?? ""}|${r.model}|${stripCompound(r.padcode, r._compound) ?? ""}`;
  if (!compoundGroups.has(key)) compoundGroups.set(key, new Set());
  compoundGroups.get(key).add(r.elvedesSku);
}
const compoundConflicts = [...compoundGroups.entries()].filter(([, skus]) => skus.size > 1);
for (const [key, skus] of compoundConflicts) {
  warnings.push(`⚠ COMPOUND-CONFLICT: ${key} wijst naar meerdere SKU's: ${[...skus].join(", ")}`);
}

/* Compound-varianten dedupliceren: zelfde (merk, serie, model, padcode-zonder-compound, sku) → één record.
   Padcodes blijven los zichtbaar in de selectiestap; we dedupen alleen exact identieke records. */
const seen = new Set();
const cleanRecords = [];
for (const r of records) {
  const key = `${r.merk}|${r.serie ?? ""}|${r.model}|${r.padcode ?? ""}|${r.elvedesSku}|${r.oemArtikelnummers.join(",")}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const { _compound, ...rest } = r;
  cleanRecords.push({ ...rest, padcodeBase: stripCompound(r.padcode, r._compound) });
}

/* ---------- 2. Beschrijvingen ---------- */
/* Artikelnummers in het beschrijvingenbestand coderen Elvedes-compound én
   verpakking: <familie><compound-suffix>[-verpakking], bv. "6854T-BOX25".
   Compound-suffixen (catalogus p.8, "Step 1. Choose your compound"):
     T   = Super Soft (grijze backplate, resin/organisch)
     ""  = Soft       (blauwe backplate, resin/organisch)  → code "STD"
     MC  = Medium     (zwarte backplate, resin/organisch)
     S   = Hard       (gouden backplate, metaal/gesinterd)
   De compatibiliteitstabel verwijst naar de kale familie-SKU (bv. 6854). */
const descRows = sheetRows(join(root, "data/Beschrijvingen_Brake.xlsx"), "Disc brake pads");

const stripSuffix = (art) => art.replace(/-(BOX\d*|CARD\d*|BAG\d*)$/i, "");
const COMPOUND_ORDER = ["T", "STD", "MC", "S"];
const parseArtikel = (art) => {
  const kern = stripSuffix(art);
  const m = kern.match(/^(\d+)(T|MC|S)?$/i);
  if (!m) return { familie: kern, compound: "STD", kernArtikel: kern };
  return { familie: m[1], compound: (m[2] || "STD").toUpperCase(), kernArtikel: kern };
};

const skuCompounds = {}; // familie-SKU → { compoundcode → [{artikelnummer, verpakking, ...}] }
for (const row of descRows) {
  const artikelnummer = col(row, "Artikelnummer");
  if (!artikelnummer) continue;
  const { familie, compound } = parseArtikel(artikelnummer);
  const entry = {
    artikelnummer,
    verpakking: col(row, "Verpakking") || null,
    omschrijving: col(row, "Omschrijving") || null,
    specificaties: col(row, "Specificaties / kenmerken", "Specificaties/kenmerken", "Specificaties") || null,
    compatibel: col(row, "Compatibele merken/modellen", "Compatibele merken / modellen") || null,
    equivalent: col(row, "Equivalente remblokken (OEM code/artikelnummer)", "Equivalente remblokken") || null,
  };
  ((skuCompounds[familie] ??= {})[compound] ??= []).push(entry);
}
/* Per familie: compounds in vaste volgorde (T → STD → MC → S), binnen een
   compound de kale kaartvariant eerst, dan de verpakkingsvarianten. */
const skuDescriptions = {}; // familie-SKU → [{compound, varianten}]
for (const familie of Object.keys(skuCompounds)) {
  const groups = [];
  for (const code of COMPOUND_ORDER) {
    const varianten = skuCompounds[familie][code];
    if (!varianten) continue;
    varianten.sort((a, b) =>
      (stripSuffix(a.artikelnummer) === a.artikelnummer ? 0 : 1) -
        (stripSuffix(b.artikelnummer) === b.artikelnummer ? 0 : 1) ||
      a.artikelnummer.localeCompare(b.artikelnummer, undefined, { numeric: true })
    );
    groups.push({ compound: code, varianten });
  }
  skuDescriptions[familie] = groups;
}

/* Welke SKU's uit de compatibiliteitstabel missen een omschrijving? */
const allSkus = [...new Set(cleanRecords.map((r) => r.elvedesSku))].sort();
const missingDesc = allSkus.filter((sku) => !skuDescriptions[sku]);

/* ---------- 3. Omgekeerde OEM-index ---------- */
const oemIndex = {}; // OEM-artikelnummer (genormaliseerd) → [Elvedes SKU's]
for (const r of cleanRecords) {
  for (const oem of r.oemArtikelnummers) {
    const key = oem.toUpperCase();
    (oemIndex[key] ??= new Set()).add(r.elvedesSku);
  }
}
for (const k of Object.keys(oemIndex)) oemIndex[k] = [...oemIndex[k]].sort();

/* ---------- 4. Wegschrijven ---------- */
const out = {
  generated: new Date().toISOString(),
  records: cleanRecords,
  skuDescriptions,
  oemIndex,
  skusZonderOmschrijving: missingDesc,
};
mkdirSync(join(root, "src/data"), { recursive: true });
writeFileSync(join(root, "src/data/padfinder.json"), JSON.stringify(out));

/* ---------- 5. Sanity-rapport ---------- */
const brands = [...new Set(cleanRecords.map((r) => r.merk))];
const brandsWithSerie = new Set(cleanRecords.filter((r) => r.serie).map((r) => r.merk));
console.log("=== Databouw sanity-check ===");
console.log(`Bronrijen (Compatibiliteit lang):  ${compatRows.length}`);
console.log(`Records na opschoning/dedup:       ${cleanRecords.length}`);
console.log(`Merken:                            ${brands.length}`);
console.log(`  waarvan met serie-niveau:        ${brandsWithSerie.size}`);
console.log(`Unieke modellen:                   ${new Set(cleanRecords.map((r) => r.model)).size}`);
console.log(`Unieke Elvedes SKU's:              ${allSkus.length}`);
console.log(`Losse OEM-artikelnummers in index: ${Object.keys(oemIndex).length}`);
console.log(`Omschrijvingsrijen ingelezen:      ${descRows.length} (families: ${Object.keys(skuDescriptions).length})`);
const compoundTelling = {};
for (const groups of Object.values(skuDescriptions))
  for (const g of groups) compoundTelling[g.compound] = (compoundTelling[g.compound] || 0) + 1;
console.log(`Compound-groepen per code:         ${COMPOUND_ORDER.map((c) => `${c}: ${compoundTelling[c] || 0}`).join(", ")}`);
console.log(`SKU's ZONDER omschrijving:         ${missingDesc.length} → ${missingDesc.join(", ") || "-"}`);
console.log(`Compound-conflicten:               ${compoundConflicts.length}`);
if (warnings.length) {
  console.log(`\n--- Waarschuwingen (${warnings.length}) ---`);
  for (const w of warnings) console.log(" ", w);
}
