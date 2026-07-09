# Verpakkingsfoto's (packshots)

Zet hier de verpakkingsfoto's uit de fotodatabase
(`S:\Fotodatabase\CAT. 12.0\Brake\Disc brake pads`).

**Naamconventie:** `<artikelnummer>_2.jpg` — volgnummer `_2` is altijd de foto
van de verpakkingseenheid. Voorbeelden:

- `6850_2.jpg` → kaartverpakking van 6850
- `6850S_2.jpg` → kaartverpakking van 6850S (Hard-compound)
- `6854MC-BOX25_2.jpg` → werkplaatsdoos van 6854MC-BOX25

Ook `.jpeg`, `.png`, `.webp` en `.avif` worden herkend; hoofdletters/kleine
letters maken niet uit. Bestanden zonder `_2`-suffix worden genegeerd.

Na het toevoegen van foto's hoeft er verder niets te gebeuren: bij de
eerstvolgende build/deploy scant `scripts/build-packshots.mjs` deze map en
verschijnen de foto's automatisch op de resultaatkaarten.
