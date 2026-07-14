/**
 * File://-build van de Elvedes Disc Brake Pad Finder.
 *
 * Maakt een export in ../lokaal/ die zonder webserver werkt: dubbelklik op
 * lokaal/index.html en de finder opent in de browser via file://.
 *
 * Werkwijze: normale statische export met NEXT_PUBLIC_BASE_PATH="." (maakt de
 * afbeeldingspaden in de app relatief), daarna worden de door Next gegenereerde
 * absolute /_next/-paden herschreven naar relatieve paden. Een relatieve
 * assetPrefix kan niet (next/font weigert die), vandaar deze nabewerking.
 * Tot slot wordt out/ met git teruggezet zodat de werkboom schoon blijft.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, "out");
const lokaalDir = path.join(repoRoot, "lokaal");

function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (r.status !== 0) {
    console.error(`\nStap mislukt: ${cmd} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

const node = process.execPath;
const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");

console.log("=== Lokale file://-build ===");
run(node, [path.join(repoRoot, "scripts", "build-data.mjs")]);
run(node, [path.join(repoRoot, "scripts", "build-packshots.mjs")]);
run(node, [nextBin, "build"], { NEXT_PUBLIC_BASE_PATH: "." });

// out/ → lokaal/ verplaatsen
fs.rmSync(lokaalDir, { recursive: true, force: true });
fs.renameSync(outDir, lokaalDir);

// Absolute /_next/-paden relatief maken, per bestandsdiepte (404/index.html
// zit één niveau diep en heeft ../_next/ nodig).
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let htmlCount = 0;
for (const file of walk(lokaalDir)) {
  const rel = path.relative(lokaalDir, file);
  if (!/\.(html|txt)$/.test(file)) continue;
  const depth = rel.split(path.sep).length - 1;
  const prefix = depth === 0 ? "./" : "../".repeat(depth);
  const src = fs.readFileSync(file, "utf8");
  const dst = src.replaceAll('"/_next/', `"${prefix}_next/`);
  if (dst !== src) {
    fs.writeFileSync(file, dst);
    htmlCount++;
  }
}

// CSS: lettertypen worden geladen als url(/_next/static/media/…); de CSS zelf
// staat in _next/static/css/, dus ../media/ komt op dezelfde plek uit.
let cssCount = 0;
const cssDir = path.join(lokaalDir, "_next", "static", "css");
for (const file of walk(cssDir)) {
  if (!file.endsWith(".css")) continue;
  const src = fs.readFileSync(file, "utf8");
  const dst = src.replaceAll("url(/_next/static/media/", "url(../media/");
  if (dst !== src) {
    fs.writeFileSync(file, dst);
    cssCount++;
  }
}

// Webpack-runtime: publicPath "/_next/" wordt gebruikt om chunks na te laden;
// relatief aan het document (alleen de root-index.html laadt chunks na).
let jsCount = 0;
const chunkDir = path.join(lokaalDir, "_next", "static", "chunks");
for (const file of fs.readdirSync(chunkDir)) {
  if (!/^webpack-.*\.js$/.test(file)) continue;
  const p = path.join(chunkDir, file);
  const src = fs.readFileSync(p, "utf8");
  const dst = src.replaceAll('"/_next/"', '"./_next/"');
  if (dst !== src) {
    fs.writeFileSync(p, dst);
    jsCount++;
  }
}

console.log(`Herschreven: ${htmlCount} html/txt, ${cssCount} css, ${jsCount} webpack-runtime`);

// out/ terugzetten zodat de git-werkboom schoon blijft
const restore = spawnSync("git", ["checkout", "--", "out"], { cwd: repoRoot, stdio: "inherit" });
if (restore.status !== 0) {
  console.warn("Let op: kon out/ niet terugzetten met git (git checkout -- out).");
}

console.log(`\nKlaar! Open in de browser:\nfile:///${lokaalDir.replaceAll("\\", "/").replaceAll(" ", "%20")}/index.html`);
