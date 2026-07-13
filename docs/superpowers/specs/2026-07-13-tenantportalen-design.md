# OberPoes — tenantportalen met online agenda (ontwerp)

Datum: 2026-07-13
Status: goedgekeurd door gebruiker
Bouwt voort op: `2026-07-13-oberpoes-prototype-design.md`

## Doel

Elke **actieve** tenant krijgt een eigen openbaar gedeelte en een eigen
beheergedeelte, beide uniek gemaakt door de tenantcode in de URL:

- `tenant.html?code=XXXXXX` — openbare boekingspagina; wordt gedeeld via
  e-maillinks of geframed in de website van de tenant.
- `beheer.html?code=XXXXXX` — beheergedeelte van de tenant, afgeschermd met
  een wachtwoord.

Op tenantpagina's is **niets** van andere tenants zichtbaar; alle data wordt
altijd per tenantcode gefilterd.

## Kaders en keuzes

| Onderwerp | Keuze |
|---|---|
| Agenda-beschikbaarheid | Tenant stelt zelf openingstijden en slotduur in via het beheergedeelte |
| Tenant-login | Tenantcode in URL + wachtwoord; wachtwoord wordt gegenereerd bij goedkeuring en is zichtbaar voor de hoofdadmin |
| E-mail/telefoon klant | Alleen formaatvalidatie (geen code-verificatiestap) |
| Adres klant | PDOK-lookup uit postcode + huisnummer, zoals bij tenant-inschrijving |
| Tenantbeheer-functies | Agenda inzien, afspraken annuleren, openingstijden instellen, eigen profiel inzien met deelbare boekingslink |
| Boeking | Eén afspraak per boekingsflow |
| Iframe | Openbare boekingspagina heeft kale opmaak zonder OberPoes-menu, geschikt voor framing |

## Datamodel-uitbreiding (js/db.js)

Tenant-record, nieuwe velden (gezet bij goedkeuring; demo-data ook):

| Veld | Type | Toelichting |
|---|---|---|
| `beheerWachtwoord` | string | 8 tekens, gegenereerd bij goedkeuring, zichtbaar in hoofdadmin |
| `openingstijden` | object | Per weekdag (`ma`…`zo`): `{ open: boolean, van: 'HH:MM', tot: 'HH:MM' }`; default ma–vr 09:00–17:00 open, za/zo dicht |
| `slotDuur` | number | Minuten per afspraakslot, default 30 |

Nieuwe collectie `afspraken` in hetzelfde `oberpoes_db`-object:

| Veld | Type | Toelichting |
|---|---|---|
| `id` | string | Uniek (zelfde generator als tenantcodes) |
| `tenantCode` | string | Koppeling naar tenant |
| `datum` | string | `YYYY-MM-DD` |
| `tijd` | string | `HH:MM` (start van het slot) |
| `naam` | string | Klantnaam |
| `email` | string | Formaatvalidatie |
| `postcode` | string | NL-formaat |
| `huisnummer` | string | |
| `straat` | string | Uit PDOK |
| `plaats` | string | Uit PDOK |
| `extra` | string | Vrij tekstveld, optioneel |
| `telefoon` | string | Formaatvalidatie |
| `gemaaktOp` | string | ISO-datum |

Nieuwe db-functies:
- `afsprakenVoor(tenantCode) → Afspraak[]`
- `maakAfspraak(velden) → Afspraak|null` — geeft `null` als het slot al bezet is (dubbelboek-check)
- `annuleerAfspraak(id) → boolean`
- `zetOpeningstijden(code, openingstijden, slotDuur) → Tenant|null`
- `activeerTenant(code) → Tenant|null` — zet status Actief + genereert `beheerWachtwoord`, default `openingstijden` en `slotDuur` (gebruikt door Goedkeuren in hoofdadmin)

Slotberekening (pure functie, testbaar): gegeven openingstijden, slotduur,
datum en bestaande afspraken → lijst `{ tijd, vrij }`.

## Openbare boekingspagina (tenant.html)

- Leest `?code=` uit de URL. Onbekende code of status ≠ Actief → nette
  melding "Deze pagina is niet beschikbaar", verder niets.
- Kop met logo (300×300 verkleind weergegeven), naam en adres van de tenant.
  Geen OberPoes-menu; onderaan een regel "mogelijk gemaakt door OberPoes".
- Stap 1: datumkeuze — de komende 14 dagen, alleen dagen waarop de tenant
  open is.
- Stap 2: tijdslot — alle sloten van die dag op basis van openingstijden en
  slotduur; geboekte sloten uitgegrijsd en niet kiesbaar.
- Stap 3: gegevensformulier — naam, e-mail, postcode, huisnummer, extra
  (optioneel), telefoon. Live formaatvalidatie; straat/plaats alleen-lezen
  via PDOK (zelfde gedrag en foutmeldingen als inschrijfformulier).
- Bevestigen → dubbelboek-check → bevestigingsscherm met datum, tijd en
  tenantgegevens. Eén afspraak per boekingsflow.

## Tenantbeheer (beheer.html)

- Leest `?code=` uit de URL; zelfde niet-beschikbaar-melding bij onbekende of
  niet-actieve code.
- Wachtwoordscherm (alleen wachtwoordveld). Sessievlag in `sessionStorage`
  per tenantcode (`oberpoes_tenant_<CODE>`), zodat sessies van verschillende
  tenants elkaar niet raken.
- Drie tabbladen:
  - **Agenda** — alle afspraken van deze tenant, gesorteerd op datum + tijd,
    met klantgegevens (naam, adres, contact, extra) en knop **Annuleren**
    (verwijdert de afspraak; slot komt weer vrij).
  - **Openingstijden** — per weekdag: open/dicht-checkbox + van/tot-tijden;
    slotduur-keuze (15/30/60 min). Opslaan werkt direct door in de openbare
    pagina.
  - **Profiel** — eigen tenantgegevens alleen-lezen + de openbare
    boekingslink met kopieerknop.

## Hoofdadmin-koppeling (js/admin.js)

- **Goedkeuren** gebruikt voortaan `activeerTenant()` (wachtwoord + default
  openingstijden + slotduur).
- Tenant-detailscherm toont voor actieve tenants: boekingslink, beheerlink
  en beheerwachtwoord (alleen-lezen).
- Demo-data: actieve demo-tenant krijgt wachtwoord, openingstijden en enkele
  voorbeeldafspraken.

## Foutafhandeling

- Onbekende/niet-actieve code → melding, geen data.
- Slot inmiddels bezet bij bevestigen → foutmelding, terug naar slotkeuze.
- PDOK onbereikbaar → zelfde melding als bij inschrijving.
- Corrupte database → lege `{ tenants: [], afspraken: [] }`; bestaande
  databases zonder `afspraken`-veld worden bij lezen aangevuld.

## Testaanpak

Unit-tests (Node + browser, bestaand harnas):
- Slotberekening: juiste sloten uit openingstijden + slotduur; geboekte
  sloten gemarkeerd; dichte dag → geen sloten.
- `maakAfspraak`: opslaan, dubbelboeking geeft `null`.
- `afsprakenVoor`: alleen afspraken van de eigen tenant.
- `annuleerAfspraak`: slot komt vrij.
- `activeerTenant`: status Actief + wachtwoord + defaults gezet.
- Migratie: oude database zonder `afspraken` blijft werken.

End-to-end in de browser: boekingsflow (datum → slot → formulier → PDOK →
bevestiging), geboekt slot niet meer kiesbaar, beheer-login met gegenereerd
wachtwoord, afspraak zichtbaar en annuleerbaar, openingstijden wijzigen en
effect zien, scheiding tussen twee tenants controleren.
