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
