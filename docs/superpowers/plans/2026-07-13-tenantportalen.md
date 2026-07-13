# Tenantportalen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elke actieve tenant krijgt een eigen openbare boekingspagina (`tenant.html?code=X`) en beheergedeelte (`beheer.html?code=X`) met online agenda.

**Architecture:** Zelfde multi-page vanilla patroon als het bestaande prototype. Nieuwe pure module `js/agenda.js` (slotberekening), uitbreiding van `js/db.js` met een `afspraken`-collectie, gedeelde PDOK-helper `js/adres.js` (geëxtraheerd uit `public.js`), en twee nieuwe pagina's met eigen JS-bestanden. Bestaande tests in `js/tests.js` breiden uit.

**Tech Stack:** HTML5, CSS3, vanilla ES2020, localStorage, PDOK Locatieserver, bestaand testharnas (`tests.html` + `node scripts/run-tests.mjs`).

## Global Constraints

- Geen build-stap, geen dependencies; alles draait vanaf GitHub Pages.
- Alle UI-teksten in het Nederlands.
- Op tenantpagina's is niets van andere tenants zichtbaar; alle queries filteren op tenantcode (case-insensitive).
- Openbare boekingspagina: kale opmaak zonder OberPoes-menu (geschikt voor iframe), voettekst "mogelijk gemaakt door OberPoes".
- Alleen tenants met status `Actief` hebben werkende portalen; anders melding "Deze pagina is niet beschikbaar."
- Klantvalidatie: alleen formaat (e-mail, NL-telefoon, NL-postcode); geen code-verificatiestap. `extra` is optioneel.
- Tenant-login: wachtwoord (8 tekens, gegenereerd bij goedkeuring); sessievlag `sessionStorage` sleutel `oberpoes_tenant_<CODE>` (code in hoofdletters).
- Openingstijden per weekdag `{ open, van, tot }`, default ma–vr 09:00–17:00 open, za/zo dicht; `slotDuur` default 30 minuten.
- Script-laadvolgorde op pagina's die db.js gebruiken: `validatie.js` → `agenda.js` → `db.js` → paginascript (db.js gebruikt Agenda voor defaults).

---

### Task 1: Agenda-module (pure slotberekening)

**Files:**
- Create: `js/agenda.js`
- Modify: `js/tests.js` (tests toevoegen, onderaan vóór de `OberPoesDb.wisAlles()`-afsluiting)
- Modify: `tests.html` (script-tag toevoegen)
- Modify: `scripts/run-tests.mjs` (bestand toevoegen aan lijst)

**Interfaces:**
- Produces:
  - `Agenda.DAG_SLEUTELS: string[]` — `['zo','ma','di','wo','do','vr','za']` (index = `Date.getDay()`)
  - `Agenda.DAG_NAMEN: string[]` — voluit, zelfde volgorde
  - `Agenda.standaardOpeningstijden() → {ma:{open,van,tot},...}`
  - `Agenda.komendeOpenDagen(openingstijden, vanafIso: 'YYYY-MM-DD', aantal: number) → string[]`
  - `Agenda.sloten(openingstijden, slotDuur: number, datumIso, afspraken: {datum,tijd}[]) → {tijd:'HH:MM', vrij:boolean}[]`

- [ ] **Step 1: Schrijf de tests (in js/tests.js, vóór de afsluitende `OberPoesDb.wisAlles();`)**

```javascript
// --- Agenda ---
test('standaardOpeningstijden: ma-vr open, za/zo dicht', () => {
  const t = Agenda.standaardOpeningstijden();
  assert(t.ma.open && t.vr.open && !t.za.open && !t.zo.open);
  assert(t.ma.van === '09:00' && t.ma.tot === '17:00');
});
test('komendeOpenDagen: week vanaf maandag geeft 5 werkdagen', () => {
  const dagen = Agenda.komendeOpenDagen(Agenda.standaardOpeningstijden(), '2026-07-13', 7);
  assert(dagen.length === 5, 'kreeg ' + dagen.length);
  assert(dagen[0] === '2026-07-13' && dagen[4] === '2026-07-17');
});
test('sloten: 9-17 met 30 min geeft 16 sloten', () => {
  const s = Agenda.sloten(Agenda.standaardOpeningstijden(), 30, '2026-07-13', []);
  assert(s.length === 16 && s[0].tijd === '09:00' && s[15].tijd === '16:30');
  assert(s.every((x) => x.vrij));
});
test('sloten: geboekt slot is niet vrij', () => {
  const s = Agenda.sloten(Agenda.standaardOpeningstijden(), 30,
    '2026-07-13', [{ datum: '2026-07-13', tijd: '10:00' }]);
  assert(s.find((x) => x.tijd === '10:00').vrij === false);
  assert(s.find((x) => x.tijd === '10:30').vrij === true);
});
test('sloten: dichte dag geeft lege lijst', () => {
  assert(Agenda.sloten(Agenda.standaardOpeningstijden(), 30, '2026-07-12', []).length === 0);
});
test('sloten: 60 min duur geeft 8 sloten', () => {
  assert(Agenda.sloten(Agenda.standaardOpeningstijden(), 60, '2026-07-13', []).length === 8);
});
```

- [ ] **Step 2: Draai tests → verwacht FAIL (`Agenda is not defined`)**

Run: `node scripts/run-tests.mjs` — eerst `js/agenda.js` aan de lijst toevoegen:

```javascript
const bron = ['js/validatie.js', 'js/agenda.js', 'js/db.js', 'js/tests.js']
```

Expected: de zes nieuwe tests FAIL met `Agenda is not defined`, de rest PASS.

- [ ] **Step 3: Schrijf js/agenda.js**

```javascript
// Pure agendafuncties — geen DOM, geen opslag.
const Agenda = (() => {
  const DAG_SLEUTELS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const DAG_NAMEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

  const naarMinuten = (hhmm) => {
    const [u, m] = hhmm.split(':').map(Number);
    return u * 60 + m;
  };
  const naarTijd = (minuten) =>
    String(Math.floor(minuten / 60)).padStart(2, '0') + ':' + String(minuten % 60).padStart(2, '0');
  const dagVan = (datumIso) => DAG_SLEUTELS[new Date(datumIso + 'T12:00:00').getDay()];

  return {
    DAG_SLEUTELS,
    DAG_NAMEN,
    standaardOpeningstijden() {
      const tijden = {};
      DAG_SLEUTELS.forEach((dag) => {
        tijden[dag] = { open: !['za', 'zo'].includes(dag), van: '09:00', tot: '17:00' };
      });
      return tijden;
    },
    komendeOpenDagen(openingstijden, vanafIso, aantal) {
      const dagen = [];
      const d = new Date(vanafIso + 'T12:00:00');
      for (let i = 0; i < aantal; i++) {
        const iso = d.toISOString().slice(0, 10);
        if (openingstijden[dagVan(iso)].open) dagen.push(iso);
        d.setDate(d.getDate() + 1);
      }
      return dagen;
    },
    sloten(openingstijden, slotDuur, datumIso, afspraken) {
      const dag = openingstijden[dagVan(datumIso)];
      if (!dag.open) return [];
      const bezet = new Set(afspraken.filter((a) => a.datum === datumIso).map((a) => a.tijd));
      const uit = [];
      for (let m = naarMinuten(dag.van); m + slotDuur <= naarMinuten(dag.tot); m += slotDuur) {
        const tijd = naarTijd(m);
        uit.push({ tijd, vrij: !bezet.has(tijd) });
      }
      return uit;
    },
  };
})();
```

- [ ] **Step 4: Voeg script toe aan tests.html (vóór db.js)**

```html
  <script src="js/validatie.js"></script>
  <script src="js/agenda.js"></script>
  <script src="js/db.js"></script>
  <script src="js/tests.js"></script>
```

- [ ] **Step 5: Draai tests → alles PASS**

Run: `node scripts/run-tests.mjs`
Expected: `23/23 geslaagd`

- [ ] **Step 6: Commit**

```bash
git add js/agenda.js js/tests.js tests.html scripts/run-tests.mjs
git commit -m "feat: agenda-module met slotberekening uit openingstijden"
```

---

### Task 2: Database-uitbreiding — afspraken, activering, migratie, demo-data

**Files:**
- Modify: `js/db.js`
- Modify: `js/tests.js`

**Interfaces:**
- Consumes: `Agenda.standaardOpeningstijden()`, `Agenda.komendeOpenDagen()` (Task 1).
- Produces:
  - `OberPoesDb.afsprakenVoor(tenantCode) → Afspraak[]` (case-insensitive)
  - `OberPoesDb.maakAfspraak(velden) → Afspraak|null` (`null` bij bezet slot; zet zelf `id` en `gemaaktOp`)
  - `OberPoesDb.annuleerAfspraak(id) → boolean`
  - `OberPoesDb.zetOpeningstijden(code, openingstijden, slotDuur) → Tenant|null`
  - `OberPoesDb.activeerTenant(code) → Tenant|null` — status Actief + vult ontbrekende `beheerWachtwoord`/`openingstijden`/`slotDuur`; idempotent
  - Database-vorm: `{ tenants: [], afspraken: [] }`; oude databases zonder `afspraken` worden bij lezen aangevuld

- [ ] **Step 1: Schrijf de tests (js/tests.js, vóór de afsluitende `OberPoesDb.wisAlles();`)**

```javascript
// --- Afspraken en activering ---
test('migratie: oude database zonder afspraken-veld werkt', () => {
  localStorage.setItem('oberpoes_db', JSON.stringify({ tenants: [] }));
  assert(Array.isArray(OberPoesDb.alleAfspraken()));
});
test('activeerTenant: zet status, wachtwoord en defaults; idempotent', () => {
  OberPoesDb.wisAlles();
  const t = OberPoesDb.voegToe({ naam: 'Activeer BV' });
  const na = OberPoesDb.activeerTenant(t.code);
  assert(na.status === 'Actief');
  assert(/^[a-z2-9]{8}$/.test(na.beheerWachtwoord), 'wachtwoord: ' + na.beheerWachtwoord);
  assert(na.openingstijden.ma.open === true && na.slotDuur === 30);
  const tweede = OberPoesDb.activeerTenant(t.code);
  assert(tweede.beheerWachtwoord === na.beheerWachtwoord, 'wachtwoord mag niet wijzigen');
});
test('maakAfspraak: slaat op en weigert dubbelboeking', () => {
  const t = OberPoesDb.alleTenants()[0];
  const a = OberPoesDb.maakAfspraak({ tenantCode: t.code, datum: '2026-07-14', tijd: '10:00', naam: 'Jan' });
  assert(a && a.id && a.gemaaktOp);
  const dubbel = OberPoesDb.maakAfspraak({ tenantCode: t.code, datum: '2026-07-14', tijd: '10:00', naam: 'Piet' });
  assert(dubbel === null);
});
test('afsprakenVoor: alleen eigen tenant, case-insensitive', () => {
  const t1 = OberPoesDb.alleTenants()[0];
  const t2 = OberPoesDb.voegToe({ naam: 'Andere BV' });
  OberPoesDb.maakAfspraak({ tenantCode: t2.code, datum: '2026-07-14', tijd: '10:00', naam: 'Ander' });
  assert(OberPoesDb.afsprakenVoor(t1.code.toLowerCase()).length === 1);
  assert(OberPoesDb.afsprakenVoor(t2.code).length === 1);
  assert(OberPoesDb.afsprakenVoor(t1.code)[0].naam === 'Jan');
});
test('annuleerAfspraak: verwijdert en geeft slot vrij', () => {
  const t = OberPoesDb.alleTenants()[0];
  const a = OberPoesDb.afsprakenVoor(t.code)[0];
  assert(OberPoesDb.annuleerAfspraak(a.id) === true);
  assert(OberPoesDb.annuleerAfspraak(a.id) === false, 'tweede keer false');
  const opnieuw = OberPoesDb.maakAfspraak({ tenantCode: t.code, datum: '2026-07-14', tijd: '10:00', naam: 'Weer' });
  assert(opnieuw !== null, 'slot moet weer vrij zijn');
});
test('zetOpeningstijden: wijzigt tijden en slotduur', () => {
  const t = OberPoesDb.alleTenants()[0];
  const tijden = Agenda.standaardOpeningstijden();
  tijden.za = { open: true, van: '10:00', tot: '14:00' };
  const na = OberPoesDb.zetOpeningstijden(t.code, tijden, 60);
  assert(na.openingstijden.za.open === true && na.slotDuur === 60);
});
test('demo-data: actieve tenant heeft wachtwoord en afspraken', () => {
  OberPoesDb.wisAlles();
  OberPoesDb.laadDemoData();
  const actief = OberPoesDb.alleTenants().find((t) => t.status === 'Actief');
  assert(!!actief.beheerWachtwoord && !!actief.openingstijden);
  assert(OberPoesDb.afsprakenVoor(actief.code).length === 2);
});
```

Pas ook de bestaande demo-datatest niet aan — die blijft geldig.

- [ ] **Step 2: Draai tests → nieuwe tests FAIL (`alleAfspraken is not a function` etc.)**

Run: `node scripts/run-tests.mjs`

- [ ] **Step 3: Breid js/db.js uit**

Vervang de `lees`-functie:

```javascript
  function lees() {
    try {
      const data = JSON.parse(localStorage.getItem(DB_SLEUTEL));
      if (data && Array.isArray(data.tenants)) {
        if (!Array.isArray(data.afspraken)) data.afspraken = [];
        return data;
      }
    } catch (e) { /* corrupte data → verse database */ }
    return { tenants: [], afspraken: [] };
  }
```

Voeg onder `CODE_TEKENS` toe:

```javascript
  const WACHTWOORD_TEKENS = 'abcdefghjkmnpqrstuvwxyz23456789';
```

Voeg de volgende functies toe aan het geretourneerde object (na `zetStatus`):

```javascript
    activeerTenant(code) {
      const bestaand = this.vindTenant(code);
      if (!bestaand) return null;
      return this.wijzig(code, {
        status: 'Actief',
        beheerWachtwoord: bestaand.beheerWachtwoord
          || Array.from({ length: 8 },
            () => WACHTWOORD_TEKENS[Math.floor(Math.random() * WACHTWOORD_TEKENS.length)]).join(''),
        openingstijden: bestaand.openingstijden || Agenda.standaardOpeningstijden(),
        slotDuur: bestaand.slotDuur || 30,
      });
    },
    alleAfspraken() { return lees().afspraken; },
    afsprakenVoor(tenantCode) {
      const norm = String(tenantCode).toUpperCase();
      return lees().afspraken.filter((a) => a.tenantCode.toUpperCase() === norm);
    },
    maakAfspraak(velden) {
      const db = lees();
      const norm = String(velden.tenantCode).toUpperCase();
      const bezet = db.afspraken.some((a) => a.tenantCode.toUpperCase() === norm
        && a.datum === velden.datum && a.tijd === velden.tijd);
      if (bezet) return null;
      const afspraak = { ...velden, id: this.genereerCode(), gemaaktOp: new Date().toISOString() };
      db.afspraken.push(afspraak);
      schrijf(db);
      return afspraak;
    },
    annuleerAfspraak(id) {
      const db = lees();
      const voor = db.afspraken.length;
      db.afspraken = db.afspraken.filter((a) => a.id !== id);
      schrijf(db);
      return db.afspraken.length < voor;
    },
    zetOpeningstijden(code, openingstijden, slotDuur) {
      return this.wijzig(code, { openingstijden, slotDuur });
    },
```

Pas `laadDemoData` aan: vervang de twee `zetStatus`-regels aan het einde door:

```javascript
      // Variatie in status zodat filters iets tonen; actieve tenant met agenda
      const tenants = this.alleTenants();
      this.activeerTenant(tenants[1].code);
      this.zetStatus(tenants[2].code, 'Inactief');
      const actief = this.vindTenant(tenants[1].code);
      const vandaag = new Date().toISOString().slice(0, 10);
      const dagen = Agenda.komendeOpenDagen(actief.openingstijden, vandaag, 14);
      this.maakAfspraak({ tenantCode: actief.code, datum: dagen[1], tijd: '10:00',
        naam: 'Jan Jansen', email: 'jan@voorbeeld.nl', postcode: '1012 JS', huisnummer: '1',
        straat: 'Dam', plaats: 'Amsterdam', extra: 'Eerste kennismaking', telefoon: '0611111111' });
      this.maakAfspraak({ tenantCode: actief.code, datum: dagen[1], tijd: '10:30',
        naam: 'Fatima el Idrissi', email: 'fatima@voorbeeld.nl', postcode: '3511 CJ', huisnummer: '10',
        straat: 'Domplein', plaats: 'Utrecht', extra: '', telefoon: '0622222222' });
```

- [ ] **Step 4: Draai tests → alles PASS**

Run: `node scripts/run-tests.mjs`
Expected: `30/30 geslaagd`

- [ ] **Step 5: Commit**

```bash
git add js/db.js js/tests.js
git commit -m "feat: afsprakencollectie, tenantactivering en demo-agenda in database"
```

---

### Task 3: Gedeelde adres-helper (extractie uit public.js)

**Files:**
- Create: `js/adres.js`
- Modify: `js/public.js` (PDOK-code vervangen door helper)
- Modify: `index.html` (script-tag toevoegen)

**Interfaces:**
- Consumes: `Validatie.postcode`, `Validatie.huisnummer`.
- Produces:
  - `Adres.zoek(postcode, huisnummer) → Promise<{straat,plaats}|null>` (throwt bij onbereikbare API)
  - `Adres.bind({postcodeEl, huisnummerEl, straatEl, plaatsEl, foutEl, bijAdres})` — koppelt blur-lookup; `bijAdres(adres|null)` callback

- [ ] **Step 1: Schrijf js/adres.js**

```javascript
// Gedeelde PDOK-adreslookup (postcode + huisnummer → straat/plaats).
const Adres = (() => {
  async function zoek(postcode, huisnummer) {
    const pc = postcode.replace(/\s/g, '').toUpperCase();
    const nr = parseInt(huisnummer, 10);
    const url = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free'
      + `?q=postcode:${pc} and huisnummer:${nr}&fq=type:adres&rows=1`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('PDOK niet bereikbaar');
    const data = await resp.json();
    const doc = data.response.docs[0];
    if (!doc) return null;
    return { straat: doc.straatnaam, plaats: doc.woonplaatsnaam };
  }

  function bind({ postcodeEl, huisnummerEl, straatEl, plaatsEl, foutEl, bijAdres }) {
    async function werkBij() {
      bijAdres(null);
      straatEl.value = '';
      plaatsEl.value = '';
      foutEl.textContent = '';
      if (!Validatie.postcode(postcodeEl.value) || !Validatie.huisnummer(huisnummerEl.value)) return;
      try {
        const adres = await zoek(postcodeEl.value, huisnummerEl.value);
        if (!adres) {
          foutEl.textContent = 'Geen adres gevonden bij deze postcode en dit huisnummer.';
          return;
        }
        straatEl.value = adres.straat;
        plaatsEl.value = adres.plaats;
        bijAdres(adres);
      } catch (e) {
        foutEl.textContent = 'Adresservice is niet bereikbaar. Probeer het later opnieuw.';
      }
    }
    postcodeEl.addEventListener('blur', werkBij);
    huisnummerEl.addEventListener('blur', werkBij);
  }

  return { zoek, bind };
})();
```

- [ ] **Step 2: Vervang de PDOK-code in js/public.js**

Verwijder de volledige functies `zoekAdres` en `werkAdresBij` én de twee regels
`el('postcode').addEventListener('blur', werkAdresBij);` en
`el('huisnummer').addEventListener('blur', werkAdresBij);`, en zet op die plek:

```javascript
  // --- Adres via PDOK Locatieserver (gedeelde helper) ---
  Adres.bind({
    postcodeEl: el('postcode'),
    huisnummerEl: el('huisnummer'),
    straatEl: el('straat'),
    plaatsEl: el('plaats'),
    foutEl: el('fout-adres'),
    bijAdres: (a) => { adres = a; },
  });
```

- [ ] **Step 3: Voeg scripts toe aan index.html**

```html
  <script src="js/validatie.js"></script>
  <script src="js/adres.js"></script>
  <script src="js/agenda.js"></script>
  <script src="js/db.js"></script>
  <script src="js/public.js"></script>
```

- [ ] **Step 4: Verifieer**

Run: `node scripts/run-tests.mjs` → alles PASS (regressie).
Browser: open `index.html`, vul postcode `1012 JS` + huisnummer `1` → straat "Dam", plaats "Amsterdam" verschijnen nog steeds.

- [ ] **Step 5: Commit**

```bash
git add js/adres.js js/public.js index.html
git commit -m "refactor: PDOK-adreslookup naar gedeelde Adres-helper"
```

---

### Task 4: Openbare boekingspagina (tenant.html + js/tenant.js)

**Files:**
- Create: `tenant.html`
- Create: `js/tenant.js`

**Interfaces:**
- Consumes: `OberPoesDb.vindTenant`, `OberPoesDb.afsprakenVoor`, `OberPoesDb.maakAfspraak`, `Agenda.komendeOpenDagen`, `Agenda.sloten`, `Agenda.DAG_NAMEN`, `Adres.bind`, `Validatie.*`.
- Produces: werkende boekingsflow op `tenant.html?code=<CODE>`.

- [ ] **Step 1: Schrijf tenant.html**

Kale pagina, geen OberPoes-menu (iframe-geschikt):

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Afspraak maken</title>
  <link rel="stylesheet" href="css/style.css">
  <style>
    .tenant-kop { display: flex; align-items: center; gap: 1rem; padding: 1.25rem 0 0; }
    .tenant-kop img { width: 72px; height: 72px; border-radius: 10px; border: 1px solid var(--rand); }
    .tenant-kop h1 { margin: 0; font-size: 1.6rem; color: var(--paars-donker); }
    .tenant-kop p { margin: 0; color: #666; }
    .keuze-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .keuze-grid .knop-secundair.gekozen { background: var(--paars); color: #fff; }
    .keuze-grid button:disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
  </style>
</head>
<body>
  <main class="container">
    <div class="kaart verborgen" id="niet-beschikbaar">
      <h2>Deze pagina is niet beschikbaar</h2>
      <p>Controleer of de link klopt of neem contact op met de organisatie.</p>
    </div>

    <div id="boeking" class="verborgen">
      <div class="tenant-kop">
        <img id="t-logo" alt="Logo">
        <div>
          <h1 id="t-naam"></h1>
          <p id="t-adres"></p>
        </div>
      </div>

      <div class="kaart" id="stap-slot">
        <h2>Maak een afspraak</h2>
        <div class="veld">
          <label>Kies een dag</label>
          <div class="keuze-grid" id="dag-keuze"></div>
        </div>
        <div class="veld verborgen" id="tijd-blok">
          <label>Kies een tijd</label>
          <div class="keuze-grid" id="tijd-keuze"></div>
        </div>
      </div>

      <div class="kaart verborgen" id="stap-gegevens">
        <h2>Uw gegevens</h2>
        <p class="melding melding-info" id="gekozen-slot"></p>
        <form id="afspraakformulier" novalidate>
          <div class="veld">
            <label for="naam">Naam</label>
            <input id="naam" type="text" required>
            <span class="fout" id="fout-naam"></span>
          </div>
          <div class="veld">
            <label for="email">E-mailadres</label>
            <input id="email" type="email" required>
            <span class="fout" id="fout-email"></span>
          </div>
          <div class="velden-rij">
            <div class="veld">
              <label for="postcode">Postcode</label>
              <input id="postcode" type="text" placeholder="1234 AB" required>
              <span class="fout" id="fout-postcode"></span>
            </div>
            <div class="veld">
              <label for="huisnummer">Huisnummer</label>
              <input id="huisnummer" type="text" required>
              <span class="fout" id="fout-huisnummer"></span>
            </div>
          </div>
          <div class="velden-rij">
            <div class="veld">
              <label for="straat">Straat</label>
              <input id="straat" type="text" readonly placeholder="wordt automatisch bepaald">
            </div>
            <div class="veld">
              <label for="plaats">Plaats</label>
              <input id="plaats" type="text" readonly placeholder="wordt automatisch bepaald">
            </div>
          </div>
          <span class="fout" id="fout-adres"></span>
          <div class="veld">
            <label for="extra">Extra (optioneel)</label>
            <input id="extra" type="text">
          </div>
          <div class="veld">
            <label for="telefoon">Telefoonnummer</label>
            <input id="telefoon" type="tel" placeholder="0612345678" required>
            <span class="fout" id="fout-telefoon"></span>
          </div>
          <span class="fout" id="fout-boeking"></span>
          <button type="submit" class="knop">Afspraak bevestigen</button>
        </form>
      </div>

      <div class="kaart verborgen" id="stap-klaar">
        <h2>Afspraak bevestigd 🎉</h2>
        <div class="melding melding-goed" id="bevestiging"></div>
      </div>
    </div>
  </main>
  <footer class="site-footer">mogelijk gemaakt door OberPoes</footer>
  <script src="js/validatie.js"></script>
  <script src="js/adres.js"></script>
  <script src="js/agenda.js"></script>
  <script src="js/db.js"></script>
  <script src="js/tenant.js"></script>
</body>
</html>
```

- [ ] **Step 2: Schrijf js/tenant.js**

```javascript
// Openbare boekingspagina van één tenant (?code=XXXXXX).
(() => {
  if (!document.getElementById('boeking')) return;

  const el = (id) => document.getElementById(id);
  const zetFout = (id, tekst) => { el('fout-' + id).textContent = tekst || ''; };

  const code = new URLSearchParams(location.search).get('code') || '';
  const tenant = OberPoesDb.vindTenant(code);
  if (!tenant || tenant.status !== 'Actief') {
    el('niet-beschikbaar').classList.remove('verborgen');
    return;
  }

  el('t-logo').src = tenant.logo;
  el('t-naam').textContent = tenant.naam;
  el('t-adres').textContent = `${tenant.straat} ${tenant.huisnummer}, ${tenant.plaats}`;
  document.title = `Afspraak maken — ${tenant.naam}`;
  el('boeking').classList.remove('verborgen');

  let gekozenDatum = null;
  let gekozenTijd = null;
  let adres = null;

  const datumLabel = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    return `${Agenda.DAG_NAMEN[d.getDay()].slice(0, 2)} ${d.getDate()}/${d.getMonth() + 1}`;
  };

  function renderDagen() {
    const vandaag = new Date().toISOString().slice(0, 10);
    const dagen = Agenda.komendeOpenDagen(tenant.openingstijden, vandaag, 14);
    el('dag-keuze').innerHTML = dagen.map((iso) =>
      `<button type="button" class="knop knop-secundair${iso === gekozenDatum ? ' gekozen' : ''}" data-datum="${iso}">${datumLabel(iso)}</button>`
    ).join('');
    el('dag-keuze').querySelectorAll('button').forEach((k) => {
      k.addEventListener('click', () => {
        gekozenDatum = k.dataset.datum;
        gekozenTijd = null;
        el('stap-gegevens').classList.add('verborgen');
        renderDagen();
        renderTijden();
      });
    });
  }

  function renderTijden() {
    el('tijd-blok').classList.remove('verborgen');
    const sloten = Agenda.sloten(tenant.openingstijden, tenant.slotDuur || 30,
      gekozenDatum, OberPoesDb.afsprakenVoor(tenant.code));
    el('tijd-keuze').innerHTML = sloten.map((s) =>
      `<button type="button" class="knop knop-secundair${s.tijd === gekozenTijd ? ' gekozen' : ''}" data-tijd="${s.tijd}" ${s.vrij ? '' : 'disabled'}>${s.tijd}</button>`
    ).join('') || '<em>Geen tijden beschikbaar op deze dag.</em>';
    el('tijd-keuze').querySelectorAll('button:not([disabled])').forEach((k) => {
      k.addEventListener('click', () => {
        gekozenTijd = k.dataset.tijd;
        renderTijden();
        el('gekozen-slot').textContent =
          `Gekozen: ${datumLabel(gekozenDatum)} om ${gekozenTijd}`;
        el('stap-gegevens').classList.remove('verborgen');
        el('stap-gegevens').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  renderDagen();

  Adres.bind({
    postcodeEl: el('postcode'),
    huisnummerEl: el('huisnummer'),
    straatEl: el('straat'),
    plaatsEl: el('plaats'),
    foutEl: el('fout-adres'),
    bijAdres: (a) => { adres = a; },
  });

  const veldRegels = {
    naam: [Validatie.naam, 'Vul uw naam in (minimaal 2 tekens).'],
    email: [Validatie.email, 'Vul een geldig e-mailadres in.'],
    postcode: [Validatie.postcode, 'Vul een geldige Nederlandse postcode in (1234 AB).'],
    huisnummer: [Validatie.huisnummer, 'Vul een geldig huisnummer in.'],
    telefoon: [Validatie.telefoon, 'Vul een geldig Nederlands telefoonnummer in.'],
  };
  Object.entries(veldRegels).forEach(([id, [regel, melding]]) => {
    el(id).addEventListener('blur', () => {
      zetFout(id, el(id).value && !regel(el(id).value) ? melding : '');
    });
  });

  el('afspraakformulier').addEventListener('submit', (e) => {
    e.preventDefault();
    zetFout('boeking', '');
    let ok = true;
    Object.entries(veldRegels).forEach(([id, [regel, melding]]) => {
      const geldig = regel(el(id).value);
      zetFout(id, geldig ? '' : melding);
      if (!geldig) ok = false;
    });
    if (!adres) {
      zetFout('adres', 'Het adres kon nog niet bepaald worden. Controleer postcode en huisnummer.');
      ok = false;
    }
    if (!ok) return;

    const afspraak = OberPoesDb.maakAfspraak({
      tenantCode: tenant.code,
      datum: gekozenDatum,
      tijd: gekozenTijd,
      naam: el('naam').value.trim(),
      email: el('email').value.trim(),
      postcode: el('postcode').value.trim().toUpperCase(),
      huisnummer: el('huisnummer').value.trim(),
      straat: adres.straat,
      plaats: adres.plaats,
      extra: el('extra').value.trim(),
      telefoon: el('telefoon').value.trim(),
    });
    if (!afspraak) {
      zetFout('boeking', 'Dit tijdstip is zojuist bezet geraakt. Kies een andere tijd.');
      renderTijden();
      return;
    }
    el('bevestiging').innerHTML =
      `Uw afspraak bij <strong>${tenant.naam}</strong> op <strong>${datumLabel(afspraak.datum)}</strong> `
      + `om <strong>${afspraak.tijd}</strong> is bevestigd.<br>`
      + `Locatie: ${tenant.straat} ${tenant.huisnummer}, ${tenant.plaats}.`;
    el('stap-slot').classList.add('verborgen');
    el('stap-gegevens').classList.add('verborgen');
    el('stap-klaar').classList.remove('verborgen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
```

- [ ] **Step 3: Verifieer in de browser**

1. Laad demo-data (admin) zodat er een actieve tenant is; noteer de code.
2. Open `tenant.html?code=<CODE>` → logo, naam, adres zichtbaar; dagknoppen (alleen werkdagen).
3. Kies dag met demo-afspraken → 10:00 en 10:30 zijn uitgegrijsd.
4. Kies vrije tijd → formulier verschijnt; boek met geldige gegevens (PDOK-postcode) → bevestigingsscherm.
5. Zelfde slot opnieuw proberen → knop is nu uitgegrijsd.
6. `tenant.html?code=ONZIN` → "Deze pagina is niet beschikbaar".
7. `tenant.html?code=<code-van-Aangevraagde-tenant>` → ook niet beschikbaar.

- [ ] **Step 4: Commit**

```bash
git add tenant.html js/tenant.js
git commit -m "feat: openbare boekingspagina met agenda per tenant"
```

---

### Task 5: Tenantbeheer (beheer.html + js/beheer.js)

**Files:**
- Create: `beheer.html`
- Create: `js/beheer.js`

**Interfaces:**
- Consumes: `OberPoesDb.vindTenant`, `OberPoesDb.afsprakenVoor`, `OberPoesDb.annuleerAfspraak`, `OberPoesDb.zetOpeningstijden`, `Agenda.DAG_SLEUTELS`, `Agenda.DAG_NAMEN`.
- Produces: beheerportaal op `beheer.html?code=<CODE>` met tabbladen Agenda, Openingstijden, Profiel.

- [ ] **Step 1: Schrijf beheer.html**

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Beheer</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <span class="logo" id="kop-naam">🐾 Beheer</span>
      <nav id="beheer-menu" class="verborgen">
        <a href="#" id="menu-agenda" class="actief">Agenda</a>
        <a href="#" id="menu-tijden">Openingstijden</a>
        <a href="#" id="menu-profiel">Profiel</a>
        <a href="#" id="menu-uitloggen">Uitloggen</a>
      </nav>
    </div>
  </header>
  <main class="container">
    <div class="kaart verborgen" id="niet-beschikbaar">
      <h2>Deze pagina is niet beschikbaar</h2>
      <p>Controleer of de link klopt.</p>
    </div>

    <div class="kaart verborgen" id="login-kaart" style="max-width: 420px; margin: 3rem auto;">
      <h2>Beheer — inloggen</h2>
      <div class="veld">
        <label for="wachtwoord">Wachtwoord</label>
        <input id="wachtwoord" type="password" autocomplete="current-password">
      </div>
      <span class="fout" id="fout-login"></span>
      <button class="knop" id="knop-login">Inloggen</button>
    </div>

    <div id="beheer-app" class="verborgen">
      <div id="view-agenda"></div>
      <div id="view-tijden" class="verborgen"></div>
      <div id="view-profiel" class="verborgen"></div>
    </div>
  </main>
  <footer class="site-footer">mogelijk gemaakt door OberPoes</footer>
  <script src="js/validatie.js"></script>
  <script src="js/agenda.js"></script>
  <script src="js/db.js"></script>
  <script src="js/beheer.js"></script>
</body>
</html>
```

- [ ] **Step 2: Schrijf js/beheer.js**

```javascript
// Beheergedeelte van één tenant (?code=XXXXXX): agenda, openingstijden, profiel.
(() => {
  if (!document.getElementById('beheer-app')) return;

  const el = (id) => document.getElementById(id);
  const code = new URLSearchParams(location.search).get('code') || '';
  const SESSIE_SLEUTEL = 'oberpoes_tenant_' + code.toUpperCase();

  function huidigeTenant() { return OberPoesDb.vindTenant(code); }

  const tenant = huidigeTenant();
  if (!tenant || tenant.status !== 'Actief') {
    el('niet-beschikbaar').classList.remove('verborgen');
    return;
  }
  el('kop-naam').textContent = `🐾 ${tenant.naam} — beheer`;

  // --- Login ---
  function toonApp() {
    el('login-kaart').classList.add('verborgen');
    el('beheer-app').classList.remove('verborgen');
    el('beheer-menu').classList.remove('verborgen');
    toonView('agenda');
  }
  el('knop-login').addEventListener('click', () => {
    if (el('wachtwoord').value !== huidigeTenant().beheerWachtwoord) {
      el('fout-login').textContent = 'Onjuist wachtwoord.';
      return;
    }
    sessionStorage.setItem(SESSIE_SLEUTEL, 'ja');
    toonApp();
  });
  el('wachtwoord').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el('knop-login').click();
  });
  el('menu-uitloggen').addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem(SESSIE_SLEUTEL);
    location.reload();
  });

  // --- Views ---
  function toonView(naam) {
    ['agenda', 'tijden', 'profiel'].forEach((v) => {
      el('view-' + v).classList.toggle('verborgen', v !== naam);
      el('menu-' + v).classList.toggle('actief', v === naam);
    });
    if (naam === 'agenda') renderAgenda();
    if (naam === 'tijden') renderTijden();
    if (naam === 'profiel') renderProfiel();
  }
  ['agenda', 'tijden', 'profiel'].forEach((v) => {
    el('menu-' + v).addEventListener('click', (e) => { e.preventDefault(); toonView(v); });
  });

  // --- Agenda ---
  function renderAgenda() {
    const afspraken = OberPoesDb.afsprakenVoor(code)
      .slice()
      .sort((a, b) => (a.datum + a.tijd).localeCompare(b.datum + b.tijd));
    const rijen = afspraken.map((a) => `
      <tr>
        <td><strong>${a.datum}</strong><br>${a.tijd}</td>
        <td>${a.naam}${a.extra ? `<br><small>${a.extra}</small>` : ''}</td>
        <td>${a.straat} ${a.huisnummer}<br><small>${a.postcode} ${a.plaats}</small></td>
        <td>${a.email}<br><small>${a.telefoon}</small></td>
        <td><button class="knop knop-gevaar knop-klein" data-id="${a.id}">Annuleren</button></td>
      </tr>`).join('');
    el('view-agenda').innerHTML = `
      <div class="kaart">
        <h2>Agenda</h2>
        ${afspraken.length === 0 ? '<p>Er zijn nog geen afspraken.</p>' : `
        <table class="tabel">
          <thead><tr><th>Wanneer</th><th>Klant</th><th>Adres</th><th>Contact</th><th></th></tr></thead>
          <tbody>${rijen}</tbody>
        </table>`}
      </div>`;
    el('view-agenda').querySelectorAll('button[data-id]').forEach((k) => {
      k.addEventListener('click', () => {
        OberPoesDb.annuleerAfspraak(k.dataset.id);
        renderAgenda();
      });
    });
  }

  // --- Openingstijden ---
  function renderTijden() {
    const t = huidigeTenant();
    const rijen = Agenda.DAG_SLEUTELS.map((dag, i) => {
      const d = t.openingstijden[dag];
      return `
      <tr>
        <td><label><input type="checkbox" id="open-${dag}" ${d.open ? 'checked' : ''}> ${Agenda.DAG_NAMEN[i]}</label></td>
        <td><input type="time" id="van-${dag}" value="${d.van}"></td>
        <td><input type="time" id="tot-${dag}" value="${d.tot}"></td>
      </tr>`;
    }).join('');
    const duurOpties = [15, 30, 60].map((m) =>
      `<option value="${m}" ${m === (t.slotDuur || 30) ? 'selected' : ''}>${m} minuten</option>`).join('');
    el('view-tijden').innerHTML = `
      <div class="kaart">
        <h2>Openingstijden</h2>
        <table class="tabel">
          <thead><tr><th>Dag</th><th>Van</th><th>Tot</th></tr></thead>
          <tbody>${rijen}</tbody>
        </table>
        <div class="veld" style="max-width: 220px; margin-top: 1rem;">
          <label for="slot-duur">Duur per afspraak</label>
          <select id="slot-duur">${duurOpties}</select>
        </div>
        <button class="knop" id="knop-tijden-opslaan">Opslaan</button>
        <span class="melding melding-goed verborgen" id="tijden-opgeslagen">Opgeslagen.</span>
      </div>`;
    el('knop-tijden-opslaan').addEventListener('click', () => {
      const nieuw = {};
      Agenda.DAG_SLEUTELS.forEach((dag) => {
        nieuw[dag] = {
          open: el('open-' + dag).checked,
          van: el('van-' + dag).value || '09:00',
          tot: el('tot-' + dag).value || '17:00',
        };
      });
      OberPoesDb.zetOpeningstijden(code, nieuw, Number(el('slot-duur').value));
      el('tijden-opgeslagen').classList.remove('verborgen');
    });
  }

  // --- Profiel ---
  function renderProfiel() {
    const t = huidigeTenant();
    const boekLink = new URL(`tenant.html?code=${t.code}`, location.href).href;
    el('view-profiel').innerHTML = `
      <div class="kaart">
        <h2>Profiel</h2>
        <div class="velden-rij">
          <img src="${t.logo}" alt="Logo" class="logo-preview">
          <div style="flex:1">
            <p><strong>${t.naam}</strong> <span class="demo-code">${t.code}</span><br>
            ${t.straat} ${t.huisnummer}, ${t.postcode} ${t.plaats}<br>
            ${t.contactpersoon} · ${t.email} · ${t.telefoon}<br>
            KvK: ${t.kvk}</p>
          </div>
        </div>
        <div class="veld">
          <label for="boek-link">Uw openbare boekingslink (deel via e-mail of frame in uw website)</label>
          <input id="boek-link" type="text" readonly value="${boekLink}">
        </div>
        <button class="knop knop-secundair" id="knop-kopieer">Kopieer link</button>
        <span class="melding melding-goed verborgen" id="gekopieerd">Gekopieerd.</span>
      </div>`;
    el('knop-kopieer').addEventListener('click', async () => {
      const veld = el('boek-link');
      veld.select();
      try { await navigator.clipboard.writeText(veld.value); }
      catch (e) { document.execCommand('copy'); }
      el('gekopieerd').classList.remove('verborgen');
    });
  }

  if (sessionStorage.getItem(SESSIE_SLEUTEL) === 'ja') toonApp();
  else el('login-kaart').classList.remove('verborgen');
})();
```

- [ ] **Step 3: Verifieer in de browser**

1. Haal het beheerwachtwoord van de actieve demo-tenant op (hoofdadmin-detail, Task 6 — zolang die er nog niet is: via console `OberPoesDb.alleTenants().find(t=>t.status==='Actief').beheerWachtwoord`).
2. `beheer.html?code=<CODE>` → wachtwoordscherm; fout wachtwoord → melding; goed → Agenda-tab met twee demo-afspraken gesorteerd.
3. Annuleer één afspraak → verdwijnt; op `tenant.html` is dat slot direct weer beschikbaar.
4. Openingstijden: zet zaterdag open 10:00–14:00, slotduur 60 → opslaan → op `tenant.html` verschijnen zaterdagen met sloten van een uur.
5. Profiel: gegevens kloppen, kopieerknop werkt.
6. `beheer.html?code=ONZIN` → niet beschikbaar. Sessie van tenant A geeft geen toegang tot `beheer.html?code=B`.

- [ ] **Step 4: Commit**

```bash
git add beheer.html js/beheer.js
git commit -m "feat: tenantbeheer met agenda, openingstijden en profiel"
```

---

### Task 6: Hoofdadmin-koppeling (activering + portaallinks)

**Files:**
- Modify: `js/admin.js`
- Modify: `admin.html` (script agenda.js toevoegen)

**Interfaces:**
- Consumes: `OberPoesDb.activeerTenant(code)` (Task 2).
- Produces: Goedkeuren activeert volledig; tenant-detail toont boekingslink, beheerlink en beheerwachtwoord voor actieve tenants; status wijzigen naar Actief via het detailformulier activeert ook.

- [ ] **Step 1: Voeg agenda.js toe aan admin.html**

```html
  <script src="js/validatie.js"></script>
  <script src="js/agenda.js"></script>
  <script src="js/db.js"></script>
  <script src="js/admin.js"></script>
```

- [ ] **Step 2: Gebruik activeerTenant bij goedkeuren (js/admin.js)**

In `renderAanvragen`, vervang binnen de click-handler:

```javascript
        const nieuwe = knop.dataset.actie === 'goedkeuren' ? 'Actief' : 'Afgewezen';
        OberPoesDb.zetStatus(knop.dataset.code, nieuwe);
```

door:

```javascript
        if (knop.dataset.actie === 'goedkeuren') OberPoesDb.activeerTenant(knop.dataset.code);
        else OberPoesDb.zetStatus(knop.dataset.code, 'Afgewezen');
```

- [ ] **Step 3: Toon portaalgegevens in het tenant-detail (js/admin.js)**

In `renderTenantDetail`, direct ná de regel met `<h2>${t.naam} ...</h2>`, voeg toe:

```javascript
        ${t.status === 'Actief' ? `
        <div class="melding melding-info">
          <strong>Portalen</strong><br>
          Boekingspagina: <a href="tenant.html?code=${t.code}" target="_blank">tenant.html?code=${t.code}</a><br>
          Beheer: <a href="beheer.html?code=${t.code}" target="_blank">beheer.html?code=${t.code}</a><br>
          Beheerwachtwoord: <span class="demo-code">${t.beheerWachtwoord}</span>
        </div>` : ''}
```

- [ ] **Step 4: Activeer ook bij statuswijziging naar Actief in het detailformulier**

In de click-handler van `knop-bewaar`, direct ná de `OberPoesDb.wijzig(t.code, {...});`-aanroep:

```javascript
      if (el('bewerk-status').value === 'Actief') OberPoesDb.activeerTenant(t.code);
```

(`activeerTenant` is idempotent: bestaand wachtwoord en tijden blijven staan.)

- [ ] **Step 5: Verifieer**

Run: `node scripts/run-tests.mjs` → alles PASS.
Browser: verse database → inschrijving doorlopen → admin → Goedkeuren → Tenants-detail toont portalen-blok met wachtwoord; links werken. Tenant op Inactief zetten → boekingspagina toont "niet beschikbaar".

- [ ] **Step 6: Commit**

```bash
git add js/admin.js admin.html
git commit -m "feat: goedkeuren activeert tenantportalen; detail toont links en wachtwoord"
```

---

### Task 7: README-update en eindverificatie

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: alles uit Task 1–6.

- [ ] **Step 1: Breid de Onderdelen-tabel in README.md uit**

Vervang de tabel door:

```markdown
| Pagina | Beschrijving |
|---|---|
| `index.html` | Openbare landingpage met tenant-inschrijving (verificatie + PDOK-adreslookup) |
| `over.html` | Over OberPoes |
| `admin.html` | Afgesloten beheer: aanvragen goedkeuren/afkeuren, tenants beheren |
| `tenant.html?code=X` | Openbare boekingspagina van één actieve tenant (deelbaar / iframe) |
| `beheer.html?code=X` | Beheer van één tenant: agenda, openingstijden, profiel (wachtwoord via hoofdadmin) |
| `tests.html` | Browser-tests voor database-, agenda- en validatielogica |
```

- [ ] **Step 2: Volledige eindverificatie**

1. `node scripts/run-tests.mjs` → alles PASS; `tests.html` in browser → zelfde.
2. Verse database → demo-data laden → actieve tenant: boekingsflow op `tenant.html`, beheerflow op `beheer.html` (agenda, annuleren, openingstijden, profiel).
3. Scheidingstest: tweede tenant activeren, controleren dat beide portalen alleen eigen afspraken tonen.
4. Nieuwe inschrijving → goedkeuren → portalen-blok in admin → beide links werken.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README uitgebreid met tenantportalen"
```
