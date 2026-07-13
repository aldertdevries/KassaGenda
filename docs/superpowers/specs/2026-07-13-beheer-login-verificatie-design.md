# OberPoes — beheer-login via verificatiecode (ontwerp)

Datum: 2026-07-13
Status: goedgekeurd door gebruiker
Wijzigt: `2026-07-13-tenantportalen-design.md` (tenant-login)

## Doel

Om als tenant in het beheergedeelte (`beheer.html?code=X`) te komen moet het
geregistreerde e-mailadres **of** telefoonnummer van de tenant geverifieerd
worden met een gesimuleerde 6-cijferige code (zelfde demopatroon als bij de
inschrijving). Dit **vervangt** het beheerwachtwoord volledig (wachtwoordloos
inloggen).

## Loginflow (beheer.html + js/beheer.js)

1. Verificatiescherm in plaats van wachtwoordscherm. Twee knoppen:
   - "Stuur code naar e-mail" met het gemaskeerde e-mailadres erbij
     (eerste teken + `····` + `@domein`, bijv. `c····@viervoeters.nl`);
   - "Stuur code naar sms" met het gemaskeerde telefoonnummer erbij
     (eerste 2 + `······` + laatste 2 cijfers, bijv. `06······21`).
2. Na keuze: democode zichtbaar op het scherm ("Demo: in een echte omgeving
   ontvangt u deze code per …") + invoerveld (6 cijfers) + knop Bevestigen.
   Een link "Andere methode kiezen" gaat terug naar stap 1 (nieuwe code bij
   nieuwe keuze).
3. Juiste code → sessievlag `oberpoes_tenant_<CODE>` in `sessionStorage`
   (ongewijzigd) en de beheerapp opent. Foute code → melding "Deze code
   klopt niet.", opnieuw proberen.

## Wachtwoord verdwijnt

- `OberPoesDb.activeerTenant()` genereert geen `beheerWachtwoord` meer;
  openingstijden- en slotduur-defaults blijven. `WACHTWOORD_TEKENS` en de
  generatiecode verdwijnen uit `js/db.js`.
- Hoofdadmin (`js/admin.js`): de regel "Beheerwachtwoord: …" verdwijnt uit
  het portalen-blok in het tenant-detail.
- Bestaande records met een oud `beheerWachtwoord`-veld blijven werken; het
  veld wordt genegeerd.

## Maskeerfuncties

Nieuwe pure functies in `js/validatie.js` (daar wonen de gedeelde pure
string-functies):

- `Maskeer.email('contact@viervoeters.nl') → 'c····@viervoeters.nl'`
- `Maskeer.telefoon('0307654321') → '03······21'` (spaties/streepjes eerst
  strippen)

## Testaanpak

Unit (Node + browser): maskeerfuncties (e-mail, telefoon, korte invoer);
`activeerTenant` zet géén wachtwoord meer maar wel defaults; bestaande tests
blijven groen. End-to-end: inloggen via e-mailcode, uitloggen, inloggen via
sms-code, foute code geweigerd, sessie-isolatie tussen twee tenants intact,
portalen-blok in hoofdadmin zonder wachtwoordregel.
