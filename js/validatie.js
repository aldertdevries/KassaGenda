// Pure validatiefuncties — geen DOM, geen state.
const Validatie = {
  naam: (v) => String(v).trim().length >= 2,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()),
  postcode: (v) => /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(String(v).trim()),
  huisnummer: (v) => /^[0-9]+[a-zA-Z0-9-]*$/.test(String(v).trim()),
  kvk: (v) => /^[0-9]{8}$/.test(String(v).trim()),
  telefoon: (v) => /^(\+31|0031|0)[1-9][0-9]{8}$/.test(String(v).replace(/[\s-]/g, '')),
};
