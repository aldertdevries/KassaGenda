// Sjablonen voor klantberichten; per tenant aanpasbaar in het beheer.
const Berichten = {
  STANDAARD: {
    boeking: 'Beste {naam},\n\nUw afspraak bij {tenant} op {datum} om {tijd} is bevestigd. 24 uur voor uw afspraak ontvangt u een herinnering per e-mail.\n\nMet vriendelijke groet,\n{tenant}',
    verzet: 'Beste {naam},\n\nUw afspraak bij {tenant} is verzet naar {datum} om {tijd}.\n\nMet vriendelijke groet,\n{tenant}',
    factuur: 'Beste {naam},\n\nHierbij ontvangt u factuur {nummer} ({bedrag}) voor uw afspraak. U kunt eenvoudig online betalen via de betaallink in dit bericht.\n\nMet vriendelijke groet,\n{tenant}',
    betaling: 'Beste {naam},\n\nWij hebben uw betaling van {bedrag} voor factuur {nummer} in goede orde ontvangen. Hartelijk dank!\n\nMet vriendelijke groet,\n{tenant}',
  },
  STANDAARD_FACTUURVOETTEKST:
    'Gelieve het bedrag binnen 14 dagen over te maken onder vermelding van het factuurnummer.',
  render(sjabloon, data) {
    return String(sjabloon).replace(/\{(\w+)\}/g,
      (heel, sleutel) => (data[sleutel] !== undefined ? data[sleutel] : heel));
  },
  voor(tenant, type) {
    return (tenant.berichten && tenant.berichten[type]) || this.STANDAARD[type];
  },
  naarHtml(tekst) { return String(tekst).replace(/\n/g, '<br>'); },
};
