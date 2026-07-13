# Facturatie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tenants kunnen factuurregels definiëren, afspraken factureren (gesimuleerde PDF-mail met Mollie-betaallink), en facturen met betaalstatus volgen; gefactureerde afspraken zijn niet annuleerbaar.

**Architecture:** Pure rekenmodule `js/facturatie.js` (btw/totalen in centen), `facturen`-collectie plus factuurfuncties in `js/db.js`, twee nieuwe tabbladen en de factureer-flow in `js/beheer.js`, en twee nieuwe standalone pagina's: `factuur.html` (printbaar, vervangt PDF-bijlage) en `betaal.html` (demo-Mollie-checkout).

**Tech Stack:** Bestaand: vanilla ES2020, localStorage, testharnas (`node scripts/run-tests.mjs` + `tests.html`).

## Global Constraints

- Geen build-stap, geen dependencies; Nederlands.
- Btw: hoog = 21%, laag = 9%; regelbedragen **inclusief** btw; opslag in centen (integer); btw-deel per regel afgerond.
- Factuurnummer per tenant oplopend: `<jaar>-<4 cijfers>` (`2026-0001`).
- Factuurstatussen exact: `Open`, `Betaald`.
- Gefactureerde afspraak (`factuurId` gezet): geen annuleerknop én `annuleerAfspraak()` geeft `false`.
- Alle facturen/regels altijd per tenantcode gefilterd (case-insensitive).
- Script-laadvolgorde: `validatie.js` → `agenda.js` → `facturatie.js` → `db.js` → paginascript.
- Migratie: databases zonder `facturen`-veld worden bij lezen aangevuld.

---

### Task 1: Facturatie-rekenmodule (TDD)

**Files:**
- Create: `js/facturatie.js`
- Modify: `js/tests.js` (vóór afsluitende `OberPoesDb.wisAlles();`)
- Modify: `tests.html`, `scripts/run-tests.mjs` (facturatie.js laden)

**Interfaces:**
- Produces:
  - `Facturatie.BTW = { hoog: 21, laag: 9 }`
  - `Facturatie.totalen(regels: {btw,bedragCent}[]) → {inclCent, btwHoogCent, btwLaagCent, exclCent}`
  - `Facturatie.euro(cent: number) → string` (bijv. `'€ 12,34'`)

- [ ] **Step 1: Schrijf de failende tests (js/tests.js)**

```javascript
// --- Facturatie: rekenwerk ---
test('totalen: alleen hoog', () => {
  const t = Facturatie.totalen([{ naam: 'A', btw: 'hoog', bedragCent: 12100 }]);
  assert(t.inclCent === 12100 && t.btwHoogCent === 2100 && t.btwLaagCent === 0 && t.exclCent === 10000);
});
test('totalen: alleen laag', () => {
  const t = Facturatie.totalen([{ naam: 'B', btw: 'laag', bedragCent: 10900 }]);
  assert(t.inclCent === 10900 && t.btwLaagCent === 900 && t.btwHoogCent === 0 && t.exclCent === 10000);
});
test('totalen: gemengd met afronding per regel', () => {
  const t = Facturatie.totalen([
    { naam: 'A', btw: 'hoog', bedragCent: 999 },
    { naam: 'B', btw: 'laag', bedragCent: 555 },
  ]);
  assert(t.inclCent === 1554 && t.btwHoogCent === 173 && t.btwLaagCent === 46);
  assert(t.exclCent === 1554 - 173 - 46);
});
test('euro-notatie', () => {
  assert(Facturatie.euro(1234) === '€ 12,34', 'kreeg: ' + Facturatie.euro(1234));
});
```

- [ ] **Step 2: Laadlijsten bijwerken en tests draaien → FAIL**

`scripts/run-tests.mjs`: lijst wordt
`['js/validatie.js', 'js/agenda.js', 'js/facturatie.js', 'js/db.js', 'js/tests.js']`.
`tests.html`: `<script src="js/facturatie.js"></script>` tussen agenda.js en db.js.
Run: `node scripts/run-tests.mjs` → ENOENT of `Facturatie is not defined`.

- [ ] **Step 3: Schrijf js/facturatie.js**

```javascript
// Pure facturatiefuncties — btw en totalen in centen. Bedragen zijn incl. btw.
const Facturatie = (() => {
  const BTW = { hoog: 21, laag: 9 };

  const btwDeel = (bedragCent, tarief) =>
    Math.round(bedragCent * BTW[tarief] / (100 + BTW[tarief]));

  return {
    BTW,
    totalen(regels) {
      let inclCent = 0;
      let btwHoogCent = 0;
      let btwLaagCent = 0;
      regels.forEach((r) => {
        inclCent += r.bedragCent;
        if (r.btw === 'hoog') btwHoogCent += btwDeel(r.bedragCent, 'hoog');
        else btwLaagCent += btwDeel(r.bedragCent, 'laag');
      });
      return { inclCent, btwHoogCent, btwLaagCent, exclCent: inclCent - btwHoogCent - btwLaagCent };
    },
    euro(cent) {
      return '€ ' + (cent / 100).toLocaleString('nl-NL',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
  };
})();
```

- [ ] **Step 4: Tests draaien → PASS (35/35)**

Run: `node scripts/run-tests.mjs`

- [ ] **Step 5: Commit**

```bash
git add js/facturatie.js js/tests.js tests.html scripts/run-tests.mjs
git commit -m "feat: facturatiemodule met btw-berekening in centen"
```

---

### Task 2: Database — facturen, factuurregels, Mollie-id, annuleerblokkade (TDD)

**Files:**
- Modify: `js/db.js`
- Modify: `js/tests.js`

**Interfaces:**
- Consumes: `Facturatie` (alleen indirect via demo-data-bedragen; geen harde dependency).
- Produces:
  - `OberPoesDb.zetFactuurRegels(code, regels) → Tenant|null`
  - `OberPoesDb.zetMollieApiId(code, id) → Tenant|null`
  - `OberPoesDb.maakFactuur({tenantCode, afspraakId, regels}) → Factuur|null` (null bij onbekende of al gefactureerde afspraak)
  - `OberPoesDb.facturenVoor(tenantCode) → Factuur[]`
  - `OberPoesDb.vindFactuur(id) → Factuur|null`
  - `OberPoesDb.zetFactuurStatus(id, status) → Factuur|null`
  - `annuleerAfspraak(id)` → `false` bij `factuurId`
  - `activeerTenant` zet ook `factuurRegels: []` en `mollieApiId: ''`
  - Demo-data: actieve tenant met 2 factuurregels en `mollieApiId: 'demo_mollie_123'`

- [ ] **Step 1: Schrijf de failende tests (js/tests.js)**

```javascript
// --- Facturatie: database ---
test('maakFactuur: nummering per tenant en koppeling afspraak', () => {
  OberPoesDb.wisAlles();
  const t1 = OberPoesDb.voegToe({ naam: 'Facturant BV' });
  const t2 = OberPoesDb.voegToe({ naam: 'Ander BV' });
  const a1 = OberPoesDb.maakAfspraak({ tenantCode: t1.code, datum: '2026-07-14', tijd: '10:00', naam: 'Jan', email: 'jan@x.nl' });
  const a2 = OberPoesDb.maakAfspraak({ tenantCode: t1.code, datum: '2026-07-14', tijd: '11:00', naam: 'Piet', email: 'piet@x.nl' });
  const a3 = OberPoesDb.maakAfspraak({ tenantCode: t2.code, datum: '2026-07-14', tijd: '10:00', naam: 'Kees', email: 'kees@x.nl' });
  const regels = [{ naam: 'Consult', btw: 'hoog', bedragCent: 5000 }];
  const f1 = OberPoesDb.maakFactuur({ tenantCode: t1.code, afspraakId: a1.id, regels });
  const f2 = OberPoesDb.maakFactuur({ tenantCode: t1.code, afspraakId: a2.id, regels });
  const f3 = OberPoesDb.maakFactuur({ tenantCode: t2.code, afspraakId: a3.id, regels });
  const jaar = f1.gemaaktOp.slice(0, 4);
  assert(f1.nummer === jaar + '-0001' && f2.nummer === jaar + '-0002', f1.nummer + '/' + f2.nummer);
  assert(f3.nummer === jaar + '-0001', 'nummering per tenant');
  assert(f1.klantNaam === 'Jan' && f1.klantEmail === 'jan@x.nl' && f1.status === 'Open');
  assert(OberPoesDb.afsprakenVoor(t1.code)[0].factuurId === f1.id);
});
test('maakFactuur: dubbel factureren geeft null', () => {
  const t1 = OberPoesDb.alleTenants()[0];
  const a = OberPoesDb.afsprakenVoor(t1.code)[0];
  assert(OberPoesDb.maakFactuur({ tenantCode: t1.code, afspraakId: a.id, regels: [] }) === null);
});
test('annuleerAfspraak: gefactureerde afspraak weigert', () => {
  const t1 = OberPoesDb.alleTenants()[0];
  const a = OberPoesDb.afsprakenVoor(t1.code)[0];
  assert(OberPoesDb.annuleerAfspraak(a.id) === false);
  assert(OberPoesDb.afsprakenVoor(t1.code).some((x) => x.id === a.id), 'afspraak blijft bestaan');
});
test('facturenVoor: alleen eigen tenant; status wijzigbaar', () => {
  const [t1, t2] = OberPoesDb.alleTenants();
  assert(OberPoesDb.facturenVoor(t1.code.toLowerCase()).length === 2);
  assert(OberPoesDb.facturenVoor(t2.code).length === 1);
  const f = OberPoesDb.facturenVoor(t2.code)[0];
  assert(OberPoesDb.zetFactuurStatus(f.id, 'Betaald').status === 'Betaald');
  assert(OberPoesDb.vindFactuur(f.id).status === 'Betaald');
});
test('factuurregels en mollie-id instelbaar', () => {
  const t = OberPoesDb.alleTenants()[0];
  OberPoesDb.zetFactuurRegels(t.code, [{ id: 'R1', naam: 'Consult', btw: 'hoog', bedragCent: 4500 }]);
  OberPoesDb.zetMollieApiId(t.code, 'test_123');
  const na = OberPoesDb.vindTenant(t.code);
  assert(na.factuurRegels.length === 1 && na.mollieApiId === 'test_123');
});
test('migratie: database zonder facturen-veld werkt', () => {
  localStorage.setItem('oberpoes_db', JSON.stringify({ tenants: [], afspraken: [] }));
  assert(Array.isArray(OberPoesDb.facturenVoor('X')));
});
test('demo-data: actieve tenant heeft factuurregels en mollie-id', () => {
  OberPoesDb.wisAlles();
  OberPoesDb.laadDemoData();
  const actief = OberPoesDb.alleTenants().find((t) => t.status === 'Actief');
  assert(actief.factuurRegels.length === 2 && actief.mollieApiId === 'demo_mollie_123');
});
```

- [ ] **Step 2: Tests draaien → 7 nieuwe FAILs**

Run: `node scripts/run-tests.mjs`

- [ ] **Step 3: Breid js/db.js uit**

In `lees()`, na de afspraken-regel:

```javascript
        if (!Array.isArray(data.facturen)) data.facturen = [];
```

en de verse database wordt `{ tenants: [], afspraken: [], facturen: [] }`.

In `activeerTenant`, binnen het `wijzig`-object toevoegen:

```javascript
        factuurRegels: bestaand.factuurRegels || [],
        mollieApiId: bestaand.mollieApiId || '',
```

Vervang `annuleerAfspraak` door:

```javascript
    annuleerAfspraak(id) {
      const db = lees();
      const afspraak = db.afspraken.find((a) => a.id === id);
      if (!afspraak || afspraak.factuurId) return false;
      db.afspraken = db.afspraken.filter((a) => a.id !== id);
      schrijf(db);
      return true;
    },
```

Voeg toe na `zetOpeningstijden`:

```javascript
    zetFactuurRegels(code, regels) { return this.wijzig(code, { factuurRegels: regels }); },
    zetMollieApiId(code, id) { return this.wijzig(code, { mollieApiId: id }); },
    maakFactuur({ tenantCode, afspraakId, regels }) {
      const db = lees();
      const afspraak = db.afspraken.find((a) => a.id === afspraakId);
      if (!afspraak || afspraak.factuurId) return null;
      const norm = String(tenantCode).toUpperCase();
      const gemaaktOp = new Date().toISOString();
      const volgnummer = db.facturen.filter((f) => f.tenantCode.toUpperCase() === norm).length + 1;
      const factuur = {
        id: this.genereerCode(),
        nummer: `${gemaaktOp.slice(0, 4)}-${String(volgnummer).padStart(4, '0')}`,
        tenantCode: afspraak.tenantCode,
        afspraakId,
        klantNaam: afspraak.naam,
        klantEmail: afspraak.email,
        regels,
        status: 'Open',
        gemaaktOp,
      };
      db.facturen.push(factuur);
      afspraak.factuurId = factuur.id;
      schrijf(db);
      return factuur;
    },
    facturenVoor(tenantCode) {
      const norm = String(tenantCode).toUpperCase();
      return lees().facturen.filter((f) => f.tenantCode.toUpperCase() === norm);
    },
    vindFactuur(id) { return lees().facturen.find((f) => f.id === id) || null; },
    zetFactuurStatus(id, status) {
      const db = lees();
      const factuur = db.facturen.find((f) => f.id === id);
      if (!factuur) return null;
      factuur.status = status;
      schrijf(db);
      return factuur;
    },
```

In `laadDemoData`, direct ná `this.activeerTenant(tenants[1].code);`:

```javascript
      this.zetFactuurRegels(tenants[1].code, [
        { id: this.genereerCode(), naam: 'Consult 30 minuten', btw: 'hoog', bedragCent: 4500 },
        { id: this.genereerCode(), naam: 'Verzorgingspakket', btw: 'laag', bedragCent: 1250 },
      ]);
      this.zetMollieApiId(tenants[1].code, 'demo_mollie_123');
```

- [ ] **Step 4: Tests draaien → PASS (42/42)**

Run: `node scripts/run-tests.mjs`

- [ ] **Step 5: Commit**

```bash
git add js/db.js js/tests.js
git commit -m "feat: facturencollectie, factuurregels en annuleerblokkade in database"
```

---

### Task 3: Beheer — tabbladen Factuurregels en Facturen, Mollie-id op Profiel

**Files:**
- Modify: `beheer.html` (menu, views, script facturatie.js)
- Modify: `js/beheer.js`

**Interfaces:**
- Consumes: `OberPoesDb.zetFactuurRegels/zetMollieApiId/facturenVoor`, `Facturatie.totalen/euro` (Task 1–2).
- Produces: views `view-regels`, `view-facturen`; helper `bedragNaarCent(invoer: string) → number|null`; `renderRegels()`, `renderFacturen()`; uitgebreide `renderProfiel()`.

- [ ] **Step 1: Werk beheer.html bij**

Menu wordt:

```html
      <nav id="beheer-menu" class="verborgen">
        <a href="#" id="menu-agenda" class="actief">Agenda</a>
        <a href="#" id="menu-regels">Factuurregels</a>
        <a href="#" id="menu-facturen">Facturen</a>
        <a href="#" id="menu-tijden">Openingstijden</a>
        <a href="#" id="menu-profiel">Profiel</a>
        <a href="#" id="menu-uitloggen">Uitloggen</a>
      </nav>
```

Views-container wordt:

```html
    <div id="beheer-app" class="verborgen">
      <div id="view-agenda"></div>
      <div id="view-regels" class="verborgen"></div>
      <div id="view-facturen" class="verborgen"></div>
      <div id="view-tijden" class="verborgen"></div>
      <div id="view-profiel" class="verborgen"></div>
    </div>
```

Scripts:

```html
  <script src="js/validatie.js"></script>
  <script src="js/agenda.js"></script>
  <script src="js/facturatie.js"></script>
  <script src="js/db.js"></script>
  <script src="js/beheer.js"></script>
```

- [ ] **Step 2: Views-registratie in js/beheer.js**

In `toonView` en de menu-koppeling: vervang beide arrays `['agenda', 'tijden', 'profiel']` door `['agenda', 'regels', 'facturen', 'tijden', 'profiel']`, en voeg in `toonView` toe:

```javascript
    if (naam === 'regels') renderRegels();
    if (naam === 'facturen') renderFacturen();
```

- [ ] **Step 3: Voeg helper en renderRegels toe (na renderAgenda)**

```javascript
  // --- Factuurregels ---
  function bedragNaarCent(invoer) {
    const bedrag = parseFloat(String(invoer).replace(',', '.'));
    if (!isFinite(bedrag) || bedrag <= 0) return null;
    return Math.round(bedrag * 100);
  }
  const btwLabel = (btw) => (btw === 'hoog' ? '21% (hoog)' : '9% (laag)');

  function renderRegels() {
    const t = huidigeTenant();
    const regels = t.factuurRegels || [];
    const rijen = regels.map((r) => `
      <tr>
        <td>${r.naam}</td>
        <td>${btwLabel(r.btw)}</td>
        <td>${Facturatie.euro(r.bedragCent)}</td>
        <td><button class="knop knop-gevaar knop-klein" data-verwijder="${r.id}">Verwijderen</button></td>
      </tr>`).join('');
    el('view-regels').innerHTML = `
      <div class="kaart">
        <h2>Factuurregels</h2>
        ${regels.length === 0 ? '<p>Nog geen factuurregels gedefinieerd.</p>' : `
        <table class="tabel">
          <thead><tr><th>Naam</th><th>Btw</th><th>Bedrag (incl. btw)</th><th></th></tr></thead>
          <tbody>${rijen}</tbody>
        </table>`}
        <h3>Regel toevoegen</h3>
        <div class="velden-rij">
          <div class="veld"><label for="regel-naam">Naam</label>
            <input id="regel-naam" type="text"></div>
          <div class="veld"><label for="regel-btw">Btw</label>
            <select id="regel-btw"><option value="hoog">21% (hoog)</option><option value="laag">9% (laag)</option></select></div>
          <div class="veld"><label for="regel-bedrag">Bedrag incl. btw (€)</label>
            <input id="regel-bedrag" type="number" step="0.01" min="0"></div>
        </div>
        <span class="fout" id="fout-regel"></span>
        <button class="knop" id="knop-regel-opslaan">Toevoegen</button>
      </div>`;
    el('view-regels').querySelectorAll('button[data-verwijder]').forEach((k) => {
      k.addEventListener('click', () => {
        OberPoesDb.zetFactuurRegels(code,
          (huidigeTenant().factuurRegels || []).filter((r) => r.id !== k.dataset.verwijder));
        renderRegels();
      });
    });
    el('knop-regel-opslaan').addEventListener('click', () => {
      const naam = el('regel-naam').value.trim();
      const bedragCent = bedragNaarCent(el('regel-bedrag').value);
      if (naam.length < 2 || bedragCent === null) {
        el('fout-regel').textContent = 'Vul een naam (minimaal 2 tekens) en een bedrag groter dan 0 in.';
        return;
      }
      OberPoesDb.zetFactuurRegels(code, [
        ...(huidigeTenant().factuurRegels || []),
        { id: OberPoesDb.genereerCode(), naam, btw: el('regel-btw').value, bedragCent },
      ]);
      renderRegels();
    });
  }
```

- [ ] **Step 4: Voeg renderFacturen toe**

```javascript
  // --- Facturen ---
  let facturenFilter = 'Alle';

  function renderFacturen() {
    const alle = OberPoesDb.facturenVoor(code);
    const lijst = facturenFilter === 'Alle' ? alle : alle.filter((f) => f.status === facturenFilter);
    const opties = ['Alle', 'Open', 'Betaald']
      .map((s) => `<option ${s === facturenFilter ? 'selected' : ''}>${s}</option>`).join('');
    const statusBadge = (s) =>
      `<span class="badge ${s === 'Betaald' ? 'badge-actief' : 'badge-aangevraagd'}">${s}</span>`;
    const rijen = lijst.map((f) => `
      <tr>
        <td><strong>${f.nummer}</strong></td>
        <td>${new Date(f.gemaaktOp).toLocaleDateString('nl-NL')}</td>
        <td>${f.klantNaam}</td>
        <td>${Facturatie.euro(Facturatie.totalen(f.regels).inclCent)}</td>
        <td>${statusBadge(f.status)}</td>
        <td>
          <a class="knop knop-secundair knop-klein" href="factuur.html?id=${f.id}" target="_blank">Factuur</a>
          <a class="knop knop-secundair knop-klein" href="betaal.html?factuur=${f.id}" target="_blank">Betaalpagina</a>
        </td>
      </tr>`).join('');
    el('view-facturen').innerHTML = `
      <div class="kaart">
        <h2>Facturen</h2>
        <div class="veld" style="max-width: 220px;">
          <label for="filter-factuurstatus">Filter op status</label>
          <select id="filter-factuurstatus">${opties}</select>
        </div>
        ${lijst.length === 0 ? '<p>Geen facturen gevonden.</p>' : `
        <table class="tabel">
          <thead><tr><th>Nummer</th><th>Datum</th><th>Klant</th><th>Bedrag</th><th>Status</th><th></th></tr></thead>
          <tbody>${rijen}</tbody>
        </table>
        <p><small>De betaalstatus wordt (in de demo) afgeleid van de Mollie-betaalpagina.</small></p>`}
      </div>`;
    el('filter-factuurstatus').addEventListener('change', (e) => {
      facturenFilter = e.target.value;
      renderFacturen();
    });
  }
```

- [ ] **Step 5: Breid renderProfiel uit**

In de profiel-kaart, ná het `boek-link`-veld en de kopieerknop, toevoegen:

```javascript
        <div class="veld" style="margin-top: 1rem;">
          <label for="mollie-id">Mollie API id (voor betaallinks)</label>
          <input id="mollie-id" type="text" value="${t.mollieApiId || ''}" placeholder="bijv. live_AbC123">
        </div>
        <button class="knop" id="knop-mollie-opslaan">Mollie-id opslaan</button>
        <span class="melding melding-goed verborgen" id="mollie-opgeslagen">Opgeslagen.</span>
```

en in de handlers van renderProfiel:

```javascript
    el('knop-mollie-opslaan').addEventListener('click', () => {
      OberPoesDb.zetMollieApiId(code, el('mollie-id').value.trim());
      el('mollie-opgeslagen').classList.remove('verborgen');
    });
```

- [ ] **Step 6: Verifieer in de browser**

Demo-data laden, inloggen op beheer van de actieve tenant:
1. Tabblad Factuurregels: 2 demoregels zichtbaar; regel toevoegen (naam "Testregel", laag, 10,00) → verschijnt; verwijderen werkt; validatiefout bij leeg bedrag.
2. Tabblad Facturen: leeg ("Geen facturen gevonden."), filter aanwezig.
3. Profiel: Mollie-veld toont `demo_mollie_123`; wijzigen + opslaan → blijft na tabwissel.

- [ ] **Step 7: Commit**

```bash
git add beheer.html js/beheer.js
git commit -m "feat: tabbladen factuurregels en facturen plus mollie-id in profiel"
```

---

### Task 4: Agenda — factureren met opbouwscherm en mail-simulatie

**Files:**
- Modify: `js/beheer.js` (renderAgenda + nieuwe functies)

**Interfaces:**
- Consumes: `OberPoesDb.maakFactuur`, `Facturatie.totalen/euro`, `bedragNaarCent`, `btwLabel` (Task 3).
- Produces: factureer-flow; gefactureerde afspraken tonen badge en geen annuleerknop.

- [ ] **Step 1: Pas renderAgenda aan**

Vervang in de rijen-template de actiekolom
`<td><button class="knop knop-gevaar knop-klein" data-id="${a.id}">Annuleren</button></td>` door:

```javascript
        <td>${a.factuurId
          ? `<a class="badge badge-actief" href="factuur.html?id=${a.factuurId}" target="_blank">Gefactureerd</a>`
          : `<button class="knop knop-klein" data-factureer="${a.id}">Factureren</button>
             <button class="knop knop-gevaar knop-klein" data-id="${a.id}">Annuleren</button>`}</td>
```

Voeg ná de kaart in de innerHTML van `view-agenda` een opbouwcontainer toe:

```javascript
      </div>
      <div id="factuur-opbouw"></div>`;
```

en registreer naast de bestaande annuleer-handler:

```javascript
    el('view-agenda').querySelectorAll('button[data-factureer]').forEach((k) => {
      k.addEventListener('click', () => renderFactuurOpbouw(k.dataset.factureer));
    });
```

- [ ] **Step 2: Voeg renderFactuurOpbouw en toonMail toe (na renderAgenda)**

```javascript
  // --- Factureren van een afspraak ---
  function renderFactuurOpbouw(afspraakId) {
    const t = huidigeTenant();
    const afspraak = OberPoesDb.afsprakenVoor(code).find((a) => a.id === afspraakId);
    if (!afspraak) return;
    const losseRegels = [];

    const voorgedefinieerd = (t.factuurRegels || []).map((r) => `
      <label style="display:block">
        <input type="checkbox" class="regel-keuze" data-regel-id="${r.id}">
        ${r.naam} — ${btwLabel(r.btw)} — ${Facturatie.euro(r.bedragCent)}
      </label>`).join('') || '<p><em>Nog geen voorgedefinieerde regels (zie tabblad Factuurregels).</em></p>';

    el('factuur-opbouw').innerHTML = `
      <div class="kaart">
        <h2>Factuur voor ${afspraak.naam} — ${afspraak.datum} om ${afspraak.tijd}</h2>
        <div class="veld"><label>Voorgedefinieerde regels</label>${voorgedefinieerd}</div>
        <div class="veld">
          <label>Nieuwe regel</label>
          <div class="velden-rij">
            <input id="nieuw-naam" type="text" placeholder="Omschrijving">
            <select id="nieuw-btw"><option value="hoog">21% (hoog)</option><option value="laag">9% (laag)</option></select>
            <input id="nieuw-bedrag" type="number" step="0.01" min="0" placeholder="Bedrag incl. btw (€)">
            <button type="button" class="knop knop-secundair" id="knop-nieuw-bij">Toevoegen</button>
          </div>
          <label><input type="checkbox" id="nieuw-bewaar"> Ook bewaren als voorgedefinieerde regel</label>
          <span class="fout" id="fout-nieuw"></span>
        </div>
        <div id="losse-lijst"></div>
        <div class="melding melding-info" id="factuur-totaal">Nog geen regels gekozen.</div>
        <span class="fout" id="fout-factuur"></span>
        <button class="knop" id="knop-factureer">Factureren en mailen</button>
        <button class="knop knop-secundair" id="knop-opbouw-sluit">Sluiten</button>
      </div>`;
    el('factuur-opbouw').scrollIntoView({ behavior: 'smooth' });

    function gekozenRegels() {
      const vaste = [...el('factuur-opbouw').querySelectorAll('.regel-keuze:checked')]
        .map((c) => (huidigeTenant().factuurRegels || []).find((r) => r.id === c.dataset.regelId))
        .filter(Boolean)
        .map(({ naam, btw, bedragCent }) => ({ naam, btw, bedragCent }));
      return [...vaste, ...losseRegels];
    }
    function werkTotaalBij() {
      const regels = gekozenRegels();
      if (regels.length === 0) {
        el('factuur-totaal').textContent = 'Nog geen regels gekozen.';
        return;
      }
      const tot = Facturatie.totalen(regels);
      el('factuur-totaal').innerHTML =
        `Totaal: <strong>${Facturatie.euro(tot.inclCent)}</strong> incl. btw `
        + `(excl. ${Facturatie.euro(tot.exclCent)}, btw 21%: ${Facturatie.euro(tot.btwHoogCent)}, `
        + `btw 9%: ${Facturatie.euro(tot.btwLaagCent)})`;
    }
    el('factuur-opbouw').querySelectorAll('.regel-keuze').forEach((c) =>
      c.addEventListener('change', werkTotaalBij));

    el('knop-nieuw-bij').addEventListener('click', () => {
      const naam = el('nieuw-naam').value.trim();
      const bedragCent = bedragNaarCent(el('nieuw-bedrag').value);
      if (naam.length < 2 || bedragCent === null) {
        el('fout-nieuw').textContent = 'Vul een omschrijving en een bedrag groter dan 0 in.';
        return;
      }
      el('fout-nieuw').textContent = '';
      const regel = { naam, btw: el('nieuw-btw').value, bedragCent };
      losseRegels.push(regel);
      if (el('nieuw-bewaar').checked) {
        OberPoesDb.zetFactuurRegels(code, [
          ...(huidigeTenant().factuurRegels || []),
          { id: OberPoesDb.genereerCode(), ...regel },
        ]);
      }
      el('nieuw-naam').value = '';
      el('nieuw-bedrag').value = '';
      el('losse-lijst').innerHTML = losseRegels.map((r) =>
        `<p>+ ${r.naam} — ${btwLabel(r.btw)} — ${Facturatie.euro(r.bedragCent)}</p>`).join('');
      werkTotaalBij();
    });

    el('knop-opbouw-sluit').addEventListener('click', () => { el('factuur-opbouw').innerHTML = ''; });

    el('knop-factureer').addEventListener('click', () => {
      const regels = gekozenRegels();
      if (regels.length === 0) {
        el('fout-factuur').textContent = 'Kies of maak minimaal één factuurregel.';
        return;
      }
      const factuur = OberPoesDb.maakFactuur({ tenantCode: code, afspraakId, regels });
      if (!factuur) {
        el('fout-factuur').textContent = 'Deze afspraak is al gefactureerd.';
        return;
      }
      renderAgenda();
      toonMail(factuur);
    });
  }

  function toonMail(factuur) {
    const t = huidigeTenant();
    const totaal = Facturatie.totalen(factuur.regels);
    el('factuur-opbouw').innerHTML = `
      <div class="kaart">
        <h2>Mail verzonden (demo)</h2>
        <div class="melding melding-info">
          <strong>Aan:</strong> ${factuur.klantEmail}<br>
          <strong>Onderwerp:</strong> Factuur ${factuur.nummer} van ${t.naam}<br><br>
          Beste ${factuur.klantNaam},<br><br>
          Hierbij ontvangt u factuur ${factuur.nummer} (${Facturatie.euro(totaal.inclCent)})
          voor uw afspraak. U kunt eenvoudig online betalen via
          <a href="betaal.html?factuur=${factuur.id}" target="_blank">deze Mollie-betaallink</a>.<br><br>
          Met vriendelijke groet,<br>${t.naam}<br><br>
          <strong>Bijlage:</strong>
          <a href="factuur.html?id=${factuur.id}" target="_blank">factuur-${factuur.nummer}.pdf</a>
        </div>
        <button class="knop knop-secundair" id="knop-mail-sluit">Sluiten</button>
      </div>`;
    el('factuur-opbouw').scrollIntoView({ behavior: 'smooth' });
    el('knop-mail-sluit').addEventListener('click', () => { el('factuur-opbouw').innerHTML = ''; });
  }
```

- [ ] **Step 3: Draai tests (regressie) en verifieer in de browser**

`node scripts/run-tests.mjs` → PASS.
Browser: Agenda → Factureren bij een afspraak → vink demoregel aan + voeg nieuwe regel toe (met "bewaar") → totaal klopt → Factureren en mailen → mail-simulatie met betaallink en bijlage → afspraak toont badge "Gefactureerd", annuleerknop weg → tabblad Factuurregels bevat de bewaarde nieuwe regel → tabblad Facturen toont de factuur (Open).

- [ ] **Step 4: Commit**

```bash
git add js/beheer.js
git commit -m "feat: afspraak factureren met opbouwscherm en gesimuleerde mail"
```

---

### Task 5: Factuurpagina en demo-betaalpagina

**Files:**
- Create: `factuur.html`, `js/factuur.js`
- Create: `betaal.html`, `js/betaal.js`

**Interfaces:**
- Consumes: `OberPoesDb.vindFactuur/vindTenant/alleAfspraken/zetFactuurStatus`, `Facturatie.totalen/euro`.
- Produces: printbare factuur op `factuur.html?id=X`; demo-checkout op `betaal.html?factuur=X` die de status op `Betaald` zet.

- [ ] **Step 1: Schrijf factuur.html**

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Factuur</title>
  <link rel="stylesheet" href="css/style.css">
  <style>
    .factuur-kop { display: flex; justify-content: space-between; align-items: center; }
    .factuur-kop img { width: 90px; height: 90px; border-radius: 10px; border: 1px solid var(--rand); }
    .factuur-meta { text-align: right; }
    .totalen td { border-bottom: none; }
    .totalen tr:last-child td { font-weight: 700; border-top: 2px solid var(--paars); }
    @media print {
      .geen-print, .site-footer { display: none !important; }
      body { background: #fff; }
      .kaart { border: none; }
    }
  </style>
</head>
<body>
  <main class="container">
    <div class="kaart verborgen" id="niet-beschikbaar">
      <h2>Deze pagina is niet beschikbaar</h2>
      <p>Controleer of de link klopt.</p>
    </div>
    <div class="kaart verborgen" id="factuur">
      <div class="factuur-kop">
        <div style="display:flex; align-items:center; gap:1rem;">
          <img id="f-logo" alt="Logo">
          <div>
            <h1 id="f-tenant" style="margin:0"></h1>
            <p id="f-tenant-adres" style="margin:0; color:#666"></p>
          </div>
        </div>
        <div class="factuur-meta">
          <h2 style="margin:0">Factuur <span id="f-nummer"></span></h2>
          <p style="margin:0">Datum: <span id="f-datum"></span><br>
          Status: <span id="f-status"></span></p>
        </div>
      </div>
      <hr>
      <p><strong>Aan:</strong> <span id="f-klant"></span><br>
      <strong>Betreft:</strong> afspraak op <span id="f-afspraak"></span></p>
      <table class="tabel" id="f-regels-tabel">
        <thead><tr><th>Omschrijving</th><th>Btw</th><th style="text-align:right">Bedrag (incl.)</th></tr></thead>
        <tbody id="f-regels"></tbody>
      </table>
      <table class="tabel totalen" style="max-width: 320px; margin-left: auto; margin-top: 1rem;">
        <tbody id="f-totalen"></tbody>
      </table>
      <p class="geen-print" style="margin-top: 2rem;">
        <button class="knop" onclick="window.print()">Opslaan als PDF (afdrukken)</button>
      </p>
    </div>
  </main>
  <footer class="site-footer">mogelijk gemaakt door OberPoes</footer>
  <script src="js/validatie.js"></script>
  <script src="js/agenda.js"></script>
  <script src="js/facturatie.js"></script>
  <script src="js/db.js"></script>
  <script src="js/factuur.js"></script>
</body>
</html>
```

- [ ] **Step 2: Schrijf js/factuur.js**

```javascript
// Printbare factuurweergave (?id=X) — vervangt de PDF-bijlage in de demo.
(() => {
  if (!document.getElementById('factuur')) return;
  const el = (id) => document.getElementById(id);

  const factuur = OberPoesDb.vindFactuur(new URLSearchParams(location.search).get('id') || '');
  const tenant = factuur && OberPoesDb.vindTenant(factuur.tenantCode);
  if (!factuur || !tenant) {
    el('niet-beschikbaar').classList.remove('verborgen');
    return;
  }
  const afspraak = OberPoesDb.alleAfspraken().find((a) => a.id === factuur.afspraakId);

  document.title = `Factuur ${factuur.nummer} — ${tenant.naam}`;
  el('f-logo').src = tenant.logo;
  el('f-tenant').textContent = tenant.naam;
  el('f-tenant-adres').textContent =
    `${tenant.straat} ${tenant.huisnummer}, ${tenant.postcode} ${tenant.plaats} · KvK ${tenant.kvk}`;
  el('f-nummer').textContent = factuur.nummer;
  el('f-datum').textContent = new Date(factuur.gemaaktOp).toLocaleDateString('nl-NL');
  el('f-status').textContent = factuur.status;
  el('f-klant').textContent = `${factuur.klantNaam} (${factuur.klantEmail})`;
  el('f-afspraak').textContent = afspraak ? `${afspraak.datum} om ${afspraak.tijd}` : 'onbekend';

  el('f-regels').innerHTML = factuur.regels.map((r) => `
    <tr>
      <td>${r.naam}</td>
      <td>${r.btw === 'hoog' ? '21%' : '9%'}</td>
      <td style="text-align:right">${Facturatie.euro(r.bedragCent)}</td>
    </tr>`).join('');

  const t = Facturatie.totalen(factuur.regels);
  el('f-totalen').innerHTML = `
    <tr><td>Totaal excl. btw</td><td style="text-align:right">${Facturatie.euro(t.exclCent)}</td></tr>
    <tr><td>Btw 9% (laag)</td><td style="text-align:right">${Facturatie.euro(t.btwLaagCent)}</td></tr>
    <tr><td>Btw 21% (hoog)</td><td style="text-align:right">${Facturatie.euro(t.btwHoogCent)}</td></tr>
    <tr><td>Totaal incl. btw</td><td style="text-align:right">${Facturatie.euro(t.inclCent)}</td></tr>`;
})();
```

- [ ] **Step 3: Schrijf betaal.html**

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Betalen</title>
  <link rel="stylesheet" href="css/style.css">
  <style>
    .checkout { max-width: 420px; margin: 3rem auto; text-align: center; }
    .checkout .bedrag { font-size: 2.2rem; font-weight: 700; color: var(--paars-donker); }
  </style>
</head>
<body>
  <main class="container">
    <div class="kaart verborgen checkout" id="niet-beschikbaar">
      <h2>Deze pagina is niet beschikbaar</h2>
      <p>Controleer of de link klopt.</p>
    </div>
    <div class="kaart verborgen checkout" id="checkout">
      <p style="color:#888; margin-bottom:0">Demo-checkout (Mollie-simulatie)</p>
      <h1 id="b-tenant"></h1>
      <p id="b-omschrijving"></p>
      <p class="bedrag" id="b-bedrag"></p>
      <div id="b-open">
        <button class="knop" id="knop-betaal" style="width:100%">Betalen</button>
      </div>
      <div id="b-betaald" class="verborgen">
        <div class="melding melding-goed">Deze factuur is betaald. Dank u wel!</div>
      </div>
      <p style="color:#aaa; font-size:0.8rem" id="b-mollie"></p>
    </div>
  </main>
  <footer class="site-footer">mogelijk gemaakt door OberPoes</footer>
  <script src="js/validatie.js"></script>
  <script src="js/agenda.js"></script>
  <script src="js/facturatie.js"></script>
  <script src="js/db.js"></script>
  <script src="js/betaal.js"></script>
</body>
</html>
```

- [ ] **Step 4: Schrijf js/betaal.js**

```javascript
// Demo-betaalpagina (?factuur=X) — bootst een Mollie-checkout na.
(() => {
  if (!document.getElementById('checkout')) return;
  const el = (id) => document.getElementById(id);

  const factuur = OberPoesDb.vindFactuur(new URLSearchParams(location.search).get('factuur') || '');
  const tenant = factuur && OberPoesDb.vindTenant(factuur.tenantCode);
  if (!factuur || !tenant) {
    el('niet-beschikbaar').classList.remove('verborgen');
    return;
  }

  el('b-tenant').textContent = tenant.naam;
  el('b-omschrijving').textContent = `Factuur ${factuur.nummer}`;
  el('b-bedrag').textContent = Facturatie.euro(Facturatie.totalen(factuur.regels).inclCent);
  el('b-mollie').textContent = tenant.mollieApiId
    ? `Verwerkt via Mollie (${tenant.mollieApiId}) — demo, er wordt niets afgeschreven.`
    : 'Demo — er wordt niets afgeschreven.';
  el('checkout').classList.remove('verborgen');

  function toonBetaald() {
    el('b-open').classList.add('verborgen');
    el('b-betaald').classList.remove('verborgen');
  }
  if (factuur.status === 'Betaald') toonBetaald();

  el('knop-betaal').addEventListener('click', () => {
    OberPoesDb.zetFactuurStatus(factuur.id, 'Betaald');
    toonBetaald();
  });
})();
```

- [ ] **Step 5: Verifieer in de browser**

1. Vanuit beheer een factuur maken; open de factuurpagina → logo, tenantnaam, adres/KvK, regels, btw-uitsplitsing, totaal, status Open; printknop aanwezig (verdwijnt in printweergave).
2. Betaallink → demo-checkout met bedrag en Mollie-id-vermelding → Betalen → "betaald"-melding.
3. Facturenlijst in beheer → status Betaald; filter Open/Betaald werkt; factuurpagina toont status Betaald.
4. `factuur.html?id=ONZIN` en `betaal.html?factuur=ONZIN` → niet-beschikbaar.

- [ ] **Step 6: Commit**

```bash
git add factuur.html js/factuur.js betaal.html js/betaal.js
git commit -m "feat: printbare factuurpagina en demo-betaalpagina (Mollie-simulatie)"
```

---

### Task 6: README en eindverificatie

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Breid de Onderdelen-tabel uit**

Voeg onder de `beheer.html`-rij toe:

```markdown
| `factuur.html?id=X` | Printbare factuur (logo, regels, btw-uitsplitsing) — "PDF-bijlage" in de demo |
| `betaal.html?factuur=X` | Demo-betaalpagina (Mollie-simulatie) die de factuur op Betaald zet |
```

- [ ] **Step 2: Volledige eindverificatie**

1. `node scripts/run-tests.mjs` → 42/42; `tests.html` idem.
2. Verse demo-data → beheer: regel definiëren → afspraak factureren (mix voorgedefinieerd + nieuw met bewaren) → mail-simulatie → factuurpagina → betalen → status Betaald → filter → gefactureerde afspraak zonder annuleerknop, `annuleerAfspraak` geeft false in console.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README uitgebreid met factuur- en betaalpagina"
```
