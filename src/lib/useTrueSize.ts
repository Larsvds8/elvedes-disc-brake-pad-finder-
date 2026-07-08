"use client";
/**
 * Ware-grootte-weergave van de padvormen.
 *
 * Browsers kennen de fysieke maat van het scherm niet: standaard geldt
 * 96 CSS-px = 1 inch, wat maar op een deel van de schermen echt klopt.
 * Twee correcties:
 *  1. Zoomcompensatie — browserzoom verandert window.devicePixelRatio
 *     evenredig. Door te schalen met (dpr-referentie / dpr-nu) blijft de
 *     weergave fysiek even groot bij in- en uitzoomen.
 *  2. Kalibratie — de gebruiker legt een bankpas (85,60 mm breed) tegen
 *     het scherm en sleept een rechthoek even breed. De gevonden px/mm
 *     wordt met de dpr van dat moment in localStorage bewaard en geldt
 *     daarna voor dit apparaat.
 *
 * De hook geeft een schaalfactor terug t.o.v. de huidige CSS-maten
 * (die uitgaan van 96 dpi); 1 = ongewijzigd.
 */
import { useSyncExternalStore } from "react";

export const PX_PER_MM_DEFAULT = 96 / 25.4;
export const BANKPAS_MM = 85.6; // ISO/IEC 7810 ID-1
const CAL_KEY = "elvedes-truesize-cal"; // {"pxPerMm":..,"dpr":..}
const BASE_KEY = "elvedes-truesize-basedpr";

type Cal = { pxPerMm: number; dpr: number };

function readCal(): Cal | null {
  try {
    const raw = localStorage.getItem(CAL_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cal;
    if (!(c.pxPerMm > 0) || !(c.dpr > 0)) return null;
    return c;
  } catch {
    return null;
  }
}

/* Referentie zonder kalibratie: de dpr bij de eerste load van deze sessie
   nemen we aan als "100% zoom". Wie de pagina gezoomd opent en niet
   kalibreert, houdt de klassieke 96dpi-aanname voor die zoomstand. */
function baseDpr(): number {
  const dpr = window.devicePixelRatio || 1;
  try {
    const stored = sessionStorage.getItem(BASE_KEY);
    if (stored) return Number(stored) || dpr;
    sessionStorage.setItem(BASE_KEY, String(dpr));
  } catch {
    /* privémodus e.d.: dan geldt de huidige dpr als referentie */
  }
  return dpr;
}

let cal: Cal | null = null;
let calLoaded = false;
let scale = 1;
const listeners = new Set<() => void>();

function recompute() {
  if (!calLoaded) {
    cal = readCal();
    calLoaded = true;
  }
  const dpr = window.devicePixelRatio || 1;
  const ref = cal ?? { pxPerMm: PX_PER_MM_DEFAULT, dpr: baseDpr() };
  scale = (ref.pxPerMm * (ref.dpr / dpr)) / PX_PER_MM_DEFAULT;
}

/* dpr-wijzigingen (zoomen, venster naar ander scherm slepen) hebben geen
   eigen event; een resolution-mediaquery die precies nu matcht, vuurt
   zodra de dpr verandert. Daarna opnieuw bewapenen voor de nieuwe dpr. */
let armedFor = 0;
function arm() {
  const dpr = window.devicePixelRatio || 1;
  if (armedFor === dpr) return;
  armedFor = dpr;
  matchMedia(`(resolution: ${dpr}dppx)`).addEventListener(
    "change",
    () => {
      recompute();
      arm();
      for (const l of listeners) l();
    },
    { once: true }
  );
}

function subscribe(cb: () => void) {
  if (listeners.size === 0) {
    recompute();
    arm();
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = () => scale;
const getServerSnapshot = () => 1;

/** Schaalfactor voor alle op 96dpi berekende CSS-maten van padvormen. */
export function useTrueSizeScale(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Huidige CSS-px per mm (voor het kalibratiepaneel). */
export function currentPxPerMm(): number {
  return PX_PER_MM_DEFAULT * scale;
}

export function isCalibrated(): boolean {
  if (!calLoaded) {
    cal = readCal();
    calLoaded = true;
  }
  return cal !== null;
}

/** Sla een kalibratie op: gemeten breedte (CSS-px) van een bankpas. */
export function saveCalibration(bankpasCssPx: number) {
  cal = { pxPerMm: bankpasCssPx / BANKPAS_MM, dpr: window.devicePixelRatio || 1 };
  calLoaded = true;
  try {
    localStorage.setItem(CAL_KEY, JSON.stringify(cal));
  } catch {
    /* niet persistent, maar wel actief voor deze sessie */
  }
  recompute();
  for (const l of listeners) l();
}

export function clearCalibration() {
  cal = null;
  calLoaded = true;
  try {
    localStorage.removeItem(CAL_KEY);
  } catch {}
  recompute();
  for (const l of listeners) l();
}
