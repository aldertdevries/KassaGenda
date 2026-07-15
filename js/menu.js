// Hamburgermenu voor mobiel: injecteert een ☰-knop in de header die het
// bestaande <nav> als uitschuifpaneel opent/sluit. Op desktop doet de knop
// niets (via CSS verborgen); het menu blijft dan gewoon horizontaal.
(() => {
  const header = document.querySelector('.site-header');
  const nav = header && header.querySelector('nav');
  if (!header || !nav) return;

  const knop = document.createElement('button');
  knop.className = 'menu-knop';
  knop.type = 'button';
  knop.setAttribute('aria-label', 'Menu openen of sluiten');
  knop.setAttribute('aria-expanded', 'false');
  knop.textContent = '☰';
  // Ná de nav plaatsen zodat CSS de knop kan verbergen als de nav nog
  // .verborgen is (admin/beheer vóór inloggen).
  nav.parentNode.insertBefore(knop, nav.nextSibling);

  function zet(open) {
    header.classList.toggle('menu-open', open);
    knop.setAttribute('aria-expanded', open ? 'true' : 'false');
    knop.textContent = open ? '✕' : '☰';
  }

  knop.addEventListener('click', (e) => {
    e.stopPropagation();
    zet(!header.classList.contains('menu-open'));
  });
  // Klik op een menulink sluit het paneel.
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) zet(false);
  });
  // Klik buiten de header sluit het paneel.
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-header')) zet(false);
  });
})();
