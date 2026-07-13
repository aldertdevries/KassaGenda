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
