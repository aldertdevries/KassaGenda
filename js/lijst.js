// Puur zoek- en pagineerhulpje voor tabellen.
const Lijst = {
  filterEnPagineer(items, zoekterm, velden, pagina, perPagina = 10) {
    const term = String(zoekterm || '').trim().toLowerCase();
    const gefilterd = term
      ? items.filter((item) => velden.some((v) => String(item[v] || '').toLowerCase().includes(term)))
      : items;
    const paginas = Math.max(1, Math.ceil(gefilterd.length / perPagina));
    const huidige = Math.min(Math.max(1, pagina || 1), paginas);
    return {
      items: gefilterd.slice((huidige - 1) * perPagina, huidige * perPagina),
      totaal: gefilterd.length,
      paginas,
      pagina: huidige,
    };
  },
};
