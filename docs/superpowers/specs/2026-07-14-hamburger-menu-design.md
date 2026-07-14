# KassaGenda — hamburgermenu op mobiel (ontwerp)

Datum: 2026-07-14
Status: goedgekeurd door gebruiker

## Doel

Op smalle schermen wordt het menu een nette hamburger (☰) met een
uitschuifpaneel. Op desktop blijft het menu horizontaal zoals nu.

## Gedrag

- In de header verschijnt op mobiel (≤640px) een **☰-knop** rechts naast het
  logo; het gewone `<nav>` is dan verborgen tot het wordt geopend.
- Tik op ☰ → het menu klapt open als een **volle-breedte paneel** onder de
  header: elke link is een grote, tikbare rij (min. 44px), het actieve item
  is gemarkeerd met de roze accentbalk. De knop wordt een ✕.
- Tik op een link, op ✕, of buiten het paneel → het paneel sluit.
- Op desktop (>640px): ☰-knop verborgen, `<nav>` altijd horizontaal
  zichtbaar (huidige gedrag), geen JavaScript-effect.

## Aanpak

Eén gedeeld scriptje **js/menu.js** (op elke pagina met een header):
- Zoekt `.site-header`, injecteert een `<button class="menu-knop"
  aria-label="Menu" aria-expanded="false">☰</button>` vóór de `<nav>` (of
  vóór het `#admin-menu`/`#beheer-menu`).
- Klik wisselt een klasse `menu-open` op de `.site-header` en werkt
  `aria-expanded` bij; de knop toont ☰/✕.
- Klik op een link in de nav of buiten de header → sluit.
- Werkt met de bestaande, dynamisch getoonde menu's (admin/beheer: nav krijgt
  pas later `.verborgen` eraf; het script leest de nav live).

CSS in `css/style.css`:
- `.menu-knop` standaard `display: none`; achtergrondloos, charcoal ☰, groot
  tikdoel, focus-outline.
- Binnen `@media (max-width: 640px)`:
  - `.menu-knop { display: block; }` en absoluut/rechts in de header-rij;
    header-rij weer `row` met logo links, knop rechts.
  - `.site-header nav` (zichtbaar, dus zónder `.verborgen`): standaard
    verborgen (`display: none`); bij `.site-header.menu-open nav` →
    `display: flex; flex-direction: column;` volle breedte, links als rijen
    met randlijn, padding, en de actieve/hoverstijl als volledige rij
    (roze linker- of onderaccent).
- Belangrijk: de bestaande `.verborgen`-klasse op admin/beheer-nav (vóór
  inloggen) blijft leidend — het paneel toont nooit een nav die nog
  `.verborgen` is.

## Testaanpak

Bestaande 62 tests blijven groen. Browser 375px: ☰ zichtbaar, nav verborgen;
tik → paneel met gestapelde links, actief item gemarkeerd; tik op link →
navigeert/sluit; op admin/beheer verschijnt ☰ pas ná inloggen (nav was
verborgen); desktop 1280px: ☰ weg, nav horizontaal. Daarna commit + push
(auto-deploy).
