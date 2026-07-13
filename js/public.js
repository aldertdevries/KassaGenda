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
    toonVerificatie();
  });

  // --- Verificatie en opslaan: Task 4 vult deze functies in ---
  function toonVerificatie() {}
})();
