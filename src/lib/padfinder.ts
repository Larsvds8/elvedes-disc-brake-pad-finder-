/**
 * Datalaag + zoeklogica voor de Disc Brake Pad Finder.
 * Bron: src/data/padfinder.json (gegenereerd door scripts/build-data.mjs).
 */
import raw from "@/data/padfinder.json";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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

export type PadData = {
  generated: string;
  records: PadRecord[];
  skuDescriptions: Record<string, DescVariant[]>;
  oemIndex: Record<string, string[]>;
  skusZonderOmschrijving: string[];
};

export const data = raw as unknown as PadData;

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
  /** Omschrijvingsvarianten (basis + verpakkingsvarianten); leeg = geen omschrijving. */
  varianten: DescVariant[];
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
      varianten: data.skuDescriptions[sku] ?? [],
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

type Prepped = {
  r: PadRecord;
  merk: string;
  serie: string;
  model: string;
  padcode: string;
  sku: string;
  oems: string[];
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
  }));
  return preppedCache;
}

function matchScore(value: string, q: string, exact: number, prefix: number, includes: number): number {
  if (!value || !q) return 0;
  if (value === q) return exact;
  if (value.startsWith(q)) return prefix;
  if (includes && q.length >= 3 && value.includes(q)) return includes;
  return 0;
}

export type SkuHit = { sku: string; score: number; matchLabel: string; records: PadRecord[] };
export type ModelHit = { merk: string; serie: string | null; model: string; score: number; skus: string[] };

export type SearchResults = {
  query: string;
  brandHits: string[];
  skuHits: SkuHit[];
  modelHits: ModelHit[];
};

export function search(query: string): SearchResults {
  const q = clean(query);
  const empty: SearchResults = { query, brandHits: [], skuHits: [], modelHits: [] };
  if (q.length < 2) return empty;

  const skuMap = new Map<string, SkuHit>();
  const modelMap = new Map<string, ModelHit>();
  const brandSet = new Set<string>();

  for (const p of prepped()) {
    // Directe treffers: OEM-artikelnummer, Elvedes SKU, padcode → resultaatkaart
    let direct = 0;
    let label = "";
    for (let i = 0; i < p.oems.length; i++) {
      const s = matchScore(p.oems[i], q, 100, 80, 60);
      if (s > direct) {
        direct = s;
        label = `OEM-artikelnummer ${p.r.oemArtikelnummers[i]}`;
      }
    }
    const sSku = matchScore(p.sku, q, 95, 75, 0);
    if (sSku > direct) {
      direct = sSku;
      label = `Elvedes-artikelnummer ${p.r.elvedesSku}`;
    }
    const sPad = matchScore(p.padcode, q, 90, 70, 55);
    if (sPad > direct) {
      direct = sPad;
      label = `padcode ${p.r.padcode}`;
    }
    if (direct > 0) {
      const hit = skuMap.get(p.r.elvedesSku);
      if (!hit || direct > hit.score) {
        skuMap.set(p.r.elvedesSku, {
          sku: p.r.elvedesSku,
          score: direct,
          matchLabel: label,
          records: [...(hit?.records ?? []), p.r],
        });
      } else {
        hit.records.push(p.r);
      }
    }

    // Teksttreffers: merk / serie / model → navigatie de cascade in
    if (matchScore(p.merk, q, 70, 55, 45) > 0) brandSet.add(p.r.merk);
    const mScore = Math.max(
      matchScore(p.model, q, 65, 50, 40),
      matchScore(p.serie, q, 48, 42, 36),
      matchScore(p.merk, q, 0, 0, 0) // merk alleen via brandHits
    );
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
