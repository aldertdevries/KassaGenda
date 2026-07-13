// Pure validatiefuncties — geen DOM, geen state.
const Validatie = {
  naam: (v) => String(v).trim().length >= 2,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()),
  postcode: (v) => /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(String(v).trim()),
  huisnummer: (v) => /^[0-9]+[a-zA-Z0-9-]*$/.test(String(v).trim()),
  kvk: (v) => /^[0-9]{8}$/.test(String(v).trim()),
  telefoon: (v) => /^(\+31|0031|0)[1-9][0-9]{8}$/.test(String(v).replace(/[\s-]/g, '')),
};

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
