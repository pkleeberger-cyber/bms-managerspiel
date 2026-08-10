# BMS Managerspiel - Architektur- und Anforderungsdokument

Stand: 10.08.2026  
Quelle: rekonstruierter Projektstand aus dem ChatGPT-Verlauf "Fußball-Manager-Web-App Entwicklung"  
Zweck: fachliche Übergabe, Weiterentwicklung und Absicherung der Spielarchitektur

---

## 1. Leitbild

Das BMS ist ein webbasiertes Fußball-Managerspiel, das eine langjährig gewachsene Excel-/Liga-Logik in eine dauerhafte, historisierte Web-Anwendung überführt.

Das System soll zwei verschiedene Nutzungskontexte sauber trennen:

- **BMS Game**: emotional, erzählerisch, managerorientiert. Ergebnisse, Matchanalyse, Kader, Historie und Statistiken sollen wie ein Fußballprodukt wirken.
- **BMS Office**: kompakt, effizient, tabellarisch, arbeitsorientiert. Spielleitung und Datenpflege sollen Spieltage, Spieler, Manager, Saisons, Transfers und Korrekturen schnell bearbeiten können.

Grundregel:

```text
Engine = fachliche Wahrheit
Design System = visuelle Wahrheit
Spielleiter = letzte fachliche Entscheidung in Sonderfällen
```

---

## 2. Vollständige funktionale Anforderungen

### 2.1 Kernspiel

- Eine komplette Saison soll vollständig im BMS spielbar sein.
- Das BMS ersetzt perspektivisch die Excel-Auswertung.
- Die Berechnungs-Engine ist fachlich validiert und darf nicht leichtfertig verändert werden.
- Spieltage werden aus realen `PlayerMatchData`, Managerkadern und Fixtures berechnet.
- Ergebnisse werden nicht aus Excel importiert, sondern durch die BMS-Engine erzeugt.
- Tabellen werden akkumuliert geführt, nicht nur spieltagsspezifisch.
- Historische Ergebnisse und Punkte bleiben dauerhaft erhalten.
- Manager sollen nach einem Spiel verstehen können, warum sie gewonnen oder verloren haben.
- Spielerstatistiken sollen aus echten Spieltagsdaten entstehen.
- Saisonhistorie, Managerhistorie, Spielerhistorie und Rekorde sind Zielbereiche für 1.0 bzw. danach.

### 2.2 Managerbereich

- Manager sehen ihr Team, ihren Kader, ihr Budget, ihre Transfers, Spiele, Ergebnisse, Analyse und Profil.
- `/team/kader` soll echte SquadAssignments und Spielerstatistiken anzeigen.
- Keine Dummy-Daten, wenn echte Daten vorhanden sind.
- Kader soll nach Positionen gruppiert werden:
  - Torwart
  - Abwehr
  - Mittelfeld
  - Sturm
- Fehlende Statistiken werden als Platzhalter angezeigt, nicht erfunden.
- Managerprofil soll wiederverwendbar sein:
  - eigener Bereich `/team/profile`
  - Admin-Managerdetail
  - spätere Historie
- Manageridentität umfasst:
  - Name
  - Liga
  - Status
  - aktuelle Saison
  - Budget
  - Kaderwert
  - spätere Titel, Bilanz, Historie, Achievements

### 2.3 Admin Office

- Adminbereich muss objektorientiert und arbeitsorientiert sein.
- Saison, Manager, Spieler, Spieltage, Transfers und Benutzer sollen klar getrennte Arbeitsbereiche sein.
- Office-Seiten dürfen tabellarisch und dicht sein.
- Riesige Dashboard-Flächen und lange Card-Listen sollen vermieden werden.
- Jede Office-Seite beantwortet eine aktuelle Aufgabe.
- Tabs statt lange Seiten:
  - Saison: Übersicht, Wettbewerbe, Transferphase, Importe, Historie
  - Matchday Office: Leitstand, Datenerfassung, Berechnung, Review, Veröffentlichung, Historie
  - Player Master: Übersicht, Änderungen, Auswirkungen, Historie
  - Manager Detail: Übersicht, Saison, Kader, Historie, Admin
- Admin soll Manager bearbeiten können:
  - Stammdaten
  - Status
  - Liga-/Saisoneinordnung
  - Budget
  - aktueller Kader
  - Kaderhistorie nach Spieltag
  - spätere sichere Kaderkorrekturen
- Player Master ist der zentrale Ort für Spieleränderungen:
  - Status ändern
  - Verein ändern
  - Marktwert ändern
  - betroffene Manager sehen
  - Auswirkungen prüfen
  - Änderungen freigeben

### 2.4 Spieltagsbetrieb

- Spieltage werden über einen rollenbasierten Workflow verarbeitet.
- Datenpfleger dürfen:
  - Daten erfassen
  - Berechnung starten
  - vorläufig veröffentlichen
- Spielleiter dürfen zusätzlich:
  - Malusprüfung bestätigen
  - Korrekturen bestätigen
  - Spieltag offiziell abschließen
- Spielleiter dürfen alle Datenpfleger-Aktionen ebenfalls ausführen.
- Ergebnisse dürfen erst nach "vorläufig veröffentlichen" für Manager und Wettbewerbsseiten sichtbar sein.
- "Berechnen" erzeugt nur interne Admin-/Review-Ergebnisse.
- "Offiziell abschließen" macht den Spieltag endgültig; spätere Änderungen laufen über Korrektur/Wiederöffnung.
- Offene Hinweise dürfen sichtbar bleiben, dürfen aber nicht automatisch den kompletten Workflow blockieren.

### 2.5 Matchanalyse

- Matchanalyse ist eine zentrale Manager-facing Seite.
- Ziel: innerhalb von 10-15 Sekunden verstehen:
  - Wer hat gewonnen?
  - Warum?
  - Welche Spieler waren entscheidend?
  - Welcher Mannschaftsteil hat entschieden?
- Keine Debug-Optik, keine rohen Engine-Begriffe.
- Wettbewerb muss als Name angezeigt werden, nicht als DB-ID.
- Vollständige Auswertung soll mit der Matchanalyse zusammengeführt werden, um Doppelungen zu vermeiden.
- Technische Details nur optional/eingeklappt.
- Ungültige Teams müssen korrekt dargestellt werden:
  - gültiges Team wird weiterhin vollständig angezeigt
  - ungültiges Team wird ausgegraut oder kompakt markiert
  - Invalid-Team-Override wird sichtbar erklärt

### 2.6 Wettbewerbe und Tabelle

- Wettbewerbe zeigen standardmäßig den neuesten veröffentlichten Spieltag.
- Keine harte Anzeige von Spieltag 18.
- Normale Historienauswahl startet bei Spieltag 1, nicht Spieltag 0.
- Spieltag 0 darf intern existieren, ist aber keine relevante normale Historienansicht.
- Tabelle ist immer akkumuliert:

```text
Tabelle nach ST1 = Ergebnisse ST1
Tabelle nach ST2 = ST1 + ST2
Tabelle nach STX = alle veröffentlichten Ergebnisse ST1..STX
```

- Bei Korrektur eines Spieltags müssen alle folgenden veröffentlichten Tabellensnapshots neu aufgebaut werden.

---

## 3. Spielregeln

### 3.1 Kader- und Spielergrundlagen

- Jeder Manager besitzt einen Saisonkader über `SquadAssignment`.
- Kaderhistorie wird über Gültigkeiten modelliert:
  - `validFromMatchday`
  - `validToMatchday`
- Historische Kader dürfen nicht überschrieben werden, wenn ein Transfer ab einem späteren Spieltag wirkt.
- Bereits geschlossene Spieltage bleiben historisch gültig.
- Spielerstatus darf nicht zeitlos rückwirkend auf alte Spieltage angewandt werden.
- Bei Abgang während der Saison gilt:
  - alte Punkte bleiben erhalten
  - ab Wirksamkeit muss ersetzt werden
  - Kaderhistorie wird gesplittet, nicht überschrieben

### 3.2 Transferregeln

#### Normale Transferfenster

- Normale Transfers sind nur erlaubt, wenn die Spielleitung eine Transferperiode öffnet.
- Transferperioden:
  - Sommer
  - Winter
- Außerhalb einer offenen normalen Transferperiode:
  - normaler verbindlicher Transfer ist serverseitig blockiert
  - Planung kann optional erlaubt sein
  - UI zeigt klar: "Der Transfermarkt ist aktuell geschlossen."
- Normale Transferzähler gelten nur in normalen Transferperioden.
- Nach erfolgreicher normaler Transferabgabe wird ein `TransferSubmission` persistiert.

#### Pflichttransfer wegen Abgang

- Wenn ein Spieler die Bundesliga verlässt, markiert der Admin ihn im Player Master als Abgang.
- Änderungen bleiben zunächst Entwurf.
- Erst "Änderung freigeben" erzeugt Wirkung.
- Wirksamkeit wird dynamisch bestimmt:

```text
effectiveFromMatchday = letzter offiziell abgeschlossener Spieltag + 1
Wenn noch kein Spieltag abgeschlossen ist: effectiveFromMatchday = 1
```

- Nicht hart auf Spieltag 3 kodieren.
- Betroffene Manager werden über SquadAssignments ermittelt, die am `effectiveFromMatchday` gültig sind.
- Für jeden betroffenen Manager/Slot wird ein `ManagerMandatoryTransfer` erzeugt.
- Pflichttransfer:
  - zählt nicht gegen normale freie Transfers
  - ist auch außerhalb normaler Transferfenster erlaubt
  - ersetzt genau den betroffenen Spieler/Slot
  - muss positionsgleich erfolgen
  - erzeugt eine gesplittete Kaderhistorie:

```text
alter Spieler: validToMatchday = effectiveFromMatchday - 1
neuer Spieler: validFromMatchday = effectiveFromMatchday
```

- Nach erfolgreicher Abgabe:
  - Pflichttransfer wird `COMPLETED`
  - Transferplan wird geleert
  - keine alten Validierungsfehler dürfen sichtbar bleiben

#### Vereinswechsel und Regelwarnungen

- Vereinswechsel im Player Master können Regelverstöße erzeugen.
- Betroffene Kader müssen geprüft werden, z. B. auf Club-Limit.
- Mögliche Verstöße werden als Warnung/Aufgabe erzeugt, nicht automatisch als harte Änderung.

#### Transferzustände in der UI

Es gibt vier klare Transferzustände:

```text
TRANSFER MARKET CLOSED
MANDATORY TRANSFER
SUMMER TRANSFER WINDOW
WINTER TRANSFER WINDOW
```

Die Transferseite ist zustandsbasiert:

- Geschlossen: fast leer, kein Transferworkspace, nur Status und Handlungsbedarf.
- Pflichttransfer: nur Pflichttransfer-Aufgabe, betroffener Spieler, Grund, Ersatzaktion.
- Sommer/Winter offen: normaler Transferarbeitsplatz mit Budget, Transferzähler, Plan.

### 3.3 Spieltagswertung

#### Datenbasis

Die Engine verarbeitet:

- Fixtures
- ManagerSeason
- SquadAssignments gültig für den Spieltag
- PlayerMatchData
- manuelle Anpassungen
- Invalid-Team-Overrides

`PlayerMatchData` enthält mindestens:

- Spieler
- Matchday
- Note
- Tore
- Rot
- Gelb-Rot
- Elf des Tages
- optional Sonderstatus wie keine Bewertung

#### Berechnung und Veröffentlichung

Workflow:

```text
Datenerfassung
↓
Daten bestätigen
↓
Berechnung
↓
Admin Review
↓
Vorläufig veröffentlichen
↓
Malusprüfung / Korrekturen
↓
Offiziell abschließen
```

Regeln:

- Nach Berechnung sind Ergebnisse nur intern sichtbar.
- Vorläufig veröffentlichte Ergebnisse sind für Manager sichtbar, aber korrekturfähig.
- Offiziell abgeschlossene Ergebnisse sind endgültig.
- Korrekturen müssen auditierbar bleiben.

#### Unvollständige Teams

- Unvollständig ist eine Warnung, kein automatischer harter Blocker.
- Spielleiter entscheidet:
  - Team ungültig setzen
  - manuelle Punktstrafe vergeben
  - Eingabefehler korrigieren
  - Hinweis zur Kenntnis nehmen
- Wenn Team nicht ungültig ist:
  - vorhandene gültige Spieler werden normal berechnet
  - fehlende Slots zählen 0
  - manuelle Strafe kann zusätzlich angewandt werden
- Wenn Team ungültig ist:
  - Mannschaft wird nicht normal berechnet
  - erhält Invalid-Team-Override

#### Invalid-Team-Regel

Ein Team kann für einen konkreten Spieltag als ungültig markiert werden.

Regel:

```text
Ungültiger Manager erhält schlechteste Tageswertung aller gültigen Manager,
aber maximal 0.
Wenn ein gültiger Manager schlechter als 0 ist, erhält der ungültige Manager diesen negativen schlechtesten Wert.
```

Beispiele:

```text
Gültige Scores: 12, 8, 3
Ungültig = 0

Gültige Scores: 12, 1, -2
Ungültig = -2
```

Das ungültige Team wird in Analyse, Review, Wettbewerben und Teamseiten sichtbar markiert.

#### Manuelle Strafen / Malus

- Spielleiter kann für Sonderfälle manuelle Punktabzüge oder Anpassungen setzen.
- Manuelle Entscheidungen sind Teil des Review-Prozesses.
- Sie dürfen nicht in jeder Spielerzeile als technischer Berechnungsgrund erscheinen, sondern in der Matchanalyse separat und verständlich.

---

## 4. Datenarchitektur

### 4.1 Kernentitäten

```text
Season
Competition
Manager
ManagerSeason
Player
SquadAssignment
Fixture
PlayerMatchData
MatchResult
MatchdayLifecycle
LeagueTableSnapshot
ManualMatchdayAdjustment / MatchdayManagerOverride
TransferPhase / TransferPeriod
TransferSubmission
PlayerMasterChangeBatch
PlayerMasterChange
PlayerDepartureBatch
PlayerDepartureEvent
ManagerMandatoryTransfer
PlayerMatchDataImportAudit
```

### 4.2 Beziehungen

```text
Season
  ├─ Competition
  ├─ ManagerSeason
  ├─ PlayerMasterChangeBatch
  └─ TransferPeriod

Manager
  └─ ManagerSeason
       ├─ SquadAssignment
       ├─ TransferSubmission
       └─ ManagerMandatoryTransfer

Player
  ├─ SquadAssignment
  ├─ PlayerMatchData
  ├─ PlayerMasterChange
  └─ PlayerDepartureEvent

Competition
  ├─ Fixture
  ├─ MatchResult
  ├─ MatchdayLifecycle
  └─ LeagueTableSnapshot
```

### 4.3 Zeitliche Modellierung

Wichtigste Architekturregel:

```text
Aktueller Player-Status darf historische Spieltage nicht rückwirkend entwerten.
```

Notwendig bzw. angedacht:

- Kaderhistorie über `SquadAssignment.validFromMatchday/validToMatchday`
- Spieleränderungen als Entwurf/Freigabe mit Wirksamkeit
- Tabellenstände als `LeagueTableSnapshot`
- Matchday-Ergebnisse als Version/Lifecycle-Snapshot
- zukünftige Player-List-Versionen für Sommer/Winter-Listen oder temporalen Player-Status

### 4.4 Audit und Sicherheit

- Änderungen im Player Master werden als Batch/Change modelliert.
- Spieltagsimporte haben Auditdaten.
- Audit darf den eigentlichen Import nicht zerstören, wenn es technisch ausfällt.
- Kritische Massenoperationen:
  - immer Preview/Dry-run
  - keine Löschung nicht hochgeladener Daten
  - blockieren bei echten Konflikten
  - Updates klar als Updates, nicht als Konflikte

---

## 5. Saisonaler Lebenszyklus

### 5.1 Saisonvorbereitung

- Saison anlegen/aktivieren.
- Wettbewerbe anlegen.
- Manager Saisons/Ligen zuweisen.
- Spielpläne anlegen.
- Player Master vorbereiten.
- Sommertransferperiode öffnen.
- Managerkader erstellen/abgeben.

### 5.2 Laufende Saison

Pro Spieltag:

```text
Spieltag auswählen
↓
Datenerfassung öffnen
↓
PlayerMatchData eingeben oder importieren
↓
Daten bestätigen
↓
Berechnen
↓
Review
↓
Vorläufig veröffentlichen
↓
Malus/Korrekturen prüfen
↓
Offiziell abschließen
↓
Tabellensnapshot aktualisieren
```

### 5.3 Transferperioden

- Sommer/Winter werden durch Spielleitung geöffnet und geschlossen.
- Normale Transfers sind nur während offener Transferperioden verbindlich möglich.
- Pflichttransfers können außerhalb normaler Transferfenster geöffnet werden.

### 5.4 Saisonabschluss

Geplante Anforderungen:

- Saison archivieren.
- Abschlusstabelle sichern.
- Titel, Auf-/Abstiege, Wettbewerbsresultate speichern.
- Managerhistorie aktualisieren.
- Spielerhistorie aktualisieren.
- neue Saison vorbereiten.

---

## 6. Rollen und Berechtigungen

### 6.1 Rollen

```text
GAME_DIRECTOR / Spielleiter
DATA_MAINTAINER / Datenpfleger
MANAGER
ADMIN / technischer Admin
```

### 6.2 Datenpfleger

Darf:

- Spieltagsdaten erfassen.
- Bewertungen speichern.
- Excel-Bewertungen importieren.
- Berechnung starten.
- vorläufig veröffentlichen.

Darf nicht:

- Malusprüfung final bestätigen.
- Korrekturen final bestätigen.
- Spieltag offiziell abschließen.
- grundlegende Spielregeln ändern.

### 6.3 Spielleiter

Darf:

- alle Datenpfleger-Aktionen.
- Team gültig/ungültig setzen.
- Malus/manuelle Anpassungen setzen.
- Korrekturen bestätigen.
- Spieltag offiziell abschließen.
- Transferperioden öffnen/schließen.
- Player-Master-Änderungen freigeben.

### 6.4 Manager

Darf:

- eigenes Team ansehen.
- Transfers planen und in erlaubten Fenstern verbindlich abgeben.
- Pflichttransfers erledigen, wenn offen.
- eigene Spiele, Analyse, Kader, Profil sehen.

Darf nicht:

- fremde Daten bearbeiten.
- außerhalb erlaubter Transferfenster verbindlich transferieren.
- Spieltagsdaten oder Ergebnisse ändern.

---

## 7. Import- und Export-Workflows

### 7.1 Live Excel Import für PlayerMatchData

Zweck:

- Datenpfleger sollen wahlweise in der UI oder per Excel arbeiten können.
- Excel ist ein alternativer Live-Eingabeweg, kein einmaliger Migrationshack.

Workflow:

```text
Admin wählt Saison/Wettbewerb/Spieltag
↓
Bewertungsvorlage herunterladen
↓
Datenpfleger füllt Excel
↓
Excel hochladen
↓
Preview
↓
Admin bestätigt
↓
PlayerMatchData wird upserted
↓
Tabelle/Datenerfassung wird neu geladen
```

Importiert nur:

- Spieler
- optional Verein/Position
- Note
- Tore
- Gelb-Rot
- Rot
- Elf des Tages
- optional keine Bewertung/Sonderfall

Importiert nicht:

- Managerkader
- Squads
- Fixtures
- Ergebnisse
- Tabellen
- berechnete Punkte

Sicherheitsregeln:

- Match über hidden `playerId`, fallback eindeutiger `displayName`.
- Blank rows ignorieren.
- Nur hochgeladene Zeilen upserten.
- Nicht hochgeladene bestehende Daten bleiben unverändert.
- Gefiltertes Speichern darf keine unsichtbaren Daten löschen.
- Update ist kein Konflikt.

Statusmodell:

```text
NEW
UNCHANGED
UPDATE
UNKNOWN
INVALID
DUPLICATE_CONFLICT
```

Blocker:

- UNKNOWN
- INVALID
- DUPLICATE_CONFLICT

Keine Blocker:

- bestehender DB-Wert unterscheidet sich von Excel-Wert
- das ist UPDATE/Aktualisierung

### 7.2 Backfill ST1-17

Zweck:

- realistischere Daten für UI, Statistiken und Wintertransfer-Simulation.
- Engine muss nicht erneut bewiesen werden.

Aktuelle Entscheidung:

- nur PlayerMatchData importieren
- keine Manager-Squads
- keine Ergebnisse
- keine Tabellen
- keine Engine-Ergebnisse überschreiben

Backfill-Regeln:

- Dry-run default.
- Konflikte erklären, nicht blind überschreiben.
- Spieler gegen Player Master auflösen.
- Duplicate rows:
  - identisch deduplizieren
  - widersprüchlich blockieren oder reporten
- Reports als Markdown und JSON.

### 7.3 Player Master Änderungen

Workflow:

```text
Spieler suchen
↓
Änderung als Entwurf anlegen
↓
Auswirkungen prüfen
↓
Änderung freigeben
↓
Folgeaufgaben erzeugen
```

Änderungstypen:

- Statuswechsel, z. B. Abgang
- Vereinwechsel
- Marktwertkorrektur
- perspektivisch Positionswechsel

Freigabe kann erzeugen:

- Pflichttransfer
- Club-Limit-Warnung
- Positions-/Kaderstruktur-Warnung

---

## 8. Textuelle Workflow- und State-Diagramme

### 8.1 Matchday Lifecycle

```text
[Datenerfassung offen]
        |
        v
[Daten bestätigt]
        |
        v
[Berechnet - nur Admin sichtbar]
        |
        v
[Vorläufig veröffentlicht - Manager sichtbar]
        |
        v
[Malusprüfung offen/erledigt]
        |
        v
[Korrekturen offen/erledigt]
        |
        v
[Offiziell abgeschlossen]
```

### 8.2 Sichtbarkeit der Ergebnisse

```text
Berechnen
  -> Admin Review: sichtbar
  -> Manager/Wettbewerbe: nicht sichtbar

Vorläufig veröffentlichen
  -> Admin Review: sichtbar
  -> Manager/Wettbewerbe: sichtbar
  -> Status: Korrekturen vorbehalten

Offiziell abschließen
  -> endgültig
  -> Historie/Tabelle fixiert, außer explizite Korrektur
```

### 8.3 Unvollständiges Team

```text
Preflight erkennt fehlenden Slot
        |
        v
Review-Hinweis erzeugen
        |
        v
Spielleiter entscheidet
        |
        +--> Team ungültig
        |       -> Invalid-Team-Override
        |
        +--> Manuelle Strafe
        |       -> gültige Spieler normal, fehlender Slot 0, Malus extra
        |
        +--> Eingabe/Kader korrigieren
        |       -> neu berechnen
        |
        +--> Hinweis akzeptieren
                -> Berechnung mit verfügbaren Spielern
```

### 8.4 Player Abgang und Pflichttransfer

```text
Admin markiert Spieler als Abgang (Draft)
        |
        v
Preview betroffene Manager/Slots
        |
        v
Freigabe
        |
        v
effectiveFromMatchday bestimmen
        |
        v
ManagerMandatoryTransfer erzeugen
        |
        v
Manager sieht Pflichttransfer
        |
        v
Manager ersetzt Spieler positionsgleich
        |
        v
SquadAssignment splitten
        |
        v
Pflichttransfer abgeschlossen
```

### 8.5 Transferseiten-Zustände

```text
Transfermarkt geschlossen
  -> kein normaler Transfer möglich
  -> ggf. Planung
  -> kein Handlungsbedarf, wenn keine Pflichttransfers

Pflichttransfer offen
  -> nur betroffener Pflichttransfer
  -> kein normaler Transferzähler
  -> zählt nicht gegen freie Transfers

Sommertransfer offen
  -> normaler Transferarbeitsplatz
  -> Sommer-Zähler und Budget

Wintertransfer offen
  -> normaler Transferarbeitsplatz
  -> Winter-Zähler und Budget
```

### 8.6 Tabellenhistorie

```text
ST1 vorläufig/official published
  -> LeagueTableSnapshot ST1 = Ergebnisse ST1

ST2 published
  -> LeagueTableSnapshot ST2 = ST1 + ST2

Korrektur ST1
  -> ST1 Snapshot neu
  -> ST2..STX Snapshots neu
```

### 8.7 Excel PlayerMatchData Import

```text
Template exportieren
        |
        v
Excel ausfüllen
        |
        v
Upload
        |
        v
Preview klassifizieren
        |
        +--> UNKNOWN / INVALID / DUPLICATE_CONFLICT -> blockiert
        |
        +--> NEW / UPDATE / UNCHANGED -> bestätigbar
        |
        v
Bestätigen
        |
        v
Row-level Upsert nur hochgeladener Zeilen
        |
        v
Reload Datenerfassung
```

---

## 9. Offene Entscheidungen und Klärungspunkte

### 9.1 Noch nicht abschließend spezifiziert

- Exakte Punkteformel der Engine im Dokument nicht erneut ausgeschrieben. Sie liegt in der Golden Reference/Engine und gilt als Autorität.
- Exakte Transferanzahlen für Sommer/Winter wurden im Verlauf nicht final dokumentiert.
- Exakte Club-Limit-Zahl wurde nur beispielhaft als "mehr als 3 Spieler eines Vereins" genannt und sollte gegen die Golden Reference geprüft werden.
- Exakte Positionsstruktur und Slot-Verteilung sollte gegen bestehende Engine/Squad-Regeln validiert werden.
- Ob normale Transfers außerhalb offener Transferperioden geplant, aber nicht abgegeben werden dürfen, ist als sinnvoll markiert, aber UI-Detail bleibt offen.
- Ob der Datenpfleger wirklich "vorläufig veröffentlichen" darf, wurde fachlich gewünscht; endgültige Rechte müssen beim Auth-Konzept bestätigt werden.
- Benachrichtigungssystem für Pflichttransfers ist gewünscht, aber technisch noch offen: eigener Notification-Record, Banner, E-Mail, In-App, oder Kombination.
- Temporaler Player-Status bzw. PlayerListVersion für Sommer/Winter ist als Architekturproblem erkannt, aber noch nicht final umgesetzt/spezifiziert.
- Saisonabschluss/Archivierung ist konzeptionell beschrieben, aber noch kein vollständiger Implementierungsplan.
- Benutzer/Login/Rollenzuordnung ist als offener Bereich markiert.

### 9.2 Architektur-Risiken

- Aktueller Player-Status darf keine alten Spieltage entwerten.
- Import darf nie nicht sichtbare/nicht hochgeladene Daten löschen.
- Audit darf keine erfolgreichen fachlichen Writes zerstören.
- Berechnet vs. veröffentlicht muss strikt getrennt bleiben.
- Warnungen dürfen Spielleiter-Entscheidungen nicht ersetzen.
- UI darf keine internen IDs, Enum-Namen oder Debug-Ausgaben als normale Nutzerinformation anzeigen.

### 9.3 Produktregeln für weitere Umsetzung

- Keine neuen Screens ohne produktionsreife Formatierung.
- Keine Admin-Dashboards, wenn ein Arbeitsplatz besser ist.
- Keine Doppelseiten mit derselben Information.
- Jede Seite beantwortet eine Hauptfrage.
- Das BMS erzeugt Warnungen; der Spielleiter entscheidet Sonderfälle.
- Historie wird über Gültigkeit/Snapshots modelliert, nicht über nachträgliches Überschreiben.

---

## 10. Empfohlene nächste Architekturartefakte

1. **Golden Reference Kurzfassung**
   - Punkteformeln, Positionsregeln, Invalid-Team-Regel, Tabellenregeln.

2. **Temporal Player State / PlayerListVersion Konzept**
   - Sommerliste/Winterliste
   - Spielerstatus pro Phase
   - Marktwert pro Phase
   - historische Auswertbarkeit

3. **BMS Writing Guide**
   - Nutzertexte, Statuslabels, Rollenbegriffe, Fehlermeldungen.

4. **Auth & Rollenmodell**
   - Manager-Zuordnung
   - Datenpfleger
   - Spielleiter
   - Admin

5. **Saisonabschluss-Konzept**
   - Archiv
   - Titel
   - Auf-/Abstieg
   - neue Saison
   - Sommertransferstart

