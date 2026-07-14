# KassaGenda — mobiele weergave (ontwerp)

Datum: 2026-07-14
Status: goedgekeurd door gebruiker

## Doel

Alle pagina's goed bruikbaar maken op smalle schermen (~375px), met vanilla
CSS en zonder extra JavaScript. Eén centrale aanpak in `css/style.css`
plus enkele page-specifieke `<style>`-aanpassingen.

## Keuzes

- **Brede tabellen** (tenants, facturen, agenda-lijst, weekkalender): één
  generieke oplossing — de tabel in een scroll-container die zijwaarts
  scrollt. De tabelstructuur blijft intact.
- **Menu**: valt op smalle schermen onder het logo en centreert/wrapt de
  links. Geen hamburger, geen JavaScript.

## Aanpak (css/style.css)

Basis mobielvriendelijk maken en één breakpoint toevoegen:

- `viewport`-meta staat al op alle pagina's.
- Globaal: `img, canvas { max-width: 100% }`; `body` mag nooit horizontaal
  scrollen (`overflow-x: hidden` op `body`, scrollen gebeurt in
  containers).
- **Tabellen**: nieuwe helperklasse `.tabel-scroll { overflow-x: auto;
  -webkit-overflow-scrolling: touch; }`. Alle tabellen worden in de
  templates/HTML in zo'n container gezet (of: `.kaart > .tabel` krijgt via
  een wrapper scroll). Kolommen krijgen `white-space: nowrap` waar nodig
  zodat ze niet dichtklappen.
- **@media (max-width: 640px)**:
  - `.header-inner` wordt `flex-direction: column`, gecentreerd, met wat
    ruimte; `.site-header nav` centreert en mag wrappen (`flex-wrap`),
    links met kleinere marges.
  - `.container` kleinere zijpadding (0.9rem).
  - `.kaart` minder padding (1.1rem) en kleinere radius (16px).
  - `.hero h1` kleiner (1.7rem); `.hero` minder verticale padding.
  - `.velden-rij` wordt `flex-direction: column` (velden onder elkaar) —
    geldt overal (inschrijven, adres, blokkades, factuurregels, profiel).
  - Knoppen in werkbalken (paginering, week-navigatie, factuuracties)
    krijgen ruimte: `.knop-klein` iets groter tikdoel; knoppenrijen mogen
    wrappen.
  - `.keuze-grid` (dag/tijd-keuze) blijft wrappen; knoppen groot genoeg
    voor vingers (min. 44px hoog).
  - Factuur: `.factuur-kop` blijft kolom (is al kolom sinds vorige
    wijziging); meta-tabel volle breedte.
  - Betaal-checkout: `.checkout` volle breedte binnen container.

## Pagina-specifieke `<style>`

- `tenant.html` / `afspraak.html`: `.keuze-grid button` min-height 44px;
  `.tenant-kop` mag wrappen.
- `factuur.html`: meta-tabel en totalen-tabel volle breedte op mobiel;
  regeltabel in scroll-container.
- `beheer.html` weekkalender: de tabel in `.tabel-scroll`.

## Tabellen in scroll-containers

Tabellen die door JavaScript worden gerenderd (admin.js, beheer.js) worden
in de template omhuld met `<div class="tabel-scroll">…</div>`. Statische
tabellen (factuur) idem in de HTML.

## Testaanpak

Bestaande 62 tests blijven groen (geen logicawijziging). Browser op 375px
(resize_window mobile): geen horizontale paginascroll; menu onder logo;
formuliervelden onder elkaar; brede tabellen scrollen binnen hun kaart;
dag/tijd-knoppen goed tikbaar; factuur leesbaar. Steekproef op desktop
(1280px) dat niets verslechtert. Daarna commit + push (auto-deploy).
