# OberPoes — prototype ontwerp

Datum: 2026-07-13
Status: goedgekeurd door gebruiker

## Doel

Een klikbaar HTML-prototype van de SaaS-oplossing "OberPoes", direct hostbaar op
GitHub Pages (statisch, geen server). Het prototype demonstreert de volledige
flow: tenants schrijven zich in via het openbare gedeelte, één admin verwerkt
de aanvragen in het afgesloten gedeelte.

## Kaders en keuzes

| Onderwerp | Keuze |
|---|---|
| Hosting | GitHub Pages, statisch, geen build-stap, geen dependencies |
| Database | localStorage onder één sleutel `oberpoes_db` (JSON) — data is per browser; acceptabel voor prototype |
| E-mail-/telefoonverificatie | Gesimuleerd: 6-cijferige code wordt op het scherm getoond (demo) en moet overgetypt worden |
| Adreslookup | Echte PDOK Locatieserver API (gratis, geen key, client-side) op basis van postcode + huisnummer |
| Admin-login | Gebruikersnaam `oberpoes`, vast demo-wachtwoord `miauw2026` (hardcoded, niet veilig — bewust, demo) |
| Branding | Neutraal SaaS-platform ("OberPoes — het platform voor uw onderneming") |
| Taal UI | Nederlands |

## Architectuur

```
oberpoes/
├── index.html      → Landingpage met inschrijfformulier (openbaar)
├── over.html       → 'Over OberPoes' (openbaar)
├── admin.html      → Afgesloten admin-applicatie
├── css/style.css   → Gedeelde huisstijl
└── js/
    ├── db.js       → "Database"-module bovenop localStorage
    ├── public.js   → Formulier, verificatie, logo-schaling, PDOK-lookup
    └── admin.js    → Login, Aanvragen, Tenants
```

Vanilla HTML/CSS/JS. Openbaar en admin zijn fysiek gescheiden bestanden.

## Datamodel (js/db.js)

localStorage-sleutel `oberpoes_db` bevat `{ "tenants": [ ... ] }`.

Tenant-record:

| Veld | Type | Toelichting |
|---|---|---|
| `code` | string | 6 tekens alfanumeriek, uniek (case-insensitive), hoofdletters opgeslagen, zonder verwarrende tekens (0/O/1/I/L) |
| `naam` | string | Bedrijfsnaam |
| `logo` | string | Base64 data-URL, exact 300×300 px |
| `email` | string | Geverifieerd formaat + gesimuleerde codeverificatie |
| `postcode` | string | NL-formaat (1234 AB) |
| `huisnummer` | string | Inclusief evt. toevoeging |
| `straat` | string | Uit PDOK, alleen-lezen voor aanvrager |
| `plaats` | string | Uit PDOK, alleen-lezen voor aanvrager |
| `kvk` | string | 8 cijfers |
| `contactpersoon` | string | |
| `telefoon` | string | NL-formaat, gesimuleerde codeverificatie |
| `status` | string | `Aangevraagd` \| `Afgewezen` \| `Actief` \| `Inactief` |
| `emailGeverifieerd` | boolean | |
| `telefoonGeverifieerd` | boolean | |
| `aangevraagdOp` | string | ISO-datum |

Module-API: `alleTenants()`, `voegToe(tenant)`, `wijzig(code, velden)`,
`zetStatus(code, status)`, `genereerCode()`. Corrupte of ontbrekende
localStorage → initialisatie met lege database.

## Openbaar gedeelte

Menu bovenaan: **Home** | **Over OberPoes**.

### Landingpage (index.html)

Hero met neutrale tekst, daaronder het inschrijfformulier:

1. **Velden**: naam, logo (upload), e-mail, postcode, huisnummer, KvK-nummer,
   contactpersoon, telefoonnummer. Live formaatvalidatie (NL-postcode,
   NL-telefoon, e-mail, KvK 8 cijfers).
2. **Logo**: bij upload client-side geschaald naar exact 300×300 px via
   `<canvas>`: passend (contain), gecentreerd op witte achtergrond, met preview.
3. **Adres**: bij ingevulde postcode + huisnummer wordt PDOK Locatieserver
   bevraagd; straat en plaats verschijnen alleen-lezen. Geen resultaat of API
   onbereikbaar → duidelijke foutmelding, aanvraag kan niet ingediend worden.
4. **Verificatie**: na "Aanvragen" volgt een verificatiestap. Voor e-mail en
   telefoon elk een 6-cijferige code die (demo) op het scherm getoond en
   overgetypt moet worden. Pas na beide verificaties wordt de aanvraag
   opgeslagen met status **Aangevraagd** en toont de site de toegekende
   tenantcode als bevestiging.

### Over OberPoes (over.html)

Statische pagina met korte neutrale beschrijving van het platform.

## Admin-gedeelte (admin.html)

- **Login**: gebruikersnaam `oberpoes` + wachtwoord `miauw2026`. Sessievlag in
  `sessionStorage`; zonder vlag is alleen het loginscherm zichtbaar.
- **Menu**: Aanvragen | Tenants | Uitloggen.
- **Aanvragen**: tabel met tenants met status *Aangevraagd* (code, naam,
  logo-miniatuur, contactgegevens, datum). Per rij **Goedkeuren** (→ *Actief*)
  en **Afkeuren** (→ *Afgewezen*).
- **Tenants**: tabel met alle tenants, filterbaar op status. Detailweergave per
  tenant waarin alle gegevens ingezien en gewijzigd kunnen worden, inclusief
  status (Actief/Inactief). De tenantcode is niet wijzigbaar.
- **Statusbadges**: Aangevraagd (blauw), Afgewezen (rood), Actief (groen),
  Inactief (grijs).
- **Demo-data**: knop in de admin om enkele voorbeeldtenants te laden.

## Foutafhandeling

- PDOK onbereikbaar / postcode onbekend → melding bij het formulier.
- Corrupte/lege localStorage → lege database initialiseren.
- Dubbele code-generatie → opnieuw genereren tot uniek (case-insensitive check).

## Testaanpak

Handmatige verificatie via de browser: volledige inschrijfflow (inclusief
logo-upload, PDOK-lookup, beide verificaties), goedkeuren/afkeuren in de admin,
gegevens wijzigen, statusfilters, en controleren dat data een pagina-refresh
overleeft.
