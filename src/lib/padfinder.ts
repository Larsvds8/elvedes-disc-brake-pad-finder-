/**
 * Datalaag + zoeklogica voor de Disc Brake Pad Finder.
 * Bron: src/data/padfinder.json (gegenereerd door scripts/build-data.mjs).
 */
import raw from "@/data/padfinder.json";
import padImageList from "@/data/padImages.json";
import brandLogoList from "@/data/brandLogos.json";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/* Padvorm-illustraties (uit de Elvedes-catalogus, p.13-17) — per familie-SKU
   een PNG in public/pads/. De catalogustekeningen zijn op ware grootte (1:1);
   de PNG's zijn gerenderd op 3× PDF-resolutie. Weergave op ware grootte:
   CSS-px = bronpixels ÷ 3 (naar PDF-punten) × 96/72 (punt → CSS-px) = ×4/9.
   padImages.json bevat de bronpixelmaten per SKU. */
const padImageDims = padImageList as unknown as Record<string, { w: number; h: number }>;

export type PadImageInfo = { src: string; cssWidth: number; cssHeight: number };

/* Officiële merklogo's (public/brands/) — alleen merken met een logo staan
   in brandLogos.json; de merktegel valt anders terug op alleen tekst. */
const brandLogos = brandLogoList as Record<string, string>;

export function brandLogo(merk: string): string | null {
  const file = brandLogos[merk];
  return file ? `${BASE_PATH}/brands/${file}` : null;
}

export function padImage(sku: string): PadImageInfo | null {
  const d = padImageDims[sku];
  if (!d) return null;
  return {
    src: `${BASE_PATH}/pads/${sku}.png`,
    cssWidth: Math.round((d.w * 4) / 9),
    cssHeight: Math.round((d.h * 4) / 9),
  };
}

/** Padvorm ingekleurd in de backplate-kleur van een compound
    (pads/<sku>-<code>.png, gegenereerd uit de catalogustekening). */
export function padImageForCompound(sku: string, code: CompoundCode): PadImageInfo | null {
  const base = padImage(sku);
  if (!base) return null;
  return { ...base, src: `${BASE_PATH}/pads/${sku}-${code}.png` };
}

/** Welke compounds bestaan er voor deze familie-SKU? */
export function compoundsForSku(sku: string): CompoundCode[] {
  return (data.skuDescriptions[sku] ?? []).map((g) => g.compound);
}

export type PadRecord = {
  merk: string;
  serie: string | null;
  model: string;
  padcode: string | null;
  /** Padcode zonder compound-suffix — voor weergave in het resultaat. */
  padcodeBase: string | null;
  oemArtikelnummers: string[];
  elvedesSku: string;
};

export type DescVariant = {
  artikelnummer: string;
  verpakking: string | null;
  omschrijving: string | null;
  specificaties: string | null;
  compatibel: string | null;
  equivalent: string | null;
};

/** Elvedes-compoundcodes: artikelnummer-suffix in het beschrijvingenbestand
    ("STD" = geen suffix). Volgorde = zacht → hard, zoals catalogus p.8. */
export type CompoundCode = "T" | "STD" | "MC" | "S";

export type CompoundGroup = {
  compound: CompoundCode;
  varianten: DescVariant[];
};

export type PadData = {
  generated: string;
  records: PadRecord[];
  skuDescriptions: Record<string, CompoundGroup[]>;
  oemIndex: Record<string, string[]>;
  skusZonderOmschrijving: string[];
};

export const data = raw as unknown as PadData;

/** Compound guide — catalogus 2026 p.8 "Step 1. Choose your compound".
    Scores: aantal sterren (0–5, halve toegestaan) per eigenschap. */
export type CompoundInfo = {
  code: CompoundCode;
  naam: string;
  materiaal: string;
  backplate: string;
  kleur: string;
  omschrijving: string;
  scores: { label: string; sterren: number }[];
};

export const COMPOUNDS: CompoundInfo[] = [
  {
    code: "T",
    naam: "Super Soft",
    materiaal: "resin / organisch",
    backplate: "grijs",
    kleur: "#9a9da0",
    omschrijving:
      "Super zachte organische compound voor maximaal remcomfort met minimaal geluid.",
    scores: [
      { label: "Remcomfort", sterren: 4 },
      { label: "Geluidsreductie", sterren: 5 },
      { label: "Remkracht", sterren: 3 },
      { label: "Slijtvastheid", sterren: 2 },
      { label: "Hittebestendigheid", sterren: 3 },
    ],
  },
  {
    code: "STD",
    naam: "Soft",
    materiaal: "resin / organisch",
    backplate: "blauw",
    kleur: "#29abe2",
    omschrijving:
      "Zachte organische compound voor een goede balans tussen remcomfort en remkracht.",
    scores: [
      { label: "Remcomfort", sterren: 5 },
      { label: "Geluidsreductie", sterren: 4 },
      { label: "Remkracht", sterren: 4 },
      { label: "Slijtvastheid", sterren: 3.5 },
      { label: "Hittebestendigheid", sterren: 3.5 },
    ],
  },
  {
    code: "MC",
    naam: "Medium",
    materiaal: "resin / organisch",
    backplate: "zwart",
    kleur: "#1d1d1b",
    omschrijving:
      "Medium organische compound voor krachtiger remvermogen en meer slijtvastheid.",
    scores: [
      { label: "Remcomfort", sterren: 4 },
      { label: "Geluidsreductie", sterren: 3 },
      { label: "Remkracht", sterren: 5 },
      { label: "Slijtvastheid", sterren: 4 },
      { label: "Hittebestendigheid", sterren: 4 },
    ],
  },
  {
    code: "S",
    naam: "Hard",
    materiaal: "metaal / gesinterd",
    backplate: "goud",
    kleur: "#d29a4a",
    omschrijving:
      "Harde gesinterde compound voor maximale weerstand, hitte- en slijtagebestendigheid.",
    scores: [
      { label: "Remcomfort", sterren: 3 },
      { label: "Geluidsreductie", sterren: 2 },
      { label: "Remkracht", sterren: 4 },
      { label: "Slijtvastheid", sterren: 5 },
      { label: "Hittebestendigheid", sterren: 5 },
    ],
  },
];

export const compoundInfo = (code: CompoundCode): CompoundInfo =>
  COMPOUNDS.find((c) => c.code === code)!;

/* ---------------- Cascade: merk → serie → model ---------------- */

export type BrandInfo = { name: string; modelCount: number; hasSeries: boolean };

let brandsCache: BrandInfo[] | null = null;
export function getBrands(): BrandInfo[] {
  if (brandsCache) return brandsCache;
  const map = new Map<string, { models: Set<string>; hasSeries: boolean }>();
  for (const r of data.records) {
    const e = map.get(r.merk) ?? { models: new Set<string>(), hasSeries: false };
    e.models.add(r.model);
    if (r.serie) e.hasSeries = true;
    map.set(r.merk, e);
  }
  brandsCache = [...map.entries()]
    .map(([name, e]) => ({ name, modelCount: e.models.size, hasSeries: e.hasSeries }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  return brandsCache;
}

export type SerieInfo = { name: string; modelCount: number };

export function getSeries(merk: string): SerieInfo[] {
  const map = new Map<string, Set<string>>();
  for (const r of data.records) {
    if (r.merk !== merk || !r.serie) continue;
    (map.get(r.serie) ?? map.set(r.serie, new Set()).get(r.serie)!).add(r.model);
  }
  return [...map.entries()]
    .map(([name, models]) => ({ name, modelCount: models.size }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

export type ModelInfo = { model: string; padcodes: string[]; skus: string[] };

/** Modellen binnen (merk, serie). serie=null → modellen zonder serie-niveau. */
export function getModels(merk: string, serie: string | null): ModelInfo[] {
  const map = new Map<string, { padcodes: Set<string>; skus: Set<string> }>();
  for (const r of data.records) {
    if (r.merk !== merk || (r.serie ?? null) !== serie) continue;
    const e = map.get(r.model) ?? { padcodes: new Set<string>(), skus: new Set<string>() };
    if (r.padcode) e.padcodes.add(r.padcode);
    e.skus.add(r.elvedesSku);
    map.set(r.model, e);
  }
  return [...map.entries()]
    .map(([model, e]) => ({ model, padcodes: [...e.padcodes], skus: [...e.skus].sort() }))
    .sort((a, b) => a.model.localeCompare(b.model, "nl", { numeric: true }));
}

/* ---------------- Resultaat ---------------- */

export type SkuResult = {
  sku: string;
  /** Unieke padcode-families (zonder compound-letter) — onderscheidt blokvormen. */
  padcodeBases: string[];
  oemArtikelnummers: string[];
  /** Compound-groepen (T/STD/MC/S) met per compound de verpakkingsvarianten;
      leeg = geen omschrijving beschikbaar. */
  compounds: CompoundGroup[];
  records: PadRecord[];
};

export function recordsForModel(merk: string, serie: string | null, model: string): PadRecord[] {
  return data.records.filter(
    (r) => r.merk === merk && (r.serie ?? null) === serie && r.model === model
  );
}

export function recordsForSku(sku: string): PadRecord[] {
  return data.records.filter((r) => r.elvedesSku === sku);
}

export function getSkuResults(records: PadRecord[]): SkuResult[] {
  const map = new Map<string, { padcodeBases: Set<string>; oems: Set<string>; records: PadRecord[] }>();
  for (const r of records) {
    const e = map.get(r.elvedesSku) ?? { padcodeBases: new Set<string>(), oems: new Set<string>(), records: [] };
    if (r.padcodeBase) e.padcodeBases.add(r.padcodeBase);
    for (const o of r.oemArtikelnummers) e.oems.add(o);
    e.records.push(r);
    map.set(r.elvedesSku, e);
  }
  return [...map.entries()]
    .map(([sku, e]) => ({
      sku,
      padcodeBases: [...e.padcodeBases].sort(),
      oemArtikelnummers: [...e.oems].sort(),
      compounds: data.skuDescriptions[sku] ?? [],
      records: e.records,
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku, "nl", { numeric: true }));
}

/** Compacte "past op"-samenvatting voor een SKU (voor zoekresultaat-kaarten). */
export function fitsSummary(sku: string): { items: string[]; total: number } {
  const seen = new Set<string>();
  for (const r of recordsForSku(sku)) seen.add(`${r.merk} ${r.model}`);
  const items = [...seen].sort((a, b) => a.localeCompare(b, "nl", { numeric: true }));
  return { items, total: items.length };
}

/* ---------------- Route B: directe zoekfunctie ---------------- */

const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "");

/* Jaartalbereiken in modelnamen ("Clara 2000 - 2001"): een zoekopdracht op een
   jaartal bínnen het bereik (bv. "Clara 2001" of "Louise 1999") moet ook raken. */
const YEAR_TOKEN_RE = /^(19|20)\d{2}$/;
const YEAR_RANGE_RE = /(19\d{2}|20\d{2})\s*[-–—]\s*(19\d{2}|20\d{2})/g;
function parseYearRanges(model: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of model.matchAll(YEAR_RANGE_RE)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    out.push([Math.min(a, b), Math.max(a, b)]);
  }
  return out;
}

type Prepped = {
  r: PadRecord;
  merk: string;
  serie: string;
  model: string;
  padcode: string;
  sku: string;
  oems: string[];
  yearRanges: [number, number][];
};

let preppedCache: Prepped[] | null = null;
function prepped(): Prepped[] {
  preppedCache ??= data.records.map((r) => ({
    r,
    merk: clean(r.merk),
    serie: r.serie ? clean(r.serie) : "",
    model: clean(r.model),
    padcode: r.padcode ? clean(r.padcode) : "",
    sku: clean(r.elvedesSku),
    oems: r.oemArtikelnummers.map(clean),
    yearRanges: parseYearRanges(r.model),
  }));
  return preppedCache;
}

/* Alle artikelnummer-varianten (compound- + verpakkingssuffix) per familie-SKU,
   zodat ook bv. "6854MC" of "6854T-BOX25" direct gevonden wordt. */
let variantIndexCache: Map<string, { clean: string; raw: string }[]> | null = null;
function variantIndex(): Map<string, { clean: string; raw: string }[]> {
  if (!variantIndexCache) {
    variantIndexCache = new Map();
    for (const [familie, groups] of Object.entries(data.skuDescriptions)) {
      const arts: { clean: string; raw: string }[] = [];
      for (const g of groups)
        for (const v of g.varianten)
          if (v.artikelnummer !== familie) arts.push({ clean: clean(v.artikelnummer), raw: v.artikelnummer });
      if (arts.length) variantIndexCache.set(familie, arts);
    }
  }
  return variantIndexCache;
}

function matchScore(value: string, q: string, exact: number, prefix: number, includes: number): number {
  if (!value || !q) return 0;
  if (value === q) return exact;
  if (value.startsWith(q)) return prefix;
  if (includes && q.length >= 3 && value.includes(q)) return includes;
  return 0;
}

/** Directe treffer (OEM-nummer / Elvedes-SKU / variant-artikelnummer / padcode)
    voor één record en één (deel)query. */
function directHit(p: Prepped, q: string): { score: number; label: string; matchArtikel?: string } {
  let score = 0;
  let label = "";
  let matchArtikel: string | undefined;
  for (let i = 0; i < p.oems.length; i++) {
    const s = matchScore(p.oems[i], q, 100, 80, 60);
    if (s > score) {
      score = s;
      label = `OEM-artikelnummer ${p.r.oemArtikelnummers[i]}`;
      matchArtikel = undefined;
    }
  }
  const sSku = matchScore(p.sku, q, 95, 75, 0);
  if (sSku > score) {
    score = sSku;
    label = `Elvedes-artikelnummer ${p.r.elvedesSku}`;
    matchArtikel = undefined;
  }
  for (const va of variantIndex().get(p.r.elvedesSku) ?? []) {
    const s = matchScore(va.clean, q, 95, 75, 0);
    if (s > score) {
      score = s;
      label = `Elvedes-artikelnummer ${va.raw}`;
      matchArtikel = va.raw;
    }
  }
  const sPad = matchScore(p.padcode, q, 90, 70, 55);
  if (sPad > score) {
    score = sPad;
    label = `padcode ${p.r.padcode}`;
    matchArtikel = undefined;
  }
  return { score, label, matchArtikel };
}

/** Modelscore voor een (deel)query, incl. jaartal-binnen-bereik
    (bv. query "2001" raakt model "Clara 2000 - 2001"). */
function modelScore(p: Prepped, q: string): number {
  const s = matchScore(p.model, q, 65, 50, 40);
  if (s) return s;
  if (YEAR_TOKEN_RE.test(q) && p.yearRanges.some(([a, b]) => Number(q) >= a && Number(q) <= b)) return 40;
  return 0;
}

/** Matcht dit losse zoekwoord ergens op merk, serie of model? */
function tokenMatches(p: Prepped, t: string): boolean {
  const inc = t.length >= 3 ? 1 : 0;
  return (
    matchScore(p.merk, t, 1, 1, inc) > 0 ||
    matchScore(p.serie, t, 1, 1, inc) > 0 ||
    modelScore(p, t) > 0
  );
}

export type SkuHit = {
  sku: string;
  score: number;
  matchLabel: string;
  /** Exact gematcht variant-artikelnummer (bv. "6854MC-BOX25") — voor voorselectie op de kaart. */
  matchArtikel?: string;
  records: PadRecord[];
};
export type ModelHit = { merk: string; serie: string | null; model: string; score: number; skus: string[] };

export type SearchResults = {
  query: string;
  brandHits: string[];
  skuHits: SkuHit[];
  modelHits: ModelHit[];
};

export function search(query: string): SearchResults {
  const tokens = query.split(/\s+/).map(clean).filter(Boolean);
  const q = tokens.join("");
  const empty: SearchResults = { query, brandHits: [], skuHits: [], modelHits: [] };
  if (q.length < 2) return empty;

  const skuMap = new Map<string, SkuHit>();
  const modelMap = new Map<string, ModelHit>();
  const brandSet = new Set<string>();

  for (const p of prepped()) {
    /* Merk- en/of serietokens vooraan wegstrippen, zodat "Shimano BR-9000",
       "Shimano Dura-Ace BR-9000" of "XTR BR-M950" hetzelfde vinden als het
       kale model/artikelnummer. Alleen tokens die dit record zelf raken
       worden geconsumeerd. */
    let rem = tokens;
    while (rem.length > 1) {
      const t = rem[0];
      const pre = t.length >= 3 ? 1 : 0;
      const isMerk = matchScore(p.merk, t, 1, pre, 0) > 0;
      const isSerie = p.serie ? matchScore(p.serie, t, 1, pre, 0) > 0 : false;
      if (!isMerk && !isSerie) break;
      rem = rem.slice(1);
    }
    const rq = rem.length < tokens.length ? rem.join("") : "";

    // Directe treffers: OEM-artikelnummer, Elvedes SKU, padcode → resultaatkaart
    let { score: direct, label, matchArtikel } = directHit(p, q);
    if (rq) {
      const d2 = directHit(p, rq);
      if (d2.score > direct) ({ score: direct, label, matchArtikel } = d2);
    }
    if (direct > 0) {
      const hit = skuMap.get(p.r.elvedesSku);
      if (!hit || direct > hit.score) {
        skuMap.set(p.r.elvedesSku, {
          sku: p.r.elvedesSku,
          score: direct,
          matchLabel: label,
          matchArtikel,
          records: [...(hit?.records ?? []), p.r],
        });
      } else {
        hit.records.push(p.r);
      }
    }

    // Teksttreffers: merk / serie / model → navigatie de cascade in
    if (matchScore(p.merk, q, 70, 55, 45) > 0) brandSet.add(p.r.merk);
    let mScore = Math.max(
      modelScore(p, q),
      matchScore(p.serie, q, 48, 42, 36)
    );
    // Query zonder merk-/serieprefix opnieuw tegen model en serie houden
    if (rq) mScore = Math.max(mScore, modelScore(p, rq), matchScore(p.serie, rq, 48, 42, 36));
    /* Vangnet voor meerwoordige zoekopdrachten ("clara 2001"): elk token moet
       ergens op merk, serie of model raken, en minstens één op het model. */
    if (mScore === 0 && tokens.length > 1) {
      if (tokens.every((t) => tokenMatches(p, t)) && tokens.some((t) => modelScore(p, t) > 0)) {
        mScore = 38;
      }
    }
    if (mScore > 0) {
      const key = `${p.r.merk}|${p.r.serie ?? ""}|${p.r.model}`;
      const hit = modelMap.get(key);
      if (!hit) {
        modelMap.set(key, {
          merk: p.r.merk,
          serie: p.r.serie,
          model: p.r.model,
          score: mScore,
          skus: [p.r.elvedesSku],
        });
      } else {
        hit.score = Math.max(hit.score, mScore);
        if (!hit.skus.includes(p.r.elvedesSku)) hit.skus.push(p.r.elvedesSku);
      }
    }
  }

  return {
    query,
    brandHits: [...brandSet].sort((a, b) => a.localeCompare(b, "nl")).slice(0, 8),
    skuHits: [...skuMap.values()].sort((a, b) => b.score - a.score).slice(0, 8),
    modelHits: [...modelMap.values()]
      .sort((a, b) => b.score - a.score || a.model.localeCompare(b.model, "nl", { numeric: true }))
      .slice(0, 40),
  };
}
