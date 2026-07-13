# OberPoes Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een statisch HTML-prototype van SaaS-platform OberPoes met openbare tenant-inschrijving en een afgesloten admin-gedeelte, direct hostbaar op GitHub Pages.

**Architecture:** Multi-page vanilla HTML/CSS/JS zonder build-stap. `js/db.js` is een database-module bovenop localStorage (sleutel `oberpoes_db`), `js/validatie.js` bevat pure validatiefuncties, `js/public.js` en `js/admin.js` binden de UI. `tests.html` draait browser-gebaseerde assertions op de pure logica.

**Tech Stack:** HTML5, CSS3, vanilla ES2020 JavaScript, localStorage, PDOK Locatieserver API (gratis, geen key), Canvas API voor logo-schaling.

## Global Constraints

- Geen build-stap, geen dependencies, geen frameworks — alles moet direct vanaf GitHub Pages draaien.
- Alle UI-teksten in het Nederlands.
- Tenant-statussen exact: `Aangevraagd`, `Afgewezen`, `Actief`, `Inactief`.
- Tenantcode: 6 tekens uit `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (geen 0/O/1/I/L), opgeslagen in hoofdletters, uniek case-insensitive.
- Admin-login: gebruikersnaam `oberpoes`, wachtwoord `miauw2026` (hardcoded demo).
- Logo wordt geschaald naar exact 300×300 px (contain, gecentreerd, witte achtergrond) als PNG data-URL.
- localStorage-sleutel: `oberpoes_db`; sessievlag admin: `sessionStorage` sleutel `oberpoes_admin`.
- Branding neutraal: "OberPoes — het platform voor uw onderneming".
- Testen: browser-assertions in `tests.html` voor pure logica; handmatige browser-verificatie voor UI-flows (per spec).

---

### Task 1: Fundament — huisstijl, menu, landingpage-skelet en Over-pagina

**Files:**
- Create: `css/style.css`
- Create: `index.html`
- Create: `over.html`

**Interfaces:**
- Produces: CSS-klassen (`container`, `site-header`, `hero`, `kaart`, `knop`, `knop-secundair`, `veld`, `fout`, `badge badge-*`, `tabel`, `verborgen`) die alle latere taken gebruiken. `index.html` bevat een lege sectie `<section id="inschrijf-sectie">` die Task 3 vult.

- [ ] **Step 1: Schrijf css/style.css**

```css
:root {
  --paars: #5b4b8a;
  --paars-donker: #453a69;
  --accent: #e8a33d;
  --bg: #f7f6fb;
  --tekst: #2b2b33;
  --rand: #ddd9ea;
  --rood: #c0392b;
  --groen: #1e8e4e;
  --blauw: #2471a3;
  --grijs: #7f8c8d;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--tekst);
  line-height: 1.6;
}
.container { max-width: 900px; margin: 0 auto; padding: 0 1.25rem; }

/* Header en menu */
.site-header { background: var(--paars); color: #fff; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.25rem; }
.logo { color: #fff; text-decoration: none; font-size: 1.35rem; font-weight: 700; }
.site-header nav a {
  color: #e9e5f7; text-decoration: none; margin-left: 1.25rem; padding-bottom: 3px;
}
.site-header nav a.actief, .site-header nav a:hover { color: #fff; border-bottom: 2px solid var(--accent); }

/* Hero */
.hero { text-align: center; padding: 3rem 0 2rem; }
.hero h1 { font-size: 2.4rem; margin: 0 0 0.5rem; color: var(--paars-donker); }
.hero p { font-size: 1.15rem; color: #55506b; max-width: 34rem; margin: 0 auto; }

/* Kaarten en formulieren */
.kaart { background: #fff; border: 1px solid var(--rand); border-radius: 10px; padding: 1.75rem; margin: 1.5rem 0; }
.kaart h2 { margin-top: 0; color: var(--paars-donker); }
.veld { margin-bottom: 1rem; }
.veld label { display: block; font-weight: 600; margin-bottom: 0.25rem; }
.veld input, .veld select {
  width: 100%; padding: 0.55rem 0.7rem; border: 1px solid var(--rand);
  border-radius: 6px; font-size: 1rem; background: #fff;
}
.veld input[readonly] { background: #f0eef8; color: #666; }
.veld input:focus, .veld select:focus { outline: 2px solid var(--paars); border-color: var(--paars); }
.veld .fout { color: var(--rood); font-size: 0.85rem; display: block; min-height: 1.1rem; }
.velden-rij { display: flex; gap: 1rem; }
.velden-rij .veld { flex: 1; }

/* Knoppen */
.knop {
  background: var(--paars); color: #fff; border: none; border-radius: 6px;
  padding: 0.65rem 1.4rem; font-size: 1rem; font-weight: 600; cursor: pointer;
}
.knop:hover { background: var(--paars-donker); }
.knop-secundair { background: #fff; color: var(--paars); border: 1px solid var(--paars); }
.knop-secundair:hover { background: #f0eef8; }
.knop-gevaar { background: var(--rood); }
.knop-gevaar:hover { background: #96281b; }
.knop-goed { background: var(--groen); }
.knop-goed:hover { background: #166e3c; }
.knop-klein { padding: 0.3rem 0.8rem; font-size: 0.85rem; }

/* Statusbadges */
.badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 99px; font-size: 0.8rem; font-weight: 600; color: #fff; }
.badge-aangevraagd { background: var(--blauw); }
.badge-afgewezen { background: var(--rood); }
.badge-actief { background: var(--groen); }
.badge-inactief { background: var(--grijs); }

/* Tabellen */
.tabel { width: 100%; border-collapse: collapse; }
.tabel th, .tabel td { text-align: left; padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--rand); vertical-align: middle; }
.tabel th { background: #f0eef8; color: var(--paars-donker); }
.tabel img { width: 40px; height: 40px; border-radius: 6px; border: 1px solid var(--rand); }
.tabel tr.klikbaar { cursor: pointer; }
.tabel tr.klikbaar:hover { background: #faf9fd; }

/* Hulpklassen */
.verborgen { display: none !important; }
.melding { padding: 0.8rem 1rem; border-radius: 6px; margin: 1rem 0; }
.melding-fout { background: #fdecea; color: var(--rood); border: 1px solid #f5c6c1; }
.melding-info { background: #eaf2fd; color: var(--blauw); border: 1px solid #c1d8f5; }
.melding-goed { background: #e9f7ef; color: var(--groen); border: 1px solid #bfe8d0; }
.demo-code { font-family: monospace; font-size: 1.3rem; background: #f0eef8; padding: 0.2rem 0.6rem; border-radius: 6px; letter-spacing: 2px; }
.logo-preview { width: 150px; height: 150px; border: 1px dashed var(--rand); border-radius: 8px; background: #fff; object-fit: contain; }
.site-footer { text-align: center; color: #8a86a0; padding: 2rem 0; font-size: 0.9rem; }
```

- [ ] **Step 2: Schrijf index.html (skelet, formulier volgt in Task 3)**

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OberPoes — het platform voor uw onderneming</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="logo" href="index.html">🐾 OberPoes</a>
      <nav>
        <a href="index.html" class="actief">Home</a>
        <a href="over.html">Over OberPoes</a>
      </nav>
    </div>
  </header>
  <main class="container">
    <section class="hero">
      <h1>OberPoes</h1>
      <p>Het platform voor uw onderneming. Schrijf uw organisatie vandaag nog in en ga direct van start.</p>
    </section>
    <section id="inschrijf-sectie"></section>
  </main>
  <footer class="site-footer">© 2026 OberPoes — prototype</footer>
</body>
</html>
```

- [ ] **Step 3: Schrijf over.html**

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Over OberPoes</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="logo" href="index.html">🐾 OberPoes</a>
      <nav>
        <a href="index.html">Home</a>
        <a href="over.html" class="actief">Over OberPoes</a>
      </nav>
    </div>
  </header>
  <main class="container">
    <section class="hero">
      <h1>Over OberPoes</h1>
    </section>
    <div class="kaart">
      <h2>Ons verhaal</h2>
      <p>OberPoes is het platform voor uw onderneming. Wij geloven dat elke organisatie —
      groot of klein — moeiteloos digitaal moet kunnen werken. Met OberPoes beheert u uw
      organisatiegegevens op één centrale plek en bent u binnen enkele minuten operationeel.</p>
      <h2>Hoe werkt het?</h2>
      <p>U schrijft uw organisatie in via de startpagina. Na verificatie van uw gegevens
      beoordeelt ons team uw aanvraag. Zodra deze is goedgekeurd, ontvangt uw organisatie
      een unieke OberPoes-code en is uw omgeving actief.</p>
      <h2>Contact</h2>
      <p>Vragen? Neem contact op via <a href="mailto:info@oberpoes.nl">info@oberpoes.nl</a>.</p>
    </div>
  </main>
  <footer class="site-footer">© 2026 OberPoes — prototype</footer>
</body>
</html>
```

- [ ] **Step 4: Verifieer in de browser**

Open `index.html` en `over.html` in de browser (via preview of file://). Controleer: menu werkt beide kanten op, actieve menu-items gemarkeerd, hero en kaart tonen correct.

- [ ] **Step 5: Commit**

```bash
git add css/style.css index.html over.html
git commit -m "feat: fundament met huisstijl, landingpage-skelet en Over-pagina"
```

---

### Task 2: Databasemodule, validatiefuncties en tests

**Files:**
- Create: `js/db.js`
- Create: `js/validatie.js`
- Create: `tests.html`

**Interfaces:**
- Produces:
  - `OberPoesDb.alleTenants() → Tenant[]`
  - `OberPoesDb.vindTenant(code: string) → Tenant|null` (case-insensitive)
  - `OberPoesDb.genereerCode() → string` (6 tekens, uniek)
  - `OberPoesDb.voegToe(velden: object) → Tenant` (zet zelf `code`, `status: 'Aangevraagd'`, `aangevraagdOp`)
  - `OberPoesDb.wijzig(code: string, velden: object) → Tenant|null` (negeert `code`-wijzigingen)
  - `OberPoesDb.zetStatus(code: string, status: string) → Tenant|null`
  - `OberPoesDb.wisAlles() → void`
  - `OberPoesDb.laadDemoData() → void`
  - `Validatie.email/postcode/telefoon/kvk/huisnummer/naam(waarde: string) → boolean`

- [ ] **Step 1: Schrijf js/validatie.js**

```javascript
// Pure validatiefuncties — geen DOM, geen state.
const Validatie = {
  naam: (v) => String(v).trim().length >= 2,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()),
  postcode: (v) => /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(String(v).trim()),
  huisnummer: (v) => /^[0-9]+[a-zA-Z0-9-]*$/.test(String(v).trim()),
  kvk: (v) => /^[0-9]{8}$/.test(String(v).trim()),
  telefoon: (v) => /^(\+31|0031|0)[1-9][0-9]{8}$/.test(String(v).replace(/[\s-]/g, '')),
};
```

- [ ] **Step 2: Schrijf js/db.js**

```javascript
// "Database" bovenop localStorage. Eén sleutel, één JSON-object.
const OberPoesDb = (() => {
  const DB_SLEUTEL = 'oberpoes_db';
  // Zonder 0/O/1/I/L om verwarring te voorkomen.
  const CODE_TEKENS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function lees() {
    try {
      const data = JSON.parse(localStorage.getItem(DB_SLEUTEL));
      if (data && Array.isArray(data.tenants)) return data;
    } catch (e) { /* corrupte data → verse database */ }
    return { tenants: [] };
  }
  function schrijf(db) {
    localStorage.setItem(DB_SLEUTEL, JSON.stringify(db));
  }
  function zoek(db, code) {
    const norm = String(code).toUpperCase();
    return db.tenants.find((t) => t.code.toUpperCase() === norm) || null;
  }

  return {
    alleTenants() { return lees().tenants; },
    vindTenant(code) { return zoek(lees(), code); },
    genereerCode() {
      const db = lees();
      let code;
      do {
        code = Array.from({ length: 6 },
          () => CODE_TEKENS[Math.floor(Math.random() * CODE_TEKENS.length)]).join('');
      } while (zoek(db, code));
      return code;
    },
    voegToe(velden) {
      const db = lees();
      const tenant = {
        ...velden,
        code: this.genereerCode(),
        status: 'Aangevraagd',
        aangevraagdOp: new Date().toISOString(),
      };
      db.tenants.push(tenant);
      schrijf(db);
      return tenant;
    },
    wijzig(code, velden) {
      const db = lees();
      const tenant = zoek(db, code);
      if (!tenant) return null;
      const { code: _genegeerd, ...rest } = velden;
      Object.assign(tenant, rest);
      schrijf(db);
      return tenant;
    },
    zetStatus(code, status) { return this.wijzig(code, { status }); },
    wisAlles() { localStorage.removeItem(DB_SLEUTEL); },
    laadDemoData() {
      const demoLogo = (letters, kleur) => {
        const c = document.createElement('canvas');
        c.width = 300; c.height = 300;
        const ctx = c.getContext('2d');
        ctx.fillStyle = kleur; ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 120px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(letters, 150, 160);
        return c.toDataURL('image/png');
      };
      const basis = { emailGeverifieerd: true, telefoonGeverifieerd: true };
      this.voegToe({ ...basis, naam: 'Kattencafé De Spinnende Poes', logo: demoLogo('KP', '#5b4b8a'),
        email: 'info@spinnendepoes.nl', postcode: '1012 JS', huisnummer: '1',
        straat: 'Dam', plaats: 'Amsterdam', kvk: '12345678',
        contactpersoon: 'Mia Muis', telefoon: '0201234567' });
      this.voegToe({ ...basis, naam: 'Dierenpension Vier Voeters', logo: demoLogo('VV', '#1e8e4e'),
        email: 'contact@viervoeters.nl', postcode: '3511 CJ', huisnummer: '10',
        straat: 'Domplein', plaats: 'Utrecht', kvk: '87654321',
        contactpersoon: 'Rex de Groot', telefoon: '0307654321' });
      this.voegToe({ ...basis, naam: 'Poezenboetiek Fluweel', logo: demoLogo('PF', '#e8a33d'),
        email: 'hallo@fluweel.nl', postcode: '2511 CS', huisnummer: '20',
        straat: 'Plein', plaats: "'s-Gravenhage", kvk: '11223344',
        contactpersoon: 'Saartje Snor', telefoon: '0701122334' });
      // Variatie in status zodat filters iets tonen
      const tenants = this.alleTenants();
      this.zetStatus(tenants[1].code, 'Actief');
      this.zetStatus(tenants[2].code, 'Inactief');
    },
  };
})();
```

- [ ] **Step 3: Schrijf tests.html**

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>OberPoes — tests</title>
  <style>
    body { font-family: monospace; padding: 1rem; }
    .ok { color: green; } .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>OberPoes tests</h1>
  <div id="resultaten"></div>
  <script src="js/validatie.js"></script>
  <script src="js/db.js"></script>
  <script>
    const resultaten = [];
    function test(naam, fn) {
      try { fn(); resultaten.push({ naam, ok: true }); }
      catch (e) { resultaten.push({ naam, ok: false, fout: e.message }); }
    }
    function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion faalt'); }

    // Schone lei: tests draaien op de echte localStorage van deze pagina
    OberPoesDb.wisAlles();

    // --- Validatie ---
    test('email: geldig', () => assert(Validatie.email('a@b.nl')));
    test('email: ongeldig', () => assert(!Validatie.email('geen-email')));
    test('postcode: geldig met en zonder spatie', () =>
      assert(Validatie.postcode('1234 AB') && Validatie.postcode('1234ab')));
    test('postcode: ongeldig', () =>
      assert(!Validatie.postcode('0123 AB') && !Validatie.postcode('12345')));
    test('telefoon: geldig 06 / +31 / vast', () =>
      assert(Validatie.telefoon('0612345678') && Validatie.telefoon('+31612345678')
        && Validatie.telefoon('020-1234567')));
    test('telefoon: ongeldig', () =>
      assert(!Validatie.telefoon('12345') && !Validatie.telefoon('0012345678')));
    test('kvk: precies 8 cijfers', () =>
      assert(Validatie.kvk('12345678') && !Validatie.kvk('1234567') && !Validatie.kvk('1234567a')));
    test('huisnummer: 12, 12a, 12-2 geldig; abc ongeldig', () =>
      assert(Validatie.huisnummer('12') && Validatie.huisnummer('12a')
        && Validatie.huisnummer('12-2') && !Validatie.huisnummer('abc')));

    // --- Database ---
    test('lege database geeft lege lijst', () =>
      assert(OberPoesDb.alleTenants().length === 0));
    test('corrupte data → verse database', () => {
      localStorage.setItem('oberpoes_db', '{kapot');
      assert(OberPoesDb.alleTenants().length === 0);
    });
    test('genereerCode: 6 tekens, geen verwarrende tekens', () => {
      for (let i = 0; i < 50; i++) {
        const code = OberPoesDb.genereerCode();
        assert(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(code), 'kreeg: ' + code);
      }
    });
    test('voegToe: zet code, status Aangevraagd en datum', () => {
      OberPoesDb.wisAlles();
      const t = OberPoesDb.voegToe({ naam: 'Test BV' });
      assert(t.code.length === 6 && t.status === 'Aangevraagd' && !!t.aangevraagdOp);
      assert(OberPoesDb.alleTenants().length === 1);
    });
    test('vindTenant: case-insensitive', () => {
      const t = OberPoesDb.alleTenants()[0];
      assert(OberPoesDb.vindTenant(t.code.toLowerCase()) !== null);
    });
    test('wijzig: past velden aan maar nooit de code', () => {
      const t = OberPoesDb.alleTenants()[0];
      const na = OberPoesDb.wijzig(t.code, { naam: 'Nieuw BV', code: 'HACKED' });
      assert(na.naam === 'Nieuw BV' && na.code === t.code);
    });
    test('zetStatus: wijzigt status', () => {
      const t = OberPoesDb.alleTenants()[0];
      assert(OberPoesDb.zetStatus(t.code, 'Actief').status === 'Actief');
    });
    test('wijzig van onbekende code geeft null', () =>
      assert(OberPoesDb.wijzig('XXXXXX', { naam: 'x' }) === null));
    test('demo-data: 3 tenants met gevarieerde status', () => {
      OberPoesDb.wisAlles();
      OberPoesDb.laadDemoData();
      const alle = OberPoesDb.alleTenants();
      assert(alle.length === 3);
      assert(alle.some((t) => t.status === 'Aangevraagd')
        && alle.some((t) => t.status === 'Actief')
        && alle.some((t) => t.status === 'Inactief'));
    });

    OberPoesDb.wisAlles();

    document.getElementById('resultaten').innerHTML = resultaten.map((r) =>
      `<div class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '✔' : '✘'} ${r.naam}${r.fout ? ' — ' + r.fout : ''}</div>`
    ).join('') + `<p>${resultaten.filter((r) => r.ok).length}/${resultaten.length} geslaagd</p>`;
  </script>
</body>
</html>
```

- [ ] **Step 4: Draai de tests in de browser**

Open `tests.html` in de browser. Verwacht: alle tests groen (✔), teller `N/N geslaagd`. Bij rode tests: eerst implementatie fixen, dan opnieuw laden.

- [ ] **Step 5: Commit**

```bash
git add js/db.js js/validatie.js tests.html
git commit -m "feat: databasemodule en validatie met browser-tests"
```

---

### Task 3: Inschrijfformulier — validatie, logo-schaling en PDOK-adreslookup

**Files:**
- Modify: `index.html` (vul `<section id="inschrijf-sectie">` en voeg scripts toe)
- Create: `js/public.js`

**Interfaces:**
- Consumes: `Validatie.*`, `OberPoesDb.voegToe()` (Task 2).
- Produces: DOM-structuur met drie stappen (`stap-formulier`, `stap-verificatie`, `stap-klaar`); Task 4 implementeert de verificatie- en opslaglogica in ditzelfde `public.js` (functies `toonVerificatie()` en `rondAf()` worden in Task 4 ingevuld — in deze taak eindigt submit met `toonVerificatie()`-aanroep die al bestaat als lege functie).

- [ ] **Step 1: Vul het formulier in index.html**

Vervang `<section id="inschrijf-sectie"></section>` door:

```html
    <section id="inschrijf-sectie">
      <!-- Stap 1: formulier -->
      <div class="kaart" id="stap-formulier">
        <h2>Schrijf uw organisatie in</h2>
        <form id="inschrijfformulier" novalidate>
          <div class="veld">
            <label for="naam">Naam organisatie</label>
            <input id="naam" type="text" required>
            <span class="fout" id="fout-naam"></span>
          </div>
          <div class="veld">
            <label for="logo">Logo (wordt geschaald naar 300×300 px)</label>
            <input id="logo" type="file" accept="image/*" required>
            <span class="fout" id="fout-logo"></span>
            <img id="logo-preview" class="logo-preview verborgen" alt="Logovoorbeeld">
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
            <label for="kvk">KvK-nummer</label>
            <input id="kvk" type="text" placeholder="8 cijfers" required>
            <span class="fout" id="fout-kvk"></span>
          </div>
          <div class="veld">
            <label for="contactpersoon">Contactpersoon</label>
            <input id="contactpersoon" type="text" required>
            <span class="fout" id="fout-contactpersoon"></span>
          </div>
          <div class="veld">
            <label for="telefoon">Telefoonnummer</label>
            <input id="telefoon" type="tel" placeholder="0612345678" required>
            <span class="fout" id="fout-telefoon"></span>
          </div>
          <button type="submit" class="knop">Aanvragen</button>
        </form>
      </div>

      <!-- Stap 2: verificatie (Task 4) -->
      <div class="kaart verborgen" id="stap-verificatie">
        <h2>Verifieer uw gegevens</h2>
        <p>Ter controle hebben wij verificatiecodes verstuurd naar uw e-mailadres en telefoonnummer.</p>
        <div class="melding melding-info" id="demo-codes"></div>
        <div class="velden-rij">
          <div class="veld">
            <label for="email-code">Code uit e-mail</label>
            <input id="email-code" type="text" maxlength="6" autocomplete="off">
            <span class="fout" id="fout-email-code"></span>
          </div>
          <div class="veld">
            <label for="telefoon-code">Code uit sms</label>
            <input id="telefoon-code" type="text" maxlength="6" autocomplete="off">
            <span class="fout" id="fout-telefoon-code"></span>
          </div>
        </div>
        <button type="button" class="knop" id="knop-verifieer">Bevestigen</button>
      </div>

      <!-- Stap 3: bevestiging (Task 4) -->
      <div class="kaart verborgen" id="stap-klaar">
        <h2>Aanvraag ontvangen 🎉</h2>
        <div class="melding melding-goed">
          Uw aanvraag is geregistreerd en wordt beoordeeld.
          Uw unieke OberPoes-code is <span class="demo-code" id="tenant-code"></span>.
          Bewaar deze goed.
        </div>
        <a class="knop knop-secundair" href="index.html">Terug naar start</a>
      </div>
    </section>
```

En onderaan, vóór `</body>`:

```html
  <script src="js/validatie.js"></script>
  <script src="js/db.js"></script>
  <script src="js/public.js"></script>
```

- [ ] **Step 2: Schrijf js/public.js (formulierlogica; verificatie als stub)**

```javascript
// Openbaar gedeelte: inschrijfformulier, logo-schaling, PDOK-adreslookup.
(() => {
  const form = document.getElementById('inschrijfformulier');
  if (!form) return; // niet op deze pagina

  const el = (id) => document.getElementById(id);
  const zetFout = (id, tekst) => { el('fout-' + id).textContent = tekst || ''; };

  let logoDataUrl = null;   // 300×300 PNG na upload
  let adres = null;         // { straat, plaats } uit PDOK

  // --- Logo: schalen naar exact 300×300 (contain, gecentreerd, wit) ---
  function schaalLogo(bestand) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement('canvas');
        canvas.width = 300; canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 300);
        const schaal = Math.min(300 / img.width, 300 / img.height);
        const w = img.width * schaal;
        const h = img.height * schaal;
        ctx.drawImage(img, (300 - w) / 2, (300 - h) / 2, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('ongeldig beeldbestand')); };
      img.src = URL.createObjectURL(bestand);
    });
  }

  el('logo').addEventListener('change', async () => {
    zetFout('logo', '');
    logoDataUrl = null;
    const bestand = el('logo').files[0];
    const preview = el('logo-preview');
    preview.classList.add('verborgen');
    if (!bestand) return;
    try {
      logoDataUrl = await schaalLogo(bestand);
      preview.src = logoDataUrl;
      preview.classList.remove('verborgen');
    } catch (e) {
      zetFout('logo', 'Dit bestand kan niet als afbeelding gelezen worden.');
    }
  });

  // --- Adres via PDOK Locatieserver ---
  async function zoekAdres(postcode, huisnummer) {
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

  async function werkAdresBij() {
    const postcode = el('postcode').value;
    const huisnummer = el('huisnummer').value;
    adres = null;
    el('straat').value = '';
    el('plaats').value = '';
    zetFout('adres', '');
    if (!Validatie.postcode(postcode) || !Validatie.huisnummer(huisnummer)) return;
    try {
      const gevonden = await zoekAdres(postcode, huisnummer);
      if (!gevonden) {
        zetFout('adres', 'Geen adres gevonden bij deze postcode en dit huisnummer.');
        return;
      }
      adres = gevonden;
      el('straat').value = adres.straat;
      el('plaats').value = adres.plaats;
    } catch (e) {
      zetFout('adres', 'Adresservice is niet bereikbaar. Probeer het later opnieuw.');
    }
  }
  el('postcode').addEventListener('blur', werkAdresBij);
  el('huisnummer').addEventListener('blur', werkAdresBij);

  // --- Live veldvalidatie ---
  const veldRegels = {
    naam: [Validatie.naam, 'Vul de naam van uw organisatie in (minimaal 2 tekens).'],
    email: [Validatie.email, 'Vul een geldig e-mailadres in.'],
    postcode: [Validatie.postcode, 'Vul een geldige Nederlandse postcode in (1234 AB).'],
    huisnummer: [Validatie.huisnummer, 'Vul een geldig huisnummer in.'],
    kvk: [Validatie.kvk, 'Een KvK-nummer bestaat uit precies 8 cijfers.'],
    contactpersoon: [Validatie.naam, 'Vul de naam van de contactpersoon in.'],
    telefoon: [Validatie.telefoon, 'Vul een geldig Nederlands telefoonnummer in.'],
  };
  Object.entries(veldRegels).forEach(([id, [regel, melding]]) => {
    el(id).addEventListener('blur', () => {
      zetFout(id, el(id).value && !regel(el(id).value) ? melding : '');
    });
  });

  function valideerAlles() {
    let ok = true;
    Object.entries(veldRegels).forEach(([id, [regel, melding]]) => {
      const geldig = regel(el(id).value);
      zetFout(id, geldig ? '' : melding);
      if (!geldig) ok = false;
    });
    if (!logoDataUrl) { zetFout('logo', 'Upload een logo.'); ok = false; }
    if (!adres) {
      zetFout('adres', 'Het adres kon nog niet bepaald worden. Controleer postcode en huisnummer.');
      ok = false;
    }
    return ok;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!valideerAlles()) return;
    toonVerificatie(); // ingevuld in Task 4
  });

  // --- Verificatie en opslaan: Task 4 vult deze functies in ---
  function toonVerificatie() {}

  // Exporteer wat Task 4 nodig heeft binnen dit bestand: Task 4 werkt in
  // hetzelfde IIFE en vervangt de lege toonVerificatie hierboven.
  window.__oberpoesFormulier = {
    lees: () => ({
      naam: el('naam').value.trim(),
      logo: logoDataUrl,
      email: el('email').value.trim(),
      postcode: el('postcode').value.trim().toUpperCase(),
      huisnummer: el('huisnummer').value.trim(),
      straat: adres ? adres.straat : '',
      plaats: adres ? adres.plaats : '',
      kvk: el('kvk').value.trim(),
      contactpersoon: el('contactpersoon').value.trim(),
      telefoon: el('telefoon').value.trim(),
    }),
  };
})();
```

*Opmerking voor de uitvoerder:* de `window.__oberpoesFormulier`-export en lege `toonVerificatie` zijn tijdelijke naden; Task 4 herschrijft het slot van dit IIFE en verwijdert de window-export weer (alles blijft in één bestand).

- [ ] **Step 3: Verifieer in de browser**

Open `index.html`. Controleer:
1. Ongeldige waarden (bijv. postcode `123`, KvK `123`) tonen rode foutmeldingen bij verlaten van het veld.
2. Upload een afbeelding → preview verschijnt (vierkant, niet vervormd).
3. Vul een echte postcode + huisnummer in (bijv. `1012 JS` + `1`) → straat "Dam" en plaats "Amsterdam" verschijnen automatisch.
4. Onbekende combinatie (bijv. `9999 ZZ` + `1`) → foutmelding "Geen adres gevonden…".
5. Submit met geldige data doet (nog) niets zichtbaars — dat is verwacht; stap 2 volgt in Task 4.

- [ ] **Step 4: Commit**

```bash
git add index.html js/public.js
git commit -m "feat: inschrijfformulier met validatie, logo-schaling en PDOK-adreslookup"
```

---

### Task 4: Verificatiestap en opslaan van de aanvraag

**Files:**
- Modify: `js/public.js` (vervang de stub `toonVerificatie` en de `window.__oberpoesFormulier`-export)

**Interfaces:**
- Consumes: `OberPoesDb.voegToe(velden) → Tenant` (Task 2); DOM-elementen `stap-formulier`, `stap-verificatie`, `stap-klaar`, `demo-codes`, `email-code`, `telefoon-code`, `knop-verifieer`, `tenant-code` (Task 3).
- Produces: complete inschrijfflow; opgeslagen tenant heeft `emailGeverifieerd: true`, `telefoonGeverifieerd: true`, status `Aangevraagd`.

- [ ] **Step 1: Vervang het slot van het IIFE in js/public.js**

Vervang vanaf `// --- Verificatie en opslaan: Task 4 vult deze functies in ---` tot en met de `window.__oberpoesFormulier`-export (maar vóór de afsluitende `})();`) door:

```javascript
  // --- Verificatie (gesimuleerd): codes worden in de demo op het scherm getoond ---
  let emailCode = '';
  let telefoonCode = '';

  const maakCode = () => String(Math.floor(100000 + Math.random() * 900000));

  function leesFormulier() {
    return {
      naam: el('naam').value.trim(),
      logo: logoDataUrl,
      email: el('email').value.trim(),
      postcode: el('postcode').value.trim().toUpperCase(),
      huisnummer: el('huisnummer').value.trim(),
      straat: adres.straat,
      plaats: adres.plaats,
      kvk: el('kvk').value.trim(),
      contactpersoon: el('contactpersoon').value.trim(),
      telefoon: el('telefoon').value.trim(),
    };
  }

  function toonVerificatie() {
    emailCode = maakCode();
    telefoonCode = maakCode();
    el('demo-codes').innerHTML =
      '<strong>Demo:</strong> in een echte omgeving ontvangt u deze codes per e-mail en sms.<br>'
      + `E-mailcode: <span class="demo-code">${emailCode}</span> &nbsp; `
      + `Sms-code: <span class="demo-code">${telefoonCode}</span>`;
    el('stap-formulier').classList.add('verborgen');
    el('stap-verificatie').classList.remove('verborgen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('knop-verifieer').addEventListener('click', () => {
    const emailOk = el('email-code').value.trim() === emailCode;
    const telefoonOk = el('telefoon-code').value.trim() === telefoonCode;
    zetFout('email-code', emailOk ? '' : 'Deze code klopt niet.');
    zetFout('telefoon-code', telefoonOk ? '' : 'Deze code klopt niet.');
    if (!emailOk || !telefoonOk) return;

    const tenant = OberPoesDb.voegToe({
      ...leesFormulier(),
      emailGeverifieerd: true,
      telefoonGeverifieerd: true,
    });
    el('tenant-code').textContent = tenant.code;
    el('stap-verificatie').classList.add('verborgen');
    el('stap-klaar').classList.remove('verborgen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
```

Let op: de eerdere losse `function toonVerificatie() {}` stub en de volledige `window.__oberpoesFormulier = { ... };`-export moeten hierbij verdwijnen.

- [ ] **Step 2: Verifieer de volledige flow in de browser**

Open `index.html` en doorloop de hele flow:
1. Vul alle velden geldig in (echte postcode, logo-upload) en klik **Aanvragen** → verificatiestap verschijnt met twee demo-codes.
2. Vul één code fout in → foutmelding bij dat veld, aanvraag niet opgeslagen.
3. Vul beide codes correct in en klik **Bevestigen** → bevestigingsscherm met 6-teken tenantcode.
4. Open DevTools-console: `JSON.parse(localStorage.getItem('oberpoes_db'))` → 1 tenant met status `Aangevraagd`, `emailGeverifieerd: true`, logo als data-URL.
5. Herlaad de pagina → data blijft bestaan (zelfde console-check).

- [ ] **Step 3: Commit**

```bash
git add js/public.js
git commit -m "feat: gesimuleerde e-mail- en sms-verificatie en opslaan van aanvraag"
```

---

### Task 5: Admin — login, menu en pagina Aanvragen

**Files:**
- Create: `admin.html`
- Create: `js/admin.js`

**Interfaces:**
- Consumes: `OberPoesDb.alleTenants()`, `OberPoesDb.zetStatus()`, `OberPoesDb.laadDemoData()`, `OberPoesDb.wisAlles()` (Task 2).
- Produces: `admin.html` met view-containers `view-aanvragen` en `view-tenants`; `js/admin.js` met functies `toonView(naam)`, `renderAanvragen()` en een placeholder `renderTenants()` die Task 6 invult.

- [ ] **Step 1: Schrijf admin.html**

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OberPoes — beheer</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="logo" href="admin.html">🐾 OberPoes <small>beheer</small></a>
      <nav id="admin-menu" class="verborgen">
        <a href="#" id="menu-aanvragen" class="actief">Aanvragen</a>
        <a href="#" id="menu-tenants">Tenants</a>
        <a href="#" id="menu-uitloggen">Uitloggen</a>
      </nav>
    </div>
  </header>
  <main class="container">

    <!-- Login -->
    <div class="kaart" id="login-kaart" style="max-width: 420px; margin: 3rem auto;">
      <h2>Inloggen</h2>
      <div class="veld">
        <label for="gebruikersnaam">Gebruikersnaam</label>
        <input id="gebruikersnaam" type="text" autocomplete="username">
      </div>
      <div class="veld">
        <label for="wachtwoord">Wachtwoord</label>
        <input id="wachtwoord" type="password" autocomplete="current-password">
      </div>
      <span class="fout" id="fout-login"></span>
      <button class="knop" id="knop-login">Inloggen</button>
      <p class="melding melding-info">Demo: gebruikersnaam <code>oberpoes</code>, wachtwoord <code>miauw2026</code>.</p>
    </div>

    <!-- Applicatie -->
    <div id="admin-app" class="verborgen">
      <div id="view-aanvragen"></div>
      <div id="view-tenants" class="verborgen"></div>
    </div>

  </main>
  <footer class="site-footer">© 2026 OberPoes — prototype</footer>
  <script src="js/validatie.js"></script>
  <script src="js/db.js"></script>
  <script src="js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Schrijf js/admin.js met login, menu en Aanvragen-view**

```javascript
// Afgesloten beheergedeelte: login, Aanvragen en Tenants.
(() => {
  if (!document.getElementById('admin-app')) return;

  const SESSIE_SLEUTEL = 'oberpoes_admin';
  const GEBRUIKER = 'oberpoes';
  const WACHTWOORD = 'miauw2026'; // hardcoded — puur demo, nooit veilig op een statische site

  const el = (id) => document.getElementById(id);
  const badge = (status) =>
    `<span class="badge badge-${status.toLowerCase()}">${status}</span>`;
  const datum = (iso) => new Date(iso).toLocaleDateString('nl-NL');

  // --- Login ---
  function isIngelogd() { return sessionStorage.getItem(SESSIE_SLEUTEL) === 'ja'; }

  function toonApp() {
    el('login-kaart').classList.add('verborgen');
    el('admin-app').classList.remove('verborgen');
    el('admin-menu').classList.remove('verborgen');
    toonView('aanvragen');
  }

  el('knop-login').addEventListener('click', () => {
    const ok = el('gebruikersnaam').value.trim() === GEBRUIKER
      && el('wachtwoord').value === WACHTWOORD;
    if (!ok) {
      el('fout-login').textContent = 'Onjuiste gebruikersnaam of wachtwoord.';
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
    el('view-aanvragen').classList.toggle('verborgen', naam !== 'aanvragen');
    el('view-tenants').classList.toggle('verborgen', naam !== 'tenants');
    el('menu-aanvragen').classList.toggle('actief', naam === 'aanvragen');
    el('menu-tenants').classList.toggle('actief', naam === 'tenants');
    if (naam === 'aanvragen') renderAanvragen();
    if (naam === 'tenants') renderTenants();
  }
  el('menu-aanvragen').addEventListener('click', (e) => { e.preventDefault(); toonView('aanvragen'); });
  el('menu-tenants').addEventListener('click', (e) => { e.preventDefault(); toonView('tenants'); });

  // --- Aanvragen ---
  function renderAanvragen() {
    const aanvragen = OberPoesDb.alleTenants().filter((t) => t.status === 'Aangevraagd');
    const rijen = aanvragen.map((t) => `
      <tr>
        <td><img src="${t.logo}" alt=""></td>
        <td><strong>${t.naam}</strong><br><small>${t.straat} ${t.huisnummer}, ${t.plaats}</small></td>
        <td class="demo-code">${t.code}</td>
        <td>${t.contactpersoon}<br><small>${t.email} · ${t.telefoon}</small></td>
        <td>${datum(t.aangevraagdOp)}</td>
        <td>
          <button class="knop knop-goed knop-klein" data-actie="goedkeuren" data-code="${t.code}">Goedkeuren</button>
          <button class="knop knop-gevaar knop-klein" data-actie="afkeuren" data-code="${t.code}">Afkeuren</button>
        </td>
      </tr>`).join('');
    el('view-aanvragen').innerHTML = `
      <div class="kaart">
        <h2>Aanvragen</h2>
        ${aanvragen.length === 0
          ? `<p>Er zijn geen openstaande aanvragen.</p>
             <button class="knop knop-secundair" id="knop-demo">Demo-data laden</button>`
          : `<table class="tabel">
               <thead><tr><th>Logo</th><th>Organisatie</th><th>Code</th><th>Contact</th><th>Datum</th><th></th></tr></thead>
               <tbody>${rijen}</tbody>
             </table>`}
      </div>`;
    el('view-aanvragen').querySelectorAll('button[data-actie]').forEach((knop) => {
      knop.addEventListener('click', () => {
        const nieuwe = knop.dataset.actie === 'goedkeuren' ? 'Actief' : 'Afgewezen';
        OberPoesDb.zetStatus(knop.dataset.code, nieuwe);
        renderAanvragen();
      });
    });
    const demoKnop = el('view-aanvragen').querySelector('#knop-demo');
    if (demoKnop) demoKnop.addEventListener('click', () => {
      OberPoesDb.laadDemoData();
      renderAanvragen();
    });
  }

  // --- Tenants: Task 6 vult dit in ---
  function renderTenants() {
    el('view-tenants').innerHTML = '<div class="kaart"><h2>Tenants</h2><p>Volgt.</p></div>';
  }

  if (isIngelogd()) toonApp();
})();
```

- [ ] **Step 3: Verifieer in de browser**

Open `admin.html`:
1. Fout wachtwoord → foutmelding, geen toegang.
2. `oberpoes` / `miauw2026` → menu en Aanvragen-view verschijnen.
3. Geen aanvragen → knop "Demo-data laden"; klik → 1 aanvraag (De Spinnende Poes) verschijnt in de tabel met logo, code, contact en datum.
4. **Goedkeuren** → rij verdwijnt (status Actief). Doorloop op `index.html` een nieuwe inschrijving en keur die **af** → rij verdwijnt (status Afgewezen). Check in console dat statussen kloppen.
5. Herlaad `admin.html` → nog ingelogd (sessionStorage). Klik **Uitloggen** → terug naar loginscherm.

- [ ] **Step 4: Commit**

```bash
git add admin.html js/admin.js
git commit -m "feat: admin met login, menu en verwerking van aanvragen"
```

---

### Task 6: Admin — pagina Tenants (inzien, filteren, wijzigen)

**Files:**
- Modify: `js/admin.js` (vervang de placeholder `renderTenants`)

**Interfaces:**
- Consumes: `OberPoesDb.alleTenants()`, `OberPoesDb.wijzig(code, velden)`, `Validatie.*`; hulpfuncties `el`, `badge`, `datum` en container `view-tenants` uit Task 5.
- Produces: complete Tenants-view met statusfilter, detail-/bewerkformulier. Tenantcode is niet wijzigbaar.

- [ ] **Step 1: Vervang de placeholder renderTenants in js/admin.js**

Vervang de volledige functie `renderTenants` (de placeholder uit Task 5) door:

```javascript
  // --- Tenants ---
  let tenantsFilter = 'Alle';

  function renderTenants() {
    const alle = OberPoesDb.alleTenants();
    const lijst = tenantsFilter === 'Alle'
      ? alle : alle.filter((t) => t.status === tenantsFilter);
    const opties = ['Alle', 'Aangevraagd', 'Afgewezen', 'Actief', 'Inactief']
      .map((s) => `<option ${s === tenantsFilter ? 'selected' : ''}>${s}</option>`).join('');
    const rijen = lijst.map((t) => `
      <tr class="klikbaar" data-code="${t.code}">
        <td><img src="${t.logo}" alt=""></td>
        <td><strong>${t.naam}</strong></td>
        <td class="demo-code">${t.code}</td>
        <td>${badge(t.status)}</td>
        <td>${t.plaats}</td>
        <td>${datum(t.aangevraagdOp)}</td>
      </tr>`).join('');
    el('view-tenants').innerHTML = `
      <div class="kaart">
        <h2>Tenants</h2>
        <div class="veld" style="max-width: 220px;">
          <label for="filter-status">Filter op status</label>
          <select id="filter-status">${opties}</select>
        </div>
        ${lijst.length === 0 ? '<p>Geen tenants gevonden.</p>' : `
        <table class="tabel">
          <thead><tr><th>Logo</th><th>Organisatie</th><th>Code</th><th>Status</th><th>Plaats</th><th>Aangevraagd</th></tr></thead>
          <tbody>${rijen}</tbody>
        </table>
        <p><small>Klik op een rij om de gegevens in te zien of te wijzigen.</small></p>`}
      </div>
      <div id="tenant-detail"></div>`;
    el('filter-status').addEventListener('change', (e) => {
      tenantsFilter = e.target.value;
      renderTenants();
    });
    el('view-tenants').querySelectorAll('tr.klikbaar').forEach((rij) => {
      rij.addEventListener('click', () => renderTenantDetail(rij.dataset.code));
    });
  }

  function renderTenantDetail(code) {
    const t = OberPoesDb.vindTenant(code);
    if (!t) return;
    const veld = (id, label, waarde, extra = '') => `
      <div class="veld">
        <label for="bewerk-${id}">${label}</label>
        <input id="bewerk-${id}" type="text" value="${waarde}" ${extra}>
        <span class="fout" id="fout-bewerk-${id}"></span>
      </div>`;
    const statusOpties = ['Aangevraagd', 'Afgewezen', 'Actief', 'Inactief']
      .map((s) => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('');
    el('tenant-detail').innerHTML = `
      <div class="kaart">
        <h2>${t.naam} <span class="demo-code">${t.code}</span></h2>
        <div class="velden-rij">
          <img src="${t.logo}" alt="Logo" class="logo-preview">
          <div style="flex:1">
            ${veld('naam', 'Naam organisatie', t.naam)}
            <div class="veld">
              <label for="bewerk-status">Status</label>
              <select id="bewerk-status">${statusOpties}</select>
            </div>
          </div>
        </div>
        ${veld('email', 'E-mailadres', t.email)}
        <div class="velden-rij">
          ${veld('postcode', 'Postcode', t.postcode)}
          ${veld('huisnummer', 'Huisnummer', t.huisnummer)}
        </div>
        <div class="velden-rij">
          ${veld('straat', 'Straat', t.straat)}
          ${veld('plaats', 'Plaats', t.plaats)}
        </div>
        ${veld('kvk', 'KvK-nummer', t.kvk)}
        ${veld('contactpersoon', 'Contactpersoon', t.contactpersoon)}
        ${veld('telefoon', 'Telefoonnummer', t.telefoon)}
        <span class="fout" id="fout-bewerk-algemeen"></span>
        <button class="knop" id="knop-bewaar">Opslaan</button>
        <button class="knop knop-secundair" id="knop-sluit">Sluiten</button>
      </div>`;
    el('tenant-detail').scrollIntoView({ behavior: 'smooth' });

    el('knop-sluit').addEventListener('click', () => { el('tenant-detail').innerHTML = ''; });
    el('knop-bewaar').addEventListener('click', () => {
      const regels = {
        naam: Validatie.naam, email: Validatie.email, postcode: Validatie.postcode,
        huisnummer: Validatie.huisnummer, kvk: Validatie.kvk,
        contactpersoon: Validatie.naam, telefoon: Validatie.telefoon,
      };
      let ok = true;
      Object.entries(regels).forEach(([id, regel]) => {
        const geldig = regel(el('bewerk-' + id).value);
        el('fout-bewerk-' + id).textContent = geldig ? '' : 'Ongeldige waarde.';
        if (!geldig) ok = false;
      });
      if (!ok) return;
      OberPoesDb.wijzig(t.code, {
        naam: el('bewerk-naam').value.trim(),
        email: el('bewerk-email').value.trim(),
        postcode: el('bewerk-postcode').value.trim().toUpperCase(),
        huisnummer: el('bewerk-huisnummer').value.trim(),
        straat: el('bewerk-straat').value.trim(),
        plaats: el('bewerk-plaats').value.trim(),
        kvk: el('bewerk-kvk').value.trim(),
        contactpersoon: el('bewerk-contactpersoon').value.trim(),
        telefoon: el('bewerk-telefoon').value.trim(),
        status: el('bewerk-status').value,
      });
      el('tenant-detail').innerHTML = '';
      renderTenants();
    });
  }
```

- [ ] **Step 2: Verifieer in de browser**

Op `admin.html`, ingelogd, tab **Tenants**:
1. Alle tenants zichtbaar met logo, code, statusbadge (juiste kleuren), plaats en datum.
2. Filter op `Actief` → alleen actieve tenants; filter op `Alle` → alles terug.
3. Klik een rij → detailformulier met alle gegevens; de code staat in de titel en is nergens bewerkbaar.
4. Wijzig de naam en zet status op `Inactief` → **Opslaan** → tabel toont nieuwe naam en grijze badge Inactief.
5. Vul een ongeldig e-mailadres in → foutmelding, opslaan geblokkeerd.
6. Herlaad de pagina → wijzigingen bewaard gebleven.

- [ ] **Step 3: Draai tests.html opnieuw**

Open `tests.html` → nog steeds alle tests groen (regressiecheck).

- [ ] **Step 4: Commit**

```bash
git add js/admin.js
git commit -m "feat: tenantbeheer met filter en bewerkbaar detailformulier"
```

---

### Task 7: README, eindverificatie en deploy-instructies

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: alles uit Task 1–6.
- Produces: gedocumenteerde repo, klaar om naar GitHub te pushen en via Pages te hosten.

- [ ] **Step 1: Schrijf README.md**

```markdown
# OberPoes — prototype

Statisch HTML-prototype van SaaS-platform OberPoes. Geen build-stap, geen
dependencies: direct hostbaar op GitHub Pages.

## Onderdelen

| Pagina | Beschrijving |
|---|---|
| `index.html` | Openbare landingpage met tenant-inschrijving (verificatie + PDOK-adreslookup) |
| `over.html` | Over OberPoes |
| `admin.html` | Afgesloten beheer: aanvragen goedkeuren/afkeuren, tenants beheren |
| `tests.html` | Browser-tests voor database- en validatielogica |

## Demo-inloggegevens

- Gebruikersnaam: `oberpoes`
- Wachtwoord: `miauw2026`

> Let op: dit is een prototype. De "database" is localStorage (per browser),
> de verificatiecodes worden op het scherm getoond en het admin-wachtwoord
> staat hardcoded in de bron. Niets hiervan is productieveilig — bewust.

## Hosten op GitHub Pages

1. Push deze repo naar GitHub.
2. Ga naar **Settings → Pages**, kies branch `master` (of `main`), map `/ (root)`.
3. De site staat daarna op `https://<gebruiker>.github.io/<repo>/`.

## Lokaal draaien

Open `index.html` in een browser, of start een simpele webserver:
`python -m http.server` of `npx serve`.
```

- [ ] **Step 2: Volledige eindverificatie in de browser**

Doorloop het complete scenario:
1. `tests.html` → alle tests groen.
2. Wis localStorage (`OberPoesDb.wisAlles()` in console op index.html).
3. Volledige inschrijving op `index.html` (logo, echte postcode, beide verificatiecodes) → tenantcode getoond.
4. `admin.html` → inloggen → aanvraag zichtbaar → goedkeuren.
5. Tenants-tab → tenant is Actief → gegevens wijzigen → bewaard na refresh.
6. `over.html` → menu-navigatie werkt overal.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README met demo-gegevens en GitHub Pages-instructies"
```
