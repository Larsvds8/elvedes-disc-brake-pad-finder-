"use client";

import { useEffect, useMemo, useState } from "react";
import {
  data,
  getBrands,
  getSeries,
  getModels,
  getSkuResults,
  recordsForModel,
  recordsForSku,
  fitsSummary,
  search,
  compoundInfo,
  padImage,
  COMPOUNDS,
  type DescVariant,
  type SkuResult,
  type ModelInfo,
} from "@/lib/padfinder";

/* ================================================================
   Hoofdcomponent — twee gelijkwaardige ingangen:
   Route A: gegidste cascade merk → serie → model
   Route B: direct zoeken op (OEM-)artikelnummer / tekst
   ================================================================ */
export default function PadFinder() {
  const [merk, setMerk] = useState<string | null>(null);
  // serie: undefined = nog niet gekozen, null = model hangt direct onder merk
  const [serie, setSerie] = useState<string | null | undefined>(undefined);
  const [model, setModel] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const brands = useMemo(getBrands, []);
  const brandInfo = merk ? brands.find((b) => b.name === merk) : undefined;

  const searching = query.trim().length >= 2;
  const results = useMemo(() => (searching ? search(query) : null), [query, searching]);

  const reset = () => {
    setMerk(null);
    setSerie(undefined);
    setModel(null);
  };

  const jumpToBrand = (b: string) => {
    reset();
    setMerk(b);
    setQuery("");
  };

  const jumpToModel = (m: string, s: string | null, mod: string) => {
    setMerk(m);
    setSerie(s);
    setModel(mod);
    setQuery("");
  };

  // Actuele stap in route A (alleen relevant wanneer er niet gezocht wordt)
  let step: "merk" | "serie" | "model" | "resultaat" = "merk";
  if (merk) {
    if (model) step = "resultaat";
    else if (brandInfo?.hasSeries && serie === undefined) step = "serie";
    else step = "model";
  }

  // Sticky zoekbalk zodra de hero (met de grote zoekbalk) uit beeld is
  const [stickyZichtbaar, setStickyZichtbaar] = useState(false);
  useEffect(() => {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const check = () => setStickyZichtbaar(hero.getBoundingClientRect().bottom < 0);
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <div className="finder">
      {/* Compacte sticky zoekbalk zodra de hero uit beeld scrolt */}
      <div
        className={`stickysearch${stickyZichtbaar ? " stickysearch--visible" : ""}`}
        aria-hidden={!stickyZichtbaar}
      >
        <div className="stickysearch__inner">
          <span className="stickysearch__label">Pad Finder</span>
          <input
            className="stickysearch__input"
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Zoek op artikelnummer, padcode of model…"
            aria-label="Zoek op artikelnummer, padcode of model"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            tabIndex={stickyZichtbaar ? 0 : -1}
          />
        </div>
      </div>

      {/* Donkere hero-band met titel + Route B: prominente zoekbalk */}
      <section className="hero">
        <div className="hero__inner">
          <h1 className="hero__title">
            Disc Brake
            <br />
            Pad Finder
          </h1>
          <p className="hero__subtitle">
            Vind het juiste Elvedes-remblok voor je schijfrem. Zoek direct op artikelnummer, of
            kies stap voor stap merk, serie en model.
          </p>
          <div className="searchbox" role="search" aria-label="Direct zoeken">
            <label className="searchbox__label" htmlFor="finder-search">
              Zoek op artikelnummer, padcode of model
            </label>
            <div className="searchbox__row">
              <input
                id="finder-search"
                className="searchbox__input"
                type="search"
                inputMode="search"
                autoComplete="off"
                placeholder="Bijv. Y8EP98010, 6859, A01S of Deore"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="searchbox__clear" type="button" onClick={() => setQuery("")}>
                  Wissen
                </button>
              )}
            </div>
            <p className="searchbox__hint">
              Werkt met OEM-bestelnummers (bijv. van je oude blokje), Elvedes-artikelnummers,
              padcodes en merk-/modelnamen.
            </p>
          </div>
        </div>
      </section>

      {searching && results ? (
        <SearchResultsView
          results={results}
          onBrand={jumpToBrand}
          onModel={jumpToModel}
        />
      ) : (
        <section className="cascade" aria-label="Kies merk, serie en model">
          <Breadcrumb
            merk={merk}
            serie={serie}
            model={model}
            onRoot={reset}
            onMerk={() => {
              setSerie(undefined);
              setModel(null);
            }}
            onSerie={() => setModel(null)}
          />

          {step === "merk" && <BrandStep brands={brands} onSelect={(b) => setMerk(b)} />}

          {step === "serie" && merk && (
            <SerieStep
              merk={merk}
              onSerie={(s) => setSerie(s)}
              onSerielessModel={(m) => {
                setSerie(null);
                setModel(m);
              }}
            />
          )}

          {step === "model" && merk && (
            <ModelStep merk={merk} serie={serie ?? null} onSelect={(m) => setModel(m)} />
          )}

          {step === "resultaat" && merk && model && (
            <ResultStep merk={merk} serie={serie ?? null} model={model} />
          )}
        </section>
      )}

      <CompoundGuide />
    </div>
  );
}

/* ================================================================
   Broodkruimelpad + opnieuw beginnen
   ================================================================ */
function Breadcrumb({
  merk,
  serie,
  model,
  onRoot,
  onMerk,
  onSerie,
}: {
  merk: string | null;
  serie: string | null | undefined;
  model: string | null;
  onRoot: () => void;
  onMerk: () => void;
  onSerie: () => void;
}) {
  if (!merk) return null;
  return (
    <nav className="crumbs" aria-label="Je selectie">
      <ol className="crumbs__list">
        <li>
          <button type="button" className="crumbs__link" onClick={onRoot}>
            Alle merken
          </button>
        </li>
        <li aria-current={!serie && !model ? "page" : undefined}>
          {serie || model ? (
            <button type="button" className="crumbs__link" onClick={onMerk}>
              {merk}
            </button>
          ) : (
            <span className="crumbs__current">{merk}</span>
          )}
        </li>
        {serie && (
          <li aria-current={!model ? "page" : undefined}>
            {model ? (
              <button type="button" className="crumbs__link" onClick={onSerie}>
                {serie}
              </button>
            ) : (
              <span className="crumbs__current">{serie}</span>
            )}
          </li>
        )}
        {model && (
          <li aria-current="page">
            <span className="crumbs__current">{model}</span>
          </li>
        )}
      </ol>
      <button type="button" className="crumbs__reset" onClick={onRoot}>
        Begin opnieuw
      </button>
    </nav>
  );
}

/* ================================================================
   Stap 1 — merkselectie (grid, geen dropdown)
   ================================================================ */
function BrandStep({
  brands,
  onSelect,
}: {
  brands: ReturnType<typeof getBrands>;
  onSelect: (merk: string) => void;
}) {
  return (
    <div className="step">
      <h2 className="step__title">Kies het merk van je rem</h2>
      <ul className="grid grid--brands">
        {brands.map((b) => (
          <li key={b.name}>
            <button type="button" className="tile tile--brand" onClick={() => onSelect(b.name)}>
              <span className="tile__badge" aria-hidden>
                {b.name[0]}
              </span>
              <span className="tile__text">
                <span className="tile__name">{b.name}</span>
                <span className="tile__meta">
                  {b.modelCount} {b.modelCount === 1 ? "model" : "modellen"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================================================================
   Stap 2 — serie (alleen voor merken mét series); modellen zonder
   serie staan er direct onder
   ================================================================ */
function SerieStep({
  merk,
  onSerie,
  onSerielessModel,
}: {
  merk: string;
  onSerie: (serie: string) => void;
  onSerielessModel: (model: string) => void;
}) {
  const series = useMemo(() => getSeries(merk), [merk]);
  const seriele = useMemo(() => getModels(merk, null), [merk]);
  return (
    <div className="step">
      <h2 className="step__title">Kies de serie</h2>
      <ul className="grid grid--series">
        {series.map((s) => (
          <li key={s.name}>
            <button type="button" className="tile" onClick={() => onSerie(s.name)}>
              <span className="tile__name">{s.name}</span>
              <span className="tile__meta">
                {s.modelCount} {s.modelCount === 1 ? "model" : "modellen"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {seriele.length > 0 && (
        <>
          <h3 className="step__subtitle">Modellen zonder serie</h3>
          <ModelGrid models={seriele} onSelect={onSerielessModel} />
        </>
      )}
    </div>
  );
}

/* ================================================================
   Stap 3 — model/padcode-selectie
   ================================================================ */
function ModelStep({
  merk,
  serie,
  onSelect,
}: {
  merk: string;
  serie: string | null;
  onSelect: (model: string) => void;
}) {
  const models = useMemo(() => getModels(merk, serie), [merk, serie]);
  const [filter, setFilter] = useState("");
  const filtered = filter.trim()
    ? models.filter((m) =>
        `${m.model} ${m.padcodes.join(" ")}`.toLowerCase().includes(filter.trim().toLowerCase())
      )
    : models;

  return (
    <div className="step">
      <h2 className="step__title">Kies het model of remsysteem</h2>
      {models.length > 12 && (
        <input
          className="step__filter"
          type="search"
          placeholder={`Filter ${models.length} modellen…`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter modellen"
        />
      )}
      {filtered.length === 0 ? (
        <p className="step__empty">Geen modellen gevonden voor &ldquo;{filter}&rdquo;.</p>
      ) : (
        <ModelGrid models={filtered} onSelect={onSelect} />
      )}
    </div>
  );
}

function ModelGrid({ models, onSelect }: { models: ModelInfo[]; onSelect: (m: string) => void }) {
  return (
    <ul className="grid grid--models">
      {models.map((m) => (
        <li key={m.model}>
          <button type="button" className="tile tile--model" onClick={() => onSelect(m.model)}>
            <span className="tile__name">{m.model}</span>
            {m.padcodes.length > 0 && (
              <span className="tile__meta tile__meta--padcodes">{m.padcodes.join(" · ")}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ================================================================
   Stap 4 — resultaat
   ================================================================ */
function ResultStep({ merk, serie, model }: { merk: string; serie: string | null; model: string }) {
  const skuResults = useMemo(
    () => getSkuResults(recordsForModel(merk, serie, model)),
    [merk, serie, model]
  );
  return (
    <div className="step">
      <h2 className="step__title">
        Passend Elvedes-remblok voor {merk} {model}
      </h2>
      {skuResults.length > 1 && (
        <p className="step__note">
          Voor dit model bestaan {skuResults.length} verschillende bloktypes. Vergelijk de
          padcode/blokvorm met je oude remblok.
        </p>
      )}
      <div className="results">
        {skuResults.map((res) => (
          <ResultCard key={res.sku} result={res} />
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   Resultaatkaart per Elvedes SKU — compound-keuze (T/STD/MC/S) met
   daarbinnen de verpakkingsvarianten als chips
   ================================================================ */
function ResultCard({
  result,
  matchLabel,
  matchArtikel,
  showFits,
}: {
  result: SkuResult;
  matchLabel?: string;
  /** Exact gezocht variant-artikelnummer → die compound/verpakking voorselecteren. */
  matchArtikel?: string;
  showFits?: boolean;
}) {
  const { sku, compounds, padcodeBases, oemArtikelnummers } = result;
  // Voorselectie: het gematchte variant-artikelnummer, anders Soft (blauw, zonder suffix)
  let initComp = Math.max(0, compounds.findIndex((c) => c.compound === "STD"));
  let initVar = 0;
  if (matchArtikel) {
    for (let ci = 0; ci < compounds.length; ci++) {
      const vi = compounds[ci].varianten.findIndex((v) => v.artikelnummer === matchArtikel);
      if (vi >= 0) {
        initComp = ci;
        initVar = vi;
        break;
      }
    }
  }
  const [compIdx, setCompIdx] = useState(initComp);
  const [varIdx, setVarIdx] = useState(initVar);
  const group = compounds[compIdx] ?? compounds[0];
  const varianten = group?.varianten ?? [];
  const variant: DescVariant | undefined = varianten[varIdx] ?? varianten[0];
  // Kaal artikelnummer van de gekozen compound (zonder verpakkingssuffix)
  const kernArtikel = group ? sku + (group.compound === "STD" ? "" : group.compound) : sku;
  const specs = variant?.specificaties
    ? variant.specificaties.split("|").map((s) => s.trim()).filter(Boolean)
    : [];
  const fits = showFits ? fitsSummary(sku) : null;

  return (
    <article className="card" aria-label={`Elvedes ${sku}`}>
      {matchLabel && <p className="card__match">Gevonden via {matchLabel}</p>}
      <header className="card__head">
        <div>
          <p className="card__kicker">Elvedes-artikelnummer</p>
          <p className="card__sku">{variant ? variant.artikelnummer : sku}</p>
        </div>
        {padImage(sku) && (
          <figure className="card__shape">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={padImage(sku)!} alt={`Padvorm van Elvedes ${sku}`} />
            <figcaption>Padvorm</figcaption>
          </figure>
        )}
      </header>

      {compounds.length > 0 && (
        <div className="card__compounds">
          <p className="card__grouplabel" id={`compounds-${sku}`}>
            Compound
          </p>
          <div className="card__chips" role="group" aria-labelledby={`compounds-${sku}`}>
            {compounds.map((c, i) => {
              const info = compoundInfo(c.compound);
              const actief = i === compIdx;
              return (
                <button
                  key={c.compound}
                  type="button"
                  className={`chip chip--compound${actief ? " chip--active" : ""}`}
                  // Actieve chip licht op in de backplate-kleur van de compound
                  style={actief ? { background: info.kleur, borderColor: info.kleur } : undefined}
                  aria-pressed={actief}
                  onClick={() => {
                    setCompIdx(i);
                    setVarIdx(0);
                  }}
                >
                  {!actief && (
                    <span className="chip__dot" style={{ background: info.kleur }} aria-hidden />
                  )}
                  {info.naam}
                </button>
              );
            })}
          </div>
          <p className="card__compoundhint">
            <a href="#compound-guide">Welke compound past bij mijn fiets? Bekijk de compound guide ↓</a>
          </p>
        </div>
      )}

      {varianten.length > 1 && (
        <div className="card__verpakking">
          <p className="card__grouplabel" id={`verpakking-${sku}`}>
            Verpakking
          </p>
          <div className="card__chips" role="group" aria-labelledby={`verpakking-${sku}`}>
            {varianten.map((v, i) => (
              <button
                key={v.artikelnummer}
                type="button"
                className={`chip${i === varIdx ? " chip--active" : ""}`}
                aria-pressed={i === varIdx}
                onClick={() => setVarIdx(i)}
              >
                {v.artikelnummer === kernArtikel
                  ? "Kaart (1 paar)"
                  : v.artikelnummer.slice(kernArtikel.length + 1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {variant ? (
        <>
          {variant.verpakking && <p className="card__packaging">{variant.verpakking}</p>}
          {variant.omschrijving && <p className="card__desc">{variant.omschrijving}</p>}
          {specs.length > 0 && (
            <dl className="card__specs">
              {specs.map((s) => {
                const [k, ...rest] = s.split(":");
                const val = rest.join(":").trim();
                return val ? (
                  <div className="card__specrow" key={s}>
                    <dt>{k.trim()}</dt>
                    <dd>{val}</dd>
                  </div>
                ) : (
                  <div className="card__specrow" key={s}>
                    <dt>{s}</dt>
                    <dd />
                  </div>
                );
              })}
            </dl>
          )}
        </>
      ) : (
        <p className="card__nodesc">
          Voor dit artikelnummer is nog geen omschrijving beschikbaar in het beschrijvingenbestand.
        </p>
      )}

      {(padcodeBases.length > 0 || oemArtikelnummers.length > 0) && (
        <div className="card__ref">
          {padcodeBases.length > 0 && (
            <p>
              <span className="card__reflabel">Vervangt padcode</span> {padcodeBases.join(", ")}
            </p>
          )}
          {oemArtikelnummers.length > 0 && (
            <p>
              <span className="card__reflabel">OEM-artikelnummer(s)</span>{" "}
              {oemArtikelnummers.join(", ")}
            </p>
          )}
        </div>
      )}

      {fits && fits.total > 0 && (
        <details className="card__fits">
          <summary>
            Past op {fits.total} {fits.total === 1 ? "model" : "modellen"}
          </summary>
          <ul>
            {fits.items.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

/* ================================================================
   Route B — zoekresultaten
   ================================================================ */
function SearchResultsView({
  results,
  onBrand,
  onModel,
}: {
  results: ReturnType<typeof search>;
  onBrand: (merk: string) => void;
  onModel: (merk: string, serie: string | null, model: string) => void;
}) {
  const { brandHits, skuHits, modelHits, query } = results;
  const skuResults = useMemo(
    () =>
      skuHits.map((h) => ({
        hit: h,
        result: getSkuResults(recordsForSku(h.sku)).find((r) => r.sku === h.sku)!,
      })),
    [skuHits]
  );
  const nothing = brandHits.length === 0 && skuHits.length === 0 && modelHits.length === 0;

  return (
    <section className="searchresults" aria-label="Zoekresultaten" aria-live="polite">
      {nothing && (
        <p className="searchresults__empty">
          Geen resultaten voor &ldquo;{query}&rdquo;. Controleer het nummer, of kies hierboven via
          merk en model.
        </p>
      )}

      {skuResults.length > 0 && (
        <div className="searchresults__block">
          <h2 className="step__title">Direct gevonden</h2>
          <div className="results">
            {skuResults.map(({ hit, result }) => (
              <ResultCard
                key={`${hit.sku}|${hit.matchArtikel ?? ""}`}
                result={result}
                matchLabel={hit.matchLabel}
                matchArtikel={hit.matchArtikel}
                showFits
              />
            ))}
          </div>
        </div>
      )}

      {brandHits.length > 0 && (
        <div className="searchresults__block">
          <h2 className="step__title">Merken</h2>
          <ul className="grid grid--brands">
            {brandHits.map((b) => (
              <li key={b}>
                <button type="button" className="tile tile--brand" onClick={() => onBrand(b)}>
                  <span className="tile__badge" aria-hidden>
                    {b[0]}
                  </span>
                  <span className="tile__text">
                    <span className="tile__name">{b}</span>
                    <span className="tile__meta">Bekijk modellen</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modelHits.length > 0 && (
        <div className="searchresults__block">
          <h2 className="step__title">Modellen</h2>
          <ul className="hitlist">
            {modelHits.map((h) => (
              <li key={`${h.merk}|${h.serie ?? ""}|${h.model}`}>
                <button
                  type="button"
                  className="hitlist__row"
                  onClick={() => onModel(h.merk, h.serie, h.model)}
                >
                  <span className="hitlist__path">
                    {h.merk}
                    {h.serie ? ` › ${h.serie}` : ""} › <strong>{h.model}</strong>
                  </span>
                  <span className="hitlist__skus">
                    Elvedes {h.skus.join(", ")} <span aria-hidden>→</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!nothing && (
        <p className="searchresults__count">
          Doorzocht: {data.records.length} merk/model-combinaties.
        </p>
      )}
    </section>
  );
}

/* ================================================================
   Compound guide — Elvedes-catalogus p.8, "Step 1. Choose your compound".
   Vier compounds van zacht naar hard, herkenbaar aan de backplate-kleur.
   ================================================================ */

/* Gestileerd remblok-icoon in de backplate-kleur van de compound */
function PadIcon({ kleur, grootte = 52 }: { kleur: string; grootte?: number }) {
  return (
    <svg
      className="compoundcard__icon"
      width={grootte}
      height={Math.round(grootte * 0.72)}
      viewBox="0 0 120 86"
      aria-hidden
    >
      {/* montagelip met gat */}
      <path d="M48 2h24v22H48z" fill={kleur} />
      <circle cx="60" cy="12" r="5" fill="#fff" />
      {/* backplate */}
      <path d="M6 22h108c2 0 4 2 4 4v40c0 8-6 12-12 13-30 5-62 5-92 0C8 78 2 74 2 66V26c0-2 2-4 4-4z" fill={kleur} />
      {/* remvoering */}
      <path d="M14 32h92c2 0 4 2 4 4v26c0 5-4 8-8 9-28 4-56 4-84 0-4-1-8-4-8-9V36c0-2 2-4 4-4z" fill="#3f3b3a" />
    </svg>
  );
}

/* Ster-icoon; vulling van de rij via breedte-clip (16px per ster) */
const STER_PAD =
  "M12 2.6l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.2l-5.7 3 1.1-6.4L2.8 9.3l6.4-.9z";
const STER_BREEDTE = 16;

function StarRow() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={STER_BREEDTE} height={STER_BREEDTE} viewBox="0 0 24 24">
          <path d={STER_PAD} fill="currentColor" />
        </svg>
      ))}
    </>
  );
}

function Stars({ waarde, kleur, label }: { waarde: number; kleur: string; label: string }) {
  return (
    <span
      className="stars"
      style={{ color: kleur }}
      role="img"
      aria-label={`${label}: ${waarde} van 5 sterren`}
    >
      <span className="stars__bg" aria-hidden>
        <StarRow />
      </span>
      <span className="stars__fill" style={{ width: `${waarde * STER_BREEDTE}px` }} aria-hidden>
        <StarRow />
      </span>
    </span>
  );
}

function CompoundGuide() {
  return (
    <section className="compoundguide" id="compound-guide" aria-label="Compound guide">
      <div className="compoundguide__inner">
        <h2 className="step__title">Compound guide: kies de juiste hardheid</h2>
        <p className="compoundguide__intro">
          Elvedes levert schijfremblokken in vier compounds van verschillende hardheid, elk met
          eigen sterke punten en herkenbaar aan de kleur van de backplate. Kies op basis van het
          type fiets en het gebruik.
        </p>
        <div className="compoundguide__grid">
          {COMPOUNDS.map((c) => (
            <article className="compoundcard" key={c.code} aria-label={`Compound ${c.naam}`}>
              <div className="compoundcard__swatch" style={{ background: c.kleur }} aria-hidden />
              <div className="compoundcard__head">
                <div>
                  <h3 className="compoundcard__name">{c.naam}</h3>
                  <p className="compoundcard__meta">
                    {c.materiaal} · backplate {c.backplate}
                    {c.code !== "STD" && (
                      <>
                        {" "}
                        · suffix <strong>{c.code}</strong>
                      </>
                    )}
                  </p>
                </div>
                <PadIcon kleur={c.kleur} />
              </div>
              <p className="compoundcard__desc">{c.omschrijving}</p>
              <dl className="compoundcard__scores">
                {c.scores.map((s) => (
                  <div className="compoundcard__scorerow" key={s.label}>
                    <dt>{s.label}</dt>
                    <dd>
                      <Stars waarde={s.sterren} kleur={c.kleur} label={s.label} />
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <p className="compoundguide__note">
          Tip: nieuwe remblokken altijd inremmen (bedding-in). Dat verbetert de remkracht,
          verlengt de levensduur en voorkomt geluid en ongelijkmatige slijtage.
        </p>
      </div>
    </section>
  );
}
