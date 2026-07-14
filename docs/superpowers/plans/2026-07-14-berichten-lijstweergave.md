# Berichten-lijstweergave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Het Berichten-tabblad toont een klikbare lijst van berichttypen met daaronder een detailbewerker voor het geselecteerde bericht — zelfde patroon als de Tenants-weergave in het hoofdadmin.

**Architecture:** Alleen `js/beheer.js`: `renderBerichten()` wordt lijst + `#bericht-detail`-container; nieuwe `renderBerichtDetail(type)`. Opslag via bestaand `zetBerichten`.

**Tech Stack:** Bestaand vanilla JS.

## Global Constraints

- Badges: Aangepast = `badge-actief`, Standaard = `badge-inactief`.
- Opslaan/herstellen raakt alleen het geselecteerde type; lijst ververst en detail blijft open.
- Geen wijzigingen in modules, database-API of tests-logica.

---

### Task 1: renderBerichten herschrijven

**Files:**
- Modify: `js/beheer.js`

- [ ] **Step 1: Vervang de volledige functie `renderBerichten` door lijst + detail**

```javascript
  function renderBerichten() {
    const t = huidigeTenant();
    const rijen = BERICHT_TYPES.map((b) => {
      const eigen = !!(t.berichten && t.berichten[b.type]);
      const eersteRegel = Berichten.voor(t, b.type).split('\n')[0];
      return `
      <tr class="klikbaar" data-bericht="${b.type}">
        <td><strong>${b.label}</strong></td>
        <td><span class="badge ${eigen ? 'badge-actief' : 'badge-inactief'}">${eigen ? 'Aangepast' : 'Standaard'}</span></td>
        <td>${eersteRegel}</td>
      </tr>`;
    }).join('');
    el('view-berichten').innerHTML = `
      <div class="kaart">
        <h2>Berichten aan klanten</h2>
        <table class="tabel">
          <thead><tr><th scope="col">Bericht</th><th scope="col">Tekst</th><th scope="col">Voorbeeld</th></tr></thead>
          <tbody>${rijen}</tbody>
        </table>
        <p><small>Klik op een rij om de tekst te bewerken.</small></p>
      </div>
      <div id="bericht-detail"></div>`;
    el('view-berichten').querySelectorAll('tr.klikbaar').forEach((rij) => {
      rij.addEventListener('click', () => renderBerichtDetail(rij.dataset.bericht));
    });
  }

  function renderBerichtDetail(type) {
    const info = BERICHT_TYPES.find((b) => b.type === type);
    el('bericht-detail').innerHTML = `
      <div class="kaart">
        <h2>${info.label}</h2>
        <p>Beschikbare invulvelden: <code>${info.velden}</code> — deze worden bij
        verzending vervangen door de echte gegevens.</p>
        <div class="veld">
          <label for="bewerk-bericht">Tekst</label>
          <textarea id="bewerk-bericht" rows="8">${Berichten.voor(huidigeTenant(), type)}</textarea>
        </div>
        <button class="knop" id="knop-bericht-opslaan">Opslaan</button>
        <button class="knop knop-secundair" id="knop-bericht-standaard">Herstel standaardtekst</button>
        <button class="knop knop-secundair" id="knop-bericht-sluit">Sluiten</button>
        <span class="melding melding-goed verborgen" id="bericht-opgeslagen" role="status">Opgeslagen.</span>
      </div>`;
    el('bericht-detail').scrollIntoView({ behavior: 'smooth' });

    function bijwerken(nieuweTekst) {
      const berichten = { ...(huidigeTenant().berichten || {}) };
      if (nieuweTekst === null) delete berichten[type];
      else berichten[type] = nieuweTekst;
      OberPoesDb.zetBerichten(code, berichten);
      renderBerichten();
      renderBerichtDetail(type);
      el('bericht-opgeslagen').classList.remove('verborgen');
    }
    el('knop-bericht-opslaan').addEventListener('click', () =>
      bijwerken(el('bewerk-bericht').value));
    el('knop-bericht-standaard').addEventListener('click', () => bijwerken(null));
    el('knop-bericht-sluit').addEventListener('click', () => {
      el('bericht-detail').innerHTML = '';
    });
  }
```

Let op: `renderBerichten()` wist `#bericht-detail` (staat in de innerHTML), dus `bijwerken` rendert eerst de lijst en daarna het detail opnieuw; de "Opgeslagen."-melding wordt in het nieuwe detail zichtbaar gemaakt.

- [ ] **Step 2: Verifieer in de browser**

Lijst: 4 rijen, badges kloppen (aangepaste boekingstekst → Aangepast). Rij klikken → detail met tekst. Wijzigen + Opslaan → badge Aangepast, voorbeeldregel bijgewerkt, detail open met melding. Herstel standaardtekst → badge Standaard. Sluiten → detail weg. Mail-simulatie gebruikt de aangepaste tekst.

- [ ] **Step 3: Tests + commit + push**

```bash
node scripts/run-tests.mjs
git add js/beheer.js docs
git commit -m "feat: berichtenbeheer als lijst met detailbewerking"
git push
```
