# OberPoes — niet-boekbare perioden en verbeterde factuuropbouw (ontwerp)

Datum: 2026-07-13
Status: goedgekeurd door gebruiker
Bouwt voort op: `2026-07-13-tenantportalen-design.md`, `2026-07-13-facturatie-design.md`

## Deel 1: niet-boekbare perioden (blokkades)

### Doel

De tenant kan perioden benoemen waarop de agenda niet geboekt kan worden:
**eenmalig** (specifieke datum + tijdvak) of **wekelijks terugkerend**
(weekdag + tijdvak). De lijst is makkelijk te beheren; verlopen eenmalige
blokkades worden niet getoond.

### Datamodel

Tenant, nieuw veld `blokkades` (default `[]`, ook via `activeerTenant`):

| Veld | Type | Toelichting |
|---|---|---|
| `id` | string | Bestaande generator |
| `type` | string | `eenmalig` \| `wekelijks` |
| `datum` | string | `YYYY-MM-DD`, alleen bij eenmalig |
| `dag` | string | `ma`…`zo` (Agenda.DAG_SLEUTELS), alleen bij wekelijks |
| `van` / `tot` | string | `HH:MM`, van < tot |
| `omschrijving` | string | Optioneel (bijv. "lunchpauze") |

Nieuwe db-functie: `zetBlokkades(code, blokkades) → Tenant|null`.

### Slotberekening (js/agenda.js)

- `Agenda.sloten(openingstijden, slotDuur, datumIso, afspraken, blokkades = [])`
  — bestaande aanroepen blijven werken. Een slot is niet vrij als het
  **overlapt** met een toepasselijke blokkade:
  - toepasselijk: eenmalig én `datum === datumIso`, óf wekelijks én
    `dag === weekdag(datumIso)`;
  - overlap: `slotStart < blokTot && slotStart + slotDuur > blokVan`
    (minuten). Blokkade 12:00–13:00 bij 30-min sloten: 11:30 blijft vrij,
    12:00 en 12:30 geblokkeerd, 13:00 vrij.
- `Agenda.actieveBlokkades(blokkades, vanafIso) → blokkades[]` — filtert
  eenmalige blokkades met `datum < vanafIso` weg; wekelijkse blijven altijd.
  (Voor de beheerlijst; verlopen records blijven onschadelijk in de opslag.)

### UI

- **Beheer → Openingstijden**: onder de weektabel een sectie
  "Niet-boekbare perioden":
  - lijst via `actieveBlokkades` (omschrijving of "—", weergave
    "wekelijks maandag 12:00–13:00" / "21-7-2026 09:00–12:00",
    verwijderknop per regel);
  - formulier: type-select (Eenmalig/Wekelijks), datumveld (eenmalig) óf
    weekdag-select (wekelijks), van/tot (time-inputs), omschrijving
    (optioneel tekstveld). Validatie: van < tot; datum verplicht bij
    eenmalig. Toevoegen → direct in de lijst.
- **tenant.html** (`js/tenant.js`): geeft `tenant.blokkades || []` door aan
  `Agenda.sloten`; geblokkeerde sloten zijn uitgegrijsd, identiek aan
  geboekte sloten.

## Deel 2: factuuropbouw (herontwerp opbouwscherm)

### Doel

Bij het samenstellen van een factuur kiest de tenant per regel: een
voorgedefinieerde regel uit een lijstje óf een nieuwe. Beide zijn aanpasbaar
tot ze zijn toegevoegd; toegevoegde regels zijn verwijderbaar tot de factuur
is aangemaakt.

### Gedrag

Het checkbox-model verdwijnt. Het opbouwscherm bestaat uit:

1. **Keuzelijst**: "— nieuwe regel —" (default) plus alle voorgedefinieerde
   regels. Keuze van een voorgedefinieerde regel vult de bewerkvelden
   (naam, btw, bedrag); "— nieuwe regel —" maakt ze leeg.
2. **Bewerkvelden**: vrij aanpasbaar vóór toevoegen. Aanpassingen gelden
   alléén voor deze factuur; het voorgedefinieerde lijstje blijft
   ongewijzigd. Vinkje "ook bewaren als voorgedefinieerde regel" blijft
   (slaat de actuele veldwaarden als nieuwe voorgedefinieerde regel op).
   Knop **Toevoegen aan factuur**; validatie naam ≥ 2 tekens, bedrag > 0.
3. **Conceptlijst**: elke toegevoegde regel als rij (naam, btw, bedrag) met
   **Verwijderen**-knop, werkend tot "Factureren en mailen" is geklikt.
4. **Totaal** (incl./excl./btw hoog/laag) live bijgewerkt; factureren
   vereist minimaal één regel; verder ongewijzigd (mail-simulatie etc.).

## Testaanpak

Unit (bestaand harnas):
- sloten + eenmalige blokkade: alleen op de eigen datum geblokkeerd;
- sloten + wekelijkse blokkade: op elke matchende weekdag;
- overlap-randen: bij blokkade 12:00–13:00 en 30-min sloten zijn 11:30 en
  13:00 vrij, 12:00 en 12:30 niet;
- blokkade heeft geen effect op andere dagen/dichte dagen;
- `actieveBlokkades`: verlopen eenmalige weg, toekomstige eenmalige en
  wekelijkse blijven;
- `zetBlokkades` + `activeerTenant`-default.

End-to-end: wekelijkse lunchblokkade → sloten verdwijnen op boekingspagina;
eenmalige blokkade → alleen die datum; verlopen eenmalige niet in
beheerlijst; factuuropbouw: voorgedefinieerde regel kiezen → aanpassen →
toevoegen → nieuwe regel toevoegen → één verwijderen → factureren →
voorgedefinieerd lijstje ongewijzigd.
