# KassaGenda — berichten als lijst + detailbewerking (ontwerp)

Datum: 2026-07-14
Status: goedgekeurd door gebruiker

## Doel

Het Berichten-tabblad in het tenantbeheer volgt hetzelfde patroon als de
Tenants-weergave in het hoofdadmin: bovenaan een lijst, klik op een rij om
eronder één bericht te bewerken.

## Gedrag

- **Lijst** (tabel, klikbare rijen zoals de tenantlijst): per berichttype
  (Boekingsbevestiging, Verzetbevestiging, Factuurmail,
  Betalingsbevestiging) een rij met: naam, badge **Aangepast** (groen,
  `badge-actief`) of **Standaard** (grijs, `badge-inactief`), en de eerste
  regel van de actuele tekst als voorbeeld.
- **Detail** (kaart onder de lijst, zoals `#tenant-detail`): kop met het
  berichttype, legenda van beschikbare invulvelden, textarea met de actuele
  tekst, knoppen **Opslaan** (bewaart alleen dit type; badge wordt
  Aangepast), **Herstel standaardtekst** (verwijdert alleen de eigen tekst
  van dit type; badge wordt Standaard) en **Sluiten**.
- Opslaan/herstellen ververst de lijst en houdt het detail open met de
  actuele tekst. De oude alles-in-één-weergave vervalt.

## Implementatie

`js/beheer.js`: `renderBerichten()` herschreven naar lijst + container
`#bericht-detail`; nieuwe functie `renderBerichtDetail(type)`. Opslag via
bestaand `OberPoesDb.zetBerichten(code, berichten)` met een gemuteerde kopie
van `tenant.berichten` (sleutel zetten of verwijderen). Geen wijzigingen in
modules of database-API.

## Verificatie

Bestaande tests blijven groen (geen logicawijziging). Browser: lijst toont
4 rijen met juiste badges; rij aanklikken → detail; tekst wijzigen →
Opslaan → badge Aangepast en mail gebruikt de tekst; Herstel → badge
Standaard; Sluiten sluit het detail. Daarna push.
