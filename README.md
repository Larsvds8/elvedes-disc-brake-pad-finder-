# Elvedes Disc Brake Pad Finder v2

Stap-voor-stap remblok-finder (merk → serie → model) met directe zoekfunctie op
OEM-artikelnummer, Elvedes-SKU, padcode en merk-/modeltekst. Volledig statisch,
geschikt voor GitHub Pages.

## Structuur

```
data/              Excel-bronbestanden (compatibiliteit + omschrijvingen)
brand/             Huisstijl-referentie (screenshots elvedes.nl + logo)
scripts/           build-data.mjs → src/data/padfinder.json uit de Excels
                   build-packshots.mjs → src/data/packshots.json uit public/packshots/
public/packshots/  Verpakkingsfoto's uit de fotodatabase (<artikelnummer>_2.jpg)
src/               Next.js-app (App Router, TypeScript)
```

## Ontwikkelen

```bash
npm install
npm run build:data   # Excel → JSON (draait ook automatisch mee in npm run build)
npm run dev
```

`npm run build:data` print een sanity-rapport: aantal records, merken, SKU's,
compound-conflicten en SKU's zonder omschrijving. Bekende ontbrekende
omschrijvingen: 6866, 6918.

## Data bijwerken

1. Vervang `data/Disc_brake_pad_Compatibility.xlsx` en/of `data/Beschrijvingen_Brake.xlsx`
   (zelfde tabblad- en kolomnamen aanhouden: "Compatibiliteit lang" resp. "Disc brake pads").
2. Draai `npm run build:data` en controleer het sanity-rapport — let op nieuwe
   compound-conflicten of SKU's zonder omschrijving.
3. `npm run build` voor een nieuwe statische export in `out/`.

## Verpakkingsfoto's toevoegen

1. Kopieer de foto's van de verpakkingseenheid uit de fotodatabase
   (`S:\Fotodatabase\CAT. 12.0\Brake\Disc brake pads`) naar `public/packshots/`.
   Volgnummer `_2` is altijd de verpakkingsfoto: `6850_2.jpg`, `6854MC-BOX25_2.jpg`, …
   Vergeet de BOX-, BOX25- en BOX50-varianten niet — elke variant heeft zijn
   eigen foto; ontbreekt die, dan valt de kaart terug op de foto van het kale
   artikelnummer.
2. Klaar — bij de eerstvolgende build/deploy scant `npm run build:packshots`
   de map en verschijnen de foto's automatisch op de resultaatkaarten
   (herkend: jpg/jpeg/png/webp/avif, hoofdletterongevoelig).

## Distributeurslijst bijwerken

De "Vind een distributeur"-uitklapper op de resultaatkaarten gebruikt
`src/data/distributors.json` — een snapshot van
[elvedes.nl/en/find-distributor](https://elvedes.nl/en/find-distributor),
inclusief eenmalig gegeocodeerde coördinaten voor "Sorteer op afstand".
Wijzigt de lijst op elvedes.nl, draai dan `npm run build:distributors`
(vereist internet; bestaande coördinaten worden hergebruikt, alleen nieuwe
adressen gaan naar de geocoder). Dit zit bewust níet in `npm run build`.

## Lokaal als bestand (file://)

`npm run build:local` maakt een export in `lokaal/` die zonder webserver werkt:
dubbelklik op `lokaal/index.html` (of gebruik `Pad Finder lokaal bijwerken.bat`
één map hoger) en de finder opent via `file://` in de browser. Het script bouwt
met `NEXT_PUBLIC_BASE_PATH="."` en herschrijft daarna de absolute `/_next/`-paden
naar relatieve (een relatieve `assetPrefix` weigert `next/font`). De map
`lokaal/` is een bouwproduct en staat in `.gitignore`; na een data- of
codewijziging het script opnieuw draaien.

## Deployment (GitHub Pages)

```bash
NEXT_PUBLIC_BASE_PATH="/<repo-naam>" npm run build
# inhoud van out/ publiceren naar GitHub Pages
```

Zonder subpad (eigen domein of user-site) volstaat `npm run build`.

## Datalaag-regels (afgestemd)

- `Bron`-kolom wordt volledig genegeerd.
- OEM-compoundletters in padcodes (Magura C/P/R/S) lossen intern op naar één
  Elvedes-SKU; die letter wordt nergens aan de gebruiker getoond. Het
  build-script flagt het expliciet als varianten binnen één padcode-familie
  ooit naar verschillende SKU's wijzen.
- **Elvedes-compounds** (catalogus p.8): artikelnummers in het
  beschrijvingenbestand coderen de compound als suffix — `T` = Super Soft
  (grijze backplate), geen suffix = Soft (blauw), `MC` = Medium (zwart),
  `S` = Hard/gesinterd (goud). Het build-script groepeert varianten per
  familie-SKU (bv. 6854 → 6854T/6854/6854MC/6854S); op de resultaatkaart is
  de compound selecteerbaar en de bijbehorende omschrijving komt rechtstreeks
  uit het beschrijvingenbestand. De compound guide op de site (sterrenscores
  per eigenschap) staat in `COMPOUNDS` in `src/lib/padfinder.ts`.
- Ontbrekende omschrijvingen worden niet opgevuld met placeholder-tekst:
  de kaart toont dan alleen het kale artikelnummer.
- Verpakkingsvarianten (BOX/BOX25/BOX50/CARD/BAG) komen rechtstreeks als
  aparte rijen uit het beschrijvingenbestand en verschijnen als keuzechips
  binnen de gekozen compound.

## Huisstijl

Merktokens: zwart `#000000`, antraciet `#313334`, wit `#FFFFFF`, rand `#DDDDDD`,
rood `#DF271C` (spaarzaam). Font: Inter 400/500/700/900. Scherpe hoeken, zware
koppen, uppercase CTA's met pijl — conform de screenshots in `brand/`.
NB: navy `#023047` komt in de screenshots niet voor en is bewust niet gebruikt.
