/**
 * Packshot-manifest voor de Elvedes Disc Brake Pad Finder.
 *
 * Scant:   public/packshots/  op verpakkingsfoto's uit de fotodatabase
 *          (S:\Fotodatabase\CAT. 12.0\Brake\Disc brake pads).
 * Schrijft: src/data/packshots.json  (artikelnummer → bestandsnaam)
 *
 * Naamconventie fotodatabase: <artikelnummer>_<volgnummer>.<ext>;
 * volgnummer 2 is altijd de foto van de verpakkingseenheid. Dus:
 *   6850_2.jpg         → verpakking van 6850 (kaart, 1 paar)
 *   6850S-BOX25_2.jpg  → verpakking van 6850S-BOX25 (werkplaatsdoos 25 sets)
 * Matching is hoofdletterongevoelig; jpg/jpeg/png/webp/avif worden herkend.
 *
 * Draait mee in `npm run build` (vóór next build), dus foto's die aan de map
 * worden toegevoegd verschijnen automatisch bij de volgende deploy.
 */
import { readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public/packshots");

const IMG_RE = /^(.+)_2\.(jpe?g|png|webp|avif)$/i;

const manifest = {};
let overgeslagen = 0;
if (existsSync(dir)) {
  for (const file of readdirSync(dir).sort()) {
    const m = file.match(IMG_RE);
    if (!m) {
      if (!/^(readme|\.)/i.test(file)) overgeslagen++;
      continue;
    }
    // Sleutel = artikelnummer, genormaliseerd naar hoofdletters ("6850s-box25" → "6850S-BOX25")
    manifest[m[1].toUpperCase()] = file;
  }
}

mkdirSync(join(root, "src/data"), { recursive: true });
writeFileSync(join(root, "src/data/packshots.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log("=== Packshot-manifest ===");
console.log(`Verpakkingsfoto's gevonden (…_2):  ${Object.keys(manifest).length}`);
if (overgeslagen) console.log(`Overgeslagen bestanden (geen _2):  ${overgeslagen}`);
