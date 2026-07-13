# Beheer-login via verificatiecode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tenant-login op `beheer.html?code=X` wordt wachtwoordloos: verificatie van het geregistreerde e-mailadres of telefoonnummer met een gesimuleerde 6-cijferige code vervangt het beheerwachtwoord.

**Architecture:** Maskeerfuncties komen als pure functies in `js/validatie.js` (testbaar via het bestaande harnas). De loginsectie van `beheer.html`/`js/beheer.js` wordt vervangen door een tweestapsflow (methode kiezen → code overtypen). `js/db.js` en `js/admin.js` raken het wachtwoord kwijt.

**Tech Stack:** Bestaand: vanilla ES2020, localStorage, testharnas (`node scripts/run-tests.mjs` + `tests.html`).

## Global Constraints

- Geen build-stap, geen dependencies; Nederlands; bestaande sessievlag `sessionStorage` sleutel `oberpoes_tenant_<CODE>` (hoofdletters) blijft ongewijzigd.
- Democode zichtbaar op het scherm, zelfde patroon als inschrijfverificatie ("Demo: in een echte omgeving ontvangt u deze code per …").
- Maskering: e-mail `c····@domein`, telefoon `03······21` (eerste 2 + laatste 2 cijfers, spaties/streepjes gestript).
- Bestaande records met oud `beheerWachtwoord`-veld blijven werken (veld wordt genegeerd).

---

### Task 1: Maskeerfuncties (TDD)

**Files:**
- Modify: `js/validatie.js`
- Modify: `js/tests.js` (test toevoegen vóór de afsluitende `OberPoesDb.wisAlles();`)

**Interfaces:**
- Produces: `Maskeer.email(v: string) → string`, `Maskeer.telefoon(v: string) → string` (globale const `Maskeer`, naast `Validatie`).

- [ ] **Step 1: Schrijf de failende test (js/tests.js)**

```javascript
// --- Maskering ---
test('maskeer: e-mail en telefoon', () => {
  assert(Maskeer.email('contact@viervoeters.nl') === 'c····@viervoeters.nl',
    'kreeg: ' + Maskeer.email('contact@viervoeters.nl'));
  assert(Maskeer.telefoon('0307654321') === '03······21',
    'kreeg: ' + Maskeer.telefoon('0307654321'));
  assert(Maskeer.telefoon('06-1234 5678') === '06······78');
});
```

- [ ] **Step 2: Draai tests → FAIL (`Maskeer is not defined`)**

Run: `node scripts/run-tests.mjs`

- [ ] **Step 3: Voeg Maskeer toe aan js/validatie.js (onder Validatie)**

```javascript
// Maskering voor het tonen van contactgegevens zonder ze prijs te geven.
const Maskeer = {
  email: (v) => {
    const [naam, domein] = String(v).trim().split('@');
    return (naam[0] || '') + '····@' + (domein || '');
  },
  telefoon: (v) => {
    const cijfers = String(v).replace(/[\s-]/g, '');
    return cijfers.slice(0, 2) + '······' + cijfers.slice(-2);
  },
};
```

- [ ] **Step 4: Draai tests → PASS (31/31)**

Run: `node scripts/run-tests.mjs`

- [ ] **Step 5: Commit**

```bash
git add js/validatie.js js/tests.js
git commit -m "feat: maskeerfuncties voor e-mail en telefoon"
```

---

### Task 2: Wachtwoord verwijderen uit database en hoofdadmin

**Files:**
- Modify: `js/db.js` (activeerTenant, WACHTWOORD_TEKENS weg)
- Modify: `js/tests.js` (twee bestaande tests aanpassen)
- Modify: `js/admin.js` (wachtwoordregel uit portalen-blok)

**Interfaces:**
- Produces: `OberPoesDb.activeerTenant(code)` zet alleen nog `status`, `openingstijden`, `slotDuur`; genereert géén `beheerWachtwoord`.

- [ ] **Step 1: Pas de twee bestaande tests aan (js/tests.js)**

Vervang de volledige test `'activeerTenant: zet status, wachtwoord en defaults; idempotent'` door:

```javascript
test('activeerTenant: zet status en defaults, geen wachtwoord', () => {
  OberPoesDb.wisAlles();
  const t = OberPoesDb.voegToe({ naam: 'Activeer BV' });
  const na = OberPoesDb.activeerTenant(t.code);
  assert(na.status === 'Actief');
  assert(na.beheerWachtwoord === undefined, 'wachtwoordloos: geen beheerWachtwoord');
  assert(na.openingstijden.ma.open === true && na.slotDuur === 30);
});
```

En in de test `'demo-data: actieve tenant heeft wachtwoord en afspraken'`: hernoem
naar `'demo-data: actieve tenant heeft openingstijden en afspraken'` en vervang

```javascript
  assert(!!actief.beheerWachtwoord && !!actief.openingstijden);
```

door

```javascript
  assert(!!actief.openingstijden && actief.slotDuur === 30);
```

- [ ] **Step 2: Draai tests → de aangepaste activeerTenant-test FAALT (wachtwoord wordt nog gezet)**

Run: `node scripts/run-tests.mjs`

- [ ] **Step 3: Verwijder wachtwoordgeneratie uit js/db.js**

Verwijder de regel `const WACHTWOORD_TEKENS = 'abcdefghjkmnpqrstuvwxyz23456789';`
en vervang de functie `activeerTenant` door:

```javascript
    activeerTenant(code) {
      const bestaand = this.vindTenant(code);
      if (!bestaand) return null;
      return this.wijzig(code, {
        status: 'Actief',
        openingstijden: bestaand.openingstijden || Agenda.standaardOpeningstijden(),
        slotDuur: bestaand.slotDuur || 30,
      });
    },
```

- [ ] **Step 4: Verwijder de wachtwoordregel uit js/admin.js**

In het portalen-blok in `renderTenantDetail`, verwijder de regel:

```javascript
          Beheerwachtwoord: <span class="demo-code">${t.beheerWachtwoord}</span>
```

en de `<br>` aan het einde van de beheerlink-regel erboven wordt de laatste regel (haal die `<br>` weg).

- [ ] **Step 5: Draai tests → PASS (31/31)**

Run: `node scripts/run-tests.mjs`

- [ ] **Step 6: Commit**

```bash
git add js/db.js js/tests.js js/admin.js
git commit -m "feat: beheerwachtwoord verwijderd uit activering en admin-detail"
```

---

### Task 3: Wachtwoordloze loginflow in het tenantbeheer

**Files:**
- Modify: `beheer.html` (loginkaart vervangen)
- Modify: `js/beheer.js` (loginsectie vervangen)

**Interfaces:**
- Consumes: `Maskeer.email`, `Maskeer.telefoon` (Task 1); `tenant.email`, `tenant.telefoon` uit het tenant-record.
- Produces: login via e-mail- of sms-code; sessievlag ongewijzigd.

- [ ] **Step 1: Vervang de loginkaart in beheer.html**

Vervang het volledige `<div class="kaart verborgen" id="login-kaart" ...>...</div>`-blok door:

```html
    <div class="kaart verborgen" id="login-kaart" style="max-width: 480px; margin: 3rem auto;">
      <h2>Beheer — inloggen</h2>
      <div id="methode-keuze">
        <p>Bevestig dat u het bent. Waar mogen wij de verificatiecode heen sturen?</p>
        <p><button class="knop" id="knop-email">Stuur code naar e-mail (<span id="masker-email"></span>)</button></p>
        <p><button class="knop" id="knop-sms">Stuur code naar sms (<span id="masker-telefoon"></span>)</button></p>
      </div>
      <div id="code-stap" class="verborgen">
        <div class="melding melding-info" id="demo-login-code"></div>
        <div class="veld">
          <label for="login-code">Verificatiecode</label>
          <input id="login-code" type="text" maxlength="6" autocomplete="off">
          <span class="fout" id="fout-login"></span>
        </div>
        <p>
          <button class="knop" id="knop-verifieer">Bevestigen</button>
          <a href="#" id="andere-methode">Andere methode kiezen</a>
        </p>
      </div>
    </div>
```

Ook het script `js/adres.js` is hier niet nodig (staat er nu ook niet) — laadvolgorde blijft `validatie.js` → `agenda.js` → `db.js` → `beheer.js`.

- [ ] **Step 2: Vervang de loginsectie in js/beheer.js**

Vervang het blok vanaf `// --- Login ---` tot aan `// --- Views ---` door:

```javascript
  // --- Login: wachtwoordloos via verificatie van e-mail of telefoon ---
  function toonApp() {
    el('login-kaart').classList.add('verborgen');
    el('beheer-app').classList.remove('verborgen');
    el('beheer-menu').classList.remove('verborgen');
    toonView('agenda');
  }

  let verwachteCode = '';
  el('masker-email').textContent = Maskeer.email(tenant.email);
  el('masker-telefoon').textContent = Maskeer.telefoon(tenant.telefoon);

  function stuurCode(kanaal) {
    verwachteCode = String(Math.floor(100000 + Math.random() * 900000));
    el('demo-login-code').innerHTML =
      `<strong>Demo:</strong> in een echte omgeving ontvangt u deze code per ${kanaal}.<br>`
      + `Code: <span class="demo-code">${verwachteCode}</span>`;
    el('login-code').value = '';
    el('fout-login').textContent = '';
    el('methode-keuze').classList.add('verborgen');
    el('code-stap').classList.remove('verborgen');
  }
  el('knop-email').addEventListener('click', () => stuurCode('e-mail'));
  el('knop-sms').addEventListener('click', () => stuurCode('sms'));
  el('andere-methode').addEventListener('click', (e) => {
    e.preventDefault();
    verwachteCode = '';
    el('code-stap').classList.add('verborgen');
    el('methode-keuze').classList.remove('verborgen');
  });
  el('knop-verifieer').addEventListener('click', () => {
    if (!verwachteCode || el('login-code').value.trim() !== verwachteCode) {
      el('fout-login').textContent = 'Deze code klopt niet.';
      return;
    }
    sessionStorage.setItem(SESSIE_SLEUTEL, 'ja');
    toonApp();
  });
  el('login-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el('knop-verifieer').click();
  });
  el('menu-uitloggen').addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem(SESSIE_SLEUTEL);
    location.reload();
  });
```

Let op: de oude handlers voor `knop-login` en het wachtwoordveld verdwijnen hiermee volledig; de uitlog-handler verhuist mee naar dit blok (stond eerst apart).

- [ ] **Step 3: Draai tests → PASS (regressie)**

Run: `node scripts/run-tests.mjs`

- [ ] **Step 4: Verifieer end-to-end in de browser**

1. Demo-data laden; actieve tenantcode ophalen.
2. `beheer.html?code=<CODE>` → methodekeuze met gemaskeerd e-mailadres én telefoonnummer (geen echte gegevens leesbaar).
3. "Stuur code naar e-mail" → democode zichtbaar; foute code → "Deze code klopt niet."; juiste code → beheerapp opent.
4. Uitloggen → "Andere methode kiezen"-flow: kies sms → nieuwe code → inloggen lukt.
5. Sessie-isolatie: ingelogd bij tenant A, `beheer.html?code=B` vraagt opnieuw verificatie.
6. Hoofdadmin tenant-detail: portalen-blok toont géén wachtwoordregel meer.

- [ ] **Step 5: Commit**

```bash
git add beheer.html js/beheer.js
git commit -m "feat: wachtwoordloze beheer-login via e-mail- of sms-verificatie"
```
