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
