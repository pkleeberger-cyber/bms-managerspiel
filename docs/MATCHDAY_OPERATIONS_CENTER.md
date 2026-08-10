# Matchday Operations Center

Der Matchday Operations Center ist der woechentliche Leitstand fuer
Datenpflege und Spielleitung. Er arbeitet gegen Living DB Daten und fuehrt
einen ausgewaehlten Spieltag durch den operativen Prozess.

## Matchday Selection

`/admin/matchday` zeigt alle Spieltage 1-34. Jeder Spieltag hat:

- Status
- Fixture-/Result-Hinweis
- Selected-Markierung
- Operative-Markierung

Der operative Spieltag ist der erste noch nicht offiziell geschlossene
Spieltag. Wird ST1 offiziell abgeschlossen, wird ST2 operativ.

Alle Admin-Unterseiten erhalten den Spieltag ueber `?matchday=N`:

- `/admin/matchday/data-entry?matchday=N`
- `/admin/matchday/calculate?matchday=N`
- `/admin/matchday/review?matchday=N`
- `/admin/matchday/release?matchday=N`

Der temporaere Rollenparameter `role=GAME_DIRECTOR` oder
`role=DATA_MAINTAINER` wird im Leitstand mitgeführt. Er ersetzt keine spätere
Authentifizierung, macht aber die Berechtigungen im Workflow testbar.

## Workflow

Der Leitstand zeigt sechs Schritte:

1. Datenerfassung
2. Berechnung
3. Vorlaeufiger Stand
4. Maluspruefung
5. Korrekturen
6. Offizieller Abschluss

Jeder Schritt zeigt:

- Titel
- verantwortliche Rolle
- eindeutigen Status: Abgeschlossen, Offen, Wartet oder Blockiert
- Beschreibung
- nächste erlaubte Aktion
- Grund, warum eine Aktion deaktiviert ist
- Abschlusszeitpunkt, falls vorhanden

Ein abgeschlossener Schritt zeigt keine "noch offen"-Pflichtzeile. Eine offene
Spielleitungsaktion ist für `DATA_MAINTAINER` sichtbar, aber deaktiviert mit
dem Hinweis `Nur Spielleitung`.

## Rollen

`DATA_MAINTAINER` darf:

- Datenerfassung öffnen und speichern
- Daten bestätigen
- Berechnung starten
- vorläufig veröffentlichen

`GAME_DIRECTOR` darf zusätzlich:

- Malusprüfung bestätigen
- Korrekturen abgeschlossen bestätigen
- offiziell abschließen

Der Spielleiter darf auch alle Datenpflege-Aktionen.

## Preliminary vs Official

`PRELIMINARY_PUBLISHED` bedeutet: Der berechnete Stand ist reviewfaehig und
kann sichtbar sein, aber er ist noch nicht final.

`OFFICIALLY_CLOSED` bedeutet: Der Spieltag ist operativ abgeschlossen. Danach
wird der naechste nicht geschlossene Spieltag im Selector als operativ
markiert.

## Manual Confirmations

Die Aktionen:

- Maluspruefung bestaetigen
- Korrekturen abgeschlossen bestaetigen
- Spieltag offiziell abschliessen

schreiben nur Lifecycle-Status und MatchdayVersion-Audit. Sie veraendern keine
Engine-Scores und fuehren keine Neuberechnung aus.

## Data Entry

Die Datenerfassung nutzt aktive Liga-1-SquadAssignments fuer den gewaehlten
Spieltag. Spieler mit `LEFT_BUNDESLIGA` werden ausgeblendet.

Sortierung:

1. Bundesliga-Verein
2. Position `TW`, `AB`, `MF`, `ST`
3. Spielername

Der Clubfilter ist ein GET-Filter und loest keine Speicherung aus. Nach einer
Speicherung wird `PlayerMatchData gespeichert.` angezeigt.

## Calculation Pipeline

Die Berechnungsseite zeigt keine Rohdaten. Sie prueft die Living-Datenquellen
als Karten:

- Fixtures vorhanden
- ManagerSeason vorhanden
- SquadAssignments vorhanden
- PlayerMatchData vorhanden
- Berechnung moeglich / blockiert
- Veroeffentlichung und Reviewstatus

Die Berechnung bleibt blockiert, bis alle relevanten PlayerMatchData fuer den
gewaehlten Spieltag vorhanden sind.
