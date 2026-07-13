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
