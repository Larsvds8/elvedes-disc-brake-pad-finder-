"use client";

import { useEffect, useMemo, useState } from "react";
import distributorData from "@/data/distributors.json";

/* ================================================================
   Vind een distributeur — officiële Elvedes-distributeurs
   (bron: elvedes.nl/en/find-distributor, zie scripts/build-distributors.mjs).
   Landkeuze vooraf ingevuld via de browsertaal; binnen een land filteren
   op naam/plaats of sorteren op afstand (alleen op https — geolocatie is
   onder file:// niet beschikbaar, dan blijft de knop verborgen).
   ================================================================ */

type Distributor = {
  name: string;
  address: string[];
  phone: string | null;
  phoneHref: string | null;
  email: string | null;
  website: string | null;
  lat: number | null;
  lon: number | null;
};

type Country = { code: string; name: string; items: Distributor[] };

const COUNTRIES = (distributorData as { countries: Country[] }).countries;

// Landnaam in het Nederlands via Intl; Engelse naam uit de bron als vangnet
function landNaam(code: string, fallback: string): string {
  try {
    return new Intl.DisplayNames(["nl"], { type: "region" }).of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

function afstandKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export default function DistributorFinder({ artikelnummer }: { artikelnummer: string }) {
  const [land, setLand] = useState("NL");
  const [zoek, setZoek] = useState("");
  const [positie, setPositie] = useState<{ lat: number; lon: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "bezig" | "fout">("idle");
  const [geoBeschikbaar, setGeoBeschikbaar] = useState(false);

  // Browsertaal → land voorselecteren (nl-BE → België); geolocatieknop alleen
  // tonen waar die kan werken (https). Beide pas na mount i.v.m. hydration.
  useEffect(() => {
    const regio = navigator.language?.split("-")[1]?.toUpperCase();
    if (regio && COUNTRIES.some((c) => c.code === regio)) setLand(regio);
    setGeoBeschikbaar(window.isSecureContext && "geolocation" in navigator);
  }, []);

  const opties = useMemo(
    () =>
      COUNTRIES.map((c) => ({ code: c.code, naam: landNaam(c.code, c.name) })).sort((a, b) =>
        a.naam.localeCompare(b.naam, "nl")
      ),
    []
  );

  const actief = COUNTRIES.find((c) => c.code === land);
  const q = zoek.trim().toLowerCase();
  const items = useMemo(() => {
    if (!actief) return [];
    let lijst = actief.items.filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.address.some((r) => r.toLowerCase().includes(q))
    );
    if (positie) {
      lijst = [...lijst].sort((a, b) => {
        const da =
          a.lat != null ? afstandKm(positie.lat, positie.lon, a.lat, a.lon!) : Infinity;
        const db =
          b.lat != null ? afstandKm(positie.lat, positie.lon, b.lat, b.lon!) : Infinity;
        return da - db;
      });
    }
    return lijst;
  }, [actief, q, positie]);

  function vraagLocatie() {
    setGeoStatus("bezig");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPositie({ lat: p.coords.latitude, lon: p.coords.longitude });
        setGeoStatus("idle");
      },
      () => setGeoStatus("fout"),
      { timeout: 10000, maximumAge: 600000 }
    );
  }

  function mailtoLink(d: Distributor): string {
    const onderwerp = `Beschikbaarheid Elvedes ${artikelnummer}`;
    const tekst =
      `Beste ${d.name},\n\n` +
      `Ik ben op zoek naar Elvedes schijfremblokken, artikelnummer ${artikelnummer}. ` +
      `Kunt u mij de beschikbaarheid en prijs doorgeven?\n\n` +
      `---\n\n` +
      `Dear ${d.name},\n\n` +
      `I am looking for Elvedes disc brake pads, part number ${artikelnummer}. ` +
      `Could you let me know the availability and price?\n\n` +
      `Met vriendelijke groet / Kind regards,`;
    return `mailto:${d.email}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(tekst)}`;
  }

  return (
    <details className="card__dist">
      <summary>Vind een distributeur</summary>
      <div className="dist">
        <p className="dist__intro">
          Officiële Elvedes-distributeurs (groothandel). Consument? Vraag naar Elvedes bij
          je fietsenmaker — die bestelt bij een van deze distributeurs.
        </p>

        <div className="dist__controls">
          <label className="dist__control">
            <span>Land</span>
            <select value={land} onChange={(e) => setLand(e.target.value)}>
              {opties.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.naam}
                </option>
              ))}
            </select>
          </label>
          {actief && actief.items.length > 4 && (
            <label className="dist__control">
              <span>Zoek op naam of plaats</span>
              <input
                type="search"
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="bijv. Apeldoorn"
              />
            </label>
          )}
          {geoBeschikbaar && !positie && actief && actief.items.length > 1 && (
            <button
              type="button"
              className="dist__geobtn"
              onClick={vraagLocatie}
              disabled={geoStatus === "bezig"}
            >
              {geoStatus === "bezig" ? "Locatie bepalen…" : "Sorteer op afstand"}
            </button>
          )}
          {geoStatus === "fout" && (
            <p className="dist__geofout">Locatie niet beschikbaar — sorteren op afstand kan nu niet.</p>
          )}
        </div>

        {items.length === 0 ? (
          <p className="dist__leeg">
            Geen distributeur gevonden{q ? " voor deze zoekterm" : " in dit land"}. Neem
            contact op met Elvedes via{" "}
            <a href="https://elvedes.nl/en/find-distributor" target="_blank" rel="noreferrer">
              elvedes.nl
            </a>
            .
          </p>
        ) : (
          <ul className="dist__list">
            {items.map((d) => {
              const km =
                positie && d.lat != null
                  ? Math.round(afstandKm(positie.lat, positie.lon, d.lat, d.lon!))
                  : null;
              const routeUrl =
                "https://www.google.com/maps/dir/?api=1&destination=" +
                encodeURIComponent(`${d.name}, ${d.address.join(", ")}`);
              return (
                <li key={`${d.name}-${d.address[0] ?? ""}`} className="dist__item">
                  <p className="dist__name">
                    {d.name}
                    {km != null && <span className="dist__km">{km} km</span>}
                  </p>
                  <p className="dist__address">{d.address.join(", ")}</p>
                  <p className="dist__links">
                    {d.phoneHref && <a href={d.phoneHref}>{d.phone}</a>}
                    {d.email && <a href={mailtoLink(d)}>Mail over {artikelnummer}</a>}
                    {d.website && (
                      <a href={d.website} target="_blank" rel="noreferrer">
                        Website
                      </a>
                    )}
                    <a href={routeUrl} target="_blank" rel="noreferrer">
                      Route
                    </a>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}
