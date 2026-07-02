# Elvedes Disc Brake Pad Finder v2

Stap-voor-stap remblok-finder (merk → serie → model) met directe zoekfunctie op
OEM-artikelnummer, Elvedes-SKU, padcode en merk-/modeltekst. Volledig statisch,
geschikt voor GitHub Pages.

## Structuur

```
data/      Excel-bronbestanden (compatibiliteit + omschrijvingen)
brand/     Huisstijl-referentie (screenshots elvedes.nl + logo)
scripts/   build-data.mjs → genereert src/data/padfinder.json uit de Excels
src/       Next.js-app (App Router, TypeScript)
```

## Ontwikkelen

```bash
npm install
npm run build:data   # Excel → JSON (draait ook automatisch mee in npm run build)
npm run dev
```

`npm run build:data` print een sanity-rapport: aantal records, merken, SKU's,
compound-conflicten en SKU's zonder omschrijving. Bekende ontbrekende
omschrijvingen: 6866, 6908, 6914, 6915, 6918.

## Data bijwerken

1. Vervang `data/Disc_brake_pad_Compatibility.xlsx` en/of `data/Beschrijvingen_Brake.xlsx`
   (zelfde tabblad- en kolomnamen aanhouden: "Compatibiliteit lang" resp. "Disc brake pads").
2. Draai `npm run build:data` en controleer het sanity-rapport — let op nieuwe
   compound-conflicten of SKU's zonder omschrijving.
3. `npm run build` voor een nieuwe statische export in `out/`.

## Deployment (GitHub Pages)

```bash
NEXT_PUBLIC_BASE_PATH="/<repo-naam>" npm run build
# inhoud van out/ publiceren naar GitHub Pages
```

Zonder subpad (eigen domein of user-site) volstaat `npm run build`.

## Datalaag-regels (afgestemd)

- `Bron`-kolom wordt volledig genegeerd.
- Compound-varianten (Magura C/P/R/S) lossen intern op naar één Elvedes-SKU;
  de compound-letter wordt nergens aan de gebruiker getoond. Het build-script
  flagt het expliciet als varianten binnen één padcode-familie ooit naar
  verschillende SKU's wijzen.
- Ontbrekende omschrijvingen worden niet opgevuld met placeholder-tekst:
  de kaart toont dan alleen het kale artikelnummer.
- Verpakkingsvarianten (BOX/BOX25/BOX50/CARD/BAG) komen rechtstreeks als
  aparte rijen uit het beschrijvingenbestand en verschijnen als keuzechips.

## Huisstijl

Merktokens: zwart `#000000`, antraciet `#313334`, wit `#FFFFFF`, rand `#DDDDDD`,
rood `#DF271C` (spaarzaam). Font: Inter 400/500/700/900. Scherpe hoeken, zware
koppen, uppercase CTA's met pijl — conform de screenshots in `brand/`.
NB: navy `#023047` komt in de screenshots niet voor en is bewust niet gebruikt.
