# Matchday Lifecycle

Ein BMS-Spieltag ist kein einmalig berechnetes Objekt. Er hat einen operativen Lebenszyklus, kann vorläufig veröffentlicht, korrigiert, neu berechnet, erneut veröffentlicht und später offiziell geschlossen werden.

Das Lifecycle-Modell liegt in `app/domain/matchday-lifecycle/` und beschreibt Zustände, Versionen und Korrektur-Propagation. Es führt keine Berechnung aus und schreibt keine Datenbankdaten.

## Statusmodell

| Status | Bedeutung |
| --- | --- |
| `DRAFT` | Spieltag existiert, Datenerfassung ist noch nicht vollständig. |
| `DATA_ENTRY_OPEN` | Zentrale Realspielerdaten können gepflegt werden. |
| `DATA_ENTERED` | PlayerMatchData wurde administrativ als vollständig bestätigt. |
| `DATA_ENTRY_COMPLETE` | Datenerfassung wurde operativ abgeschlossen. |
| `CALCULATED` | Die Engine hat einen Spieltag intern berechnet. Admin Review darf den Draft sehen; Manager- und Wettbewerbsseiten dürfen ihn noch nicht anzeigen. |
| `PRELIMINARY_PUBLISHED` | Der berechnete Stand ist vorläufig sichtbar und reviewfähig. |
| `PUBLISHED_PRELIMINARY` | Ergebnisse sind für Manager sichtbar, Korrekturen bleiben vorbehalten. |
| `MANUAL_REVIEW_CONFIRMED` | Die Malusprüfung wurde bestätigt. |
| `CORRECTIONS_CONFIRMED` | Alle administrativen Korrekturen sind abgeschlossen. |
| `OFFICIALLY_CLOSED` | Der Spieltag ist offiziell abgeschlossen; der nächste Spieltag wird operativ. |
| `REOPENED` | Ein bereits veröffentlichter Spieltag wurde für Korrekturen geöffnet. |
| `PUBLISHED_OFFICIAL` | Der Spieltag ist offiziell geschlossen. |
| `ARCHIVED` | Der Spieltag ist historisch; reguläre Korrekturen sind nicht mehr erwartet. |

## Gültige Übergänge

| Von | Nach | Grund | Neue Version |
| --- | --- | --- | --- |
| `DRAFT` | `DATA_ENTRY_OPEN` | Datenerfassung öffnen | Nein |
| `DATA_ENTRY_OPEN` | `DATA_ENTERED` | Datenerfassung abschließen | Nein |
| `DATA_ENTERED` | `CALCULATED` | Berechnung abgeschlossen | Ja |
| `DATA_ENTRY_COMPLETE` | `CALCULATED` | Berechnung abgeschlossen | Ja |
| `CALCULATED` | `PRELIMINARY_PUBLISHED` | Vorläufig veröffentlichen | Ja |
| `PRELIMINARY_PUBLISHED` | `MANUAL_REVIEW_CONFIRMED` | Malusprüfung bestätigen | Nein |
| `MANUAL_REVIEW_CONFIRMED` | `CORRECTIONS_CONFIRMED` | Korrekturen abschließen | Nein |
| `CORRECTIONS_CONFIRMED` | `OFFICIALLY_CLOSED` | Offiziell schließen | Ja |
| `PUBLISHED_PRELIMINARY` | `REOPENED` | Korrektur öffnen | Nein |
| `REOPENED` | `DATA_ENTRY_OPEN` | Datenerfassung erneut öffnen | Nein |
| `REOPENED` | `DATA_ENTRY_COMPLETE` | Korrigierte Datenerfassung abschließen | Nein |
| `REOPENED` | `CALCULATED` | Neu berechnen | Ja |
| `CALCULATED` | `PUBLISHED_OFFICIAL` | Offiziell veröffentlichen | Ja |
| `PUBLISHED_PRELIMINARY` | `PUBLISHED_OFFICIAL` | Offiziell schließen | Ja |
| `PUBLISHED_OFFICIAL` | `REOPENED` | Ausnahme-Korrektur durch Admin | Nein |
| `PUBLISHED_OFFICIAL` | `ARCHIVED` | Saison archivieren | Nein |

Ungültige Übergänge werden über `assertMatchdayStatusTransition()` als `MatchdayLifecycleError` abgelehnt.

## Rollen und Verantwortlichkeiten

Der operative Leitstand unterscheidet zwei Rollen:

| Rolle | Darf |
| --- | --- |
| `DATA_MAINTAINER` | Datenerfassung öffnen, PlayerMatchData speichern, Daten bestätigen, Berechnung starten, vorläufig veröffentlichen |
| `GAME_DIRECTOR` | Alle Datenpflege-Aktionen plus Malusprüfung bestätigen, Korrekturen abschließen und Spieltag offiziell schließen |

Solange kein Auth-Kontext existiert, zeigt `/admin/matchday` einen temporären
Rollenschalter. Standard ist `GAME_DIRECTOR`, damit der gesamte Wochenprozess
getestet werden kann.

Jeder Workflow-Schritt hat genau einen sichtbaren Status:

- `DONE`: Abgeschlossen
- `OPEN`: Offen
- `WAITING`: Wartet auf vorherige Schritte
- `BLOCKED`: Living-Daten sind unvollständig

Abgeschlossene Schritte zeigen keinen Hinweis auf offene Pflichtarbeit. Offene
Schritte zeigen die zuständige Rolle und die nächste erlaubte Aktion.

## Vorläufig vs offiziell

`CALCULATED` ist kein Veröffentlichungszustand. Die Berechnung schreibt interne
MatchResults, MatchdayVersion und Review-Daten, aber diese Resultate bleiben
für Managerseiten verborgen. `/competitions/*`, `/team/spiele` und
managerseitige Analyse-Links lesen nur veröffentlichte Ergebnisse.

`PRELIMINARY_PUBLISHED` / `PUBLISHED_PRELIMINARY` ist ein bewusst erlaubter Zustand. Manager dürfen Ergebnisse sehen, bevor der Spieltag endgültig offiziell geschlossen ist.

Korrekturen kurz nach der Veröffentlichung sind normal. Kleine Korrekturen benötigen keine prominente Manager-Ankündigung; die sichtbaren Daten werden konsistent aktualisiert.

Ab der vorläufigen Veröffentlichung sind Ergebnisse sichtbar, aber fachlich mit
Korrekturvorbehalt. Der offizielle Abschluss schaltet keine erstmalige
Sichtbarkeit frei; er bestätigt nur die Finalität eines bereits sichtbaren
Spieltags.

Manager- und Wettbewerbsseiten verwenden als Default den letzten
veröffentlichten Spieltag mit sichtbaren Resultaten. Geplante oder nur intern
berechnete spätere Spieltage dürfen diesen Default nicht verdrängen.

Nach der vorläufigen Veröffentlichung folgen zwei administrative Bestätigungen:

- `MANUAL_REVIEW_CONFIRMED`: Malusprüfung ist abgeschlossen.
- `CORRECTIONS_CONFIRMED`: Alle bekannten Korrekturen sind abgeschlossen.

Diese Bestätigungen ändern nur den Lifecycle. Sie verändern keine Engine-Scores.

## Offizielle Schließung und spätere Korrekturen

`OFFICIALLY_CLOSED` / `PUBLISHED_OFFICIAL` bedeutet, dass der Spieltag offiziell geschlossen ist. Späte Korrekturen nach diesem Zustand sind Ausnahmefälle. Sobald Spieltag N offiziell geschlossen ist, wird der erste noch nicht offiziell geschlossene Spieltag als operativer Spieltag im Leitstand markiert.

Wenn eine späte Kicker- oder Quellenkorrektur erst nach offizieller Schließung bekannt wird, wird sie als Admin-Entscheidung behandelt. Der Spieltag muss dafür in `REOPENED` wechseln.

## MatchdayVersion

Jeder Berechnungs- oder Veröffentlichungszyklus erzeugt eine neue `MatchdayVersion`.

Felder:

- `id`
- `seasonId`
- `competitionId`
- `matchday`
- `versionNumber`
- `status`
- `createdAt`
- `createdBy`
- `reason`
- `calculationSnapshotJson`
- `publishedAt`

Historische Versionen werden nie überschrieben. Die zuletzt veröffentlichte Version ist die sichtbare Version. Berechnete, aber nicht vorläufig veröffentlichte Versionen bleiben interne Drafts.

## Tabellenhistorie

`LeagueTableSnapshot` ist ein kumulierter Verlauf, kein isolierter
Spieltagsscore:

- `matchday = 0`: leere Starttabelle.
- `matchday = 1`: Tabelle nach ST1.
- `matchday = 2`: Tabelle nach ST1 plus ST2.
- `matchday = X`: Tabelle nach allen veröffentlichten Resultaten von ST1 bis STX.

Beim vorläufigen Veröffentlichen eines Spieltags wird der Snapshot für diesen
Spieltag aus den persistierten veröffentlichten `MatchResult`-Zeilen neu
aufgebaut. Wird ein bereits veröffentlichter Spieltag korrigiert, werden dieser
und alle danach bereits veröffentlichten Snapshots erneut aus den persistierten
Resultaten aufgebaut.

## Korrektur-Propagation

Eine Korrektur an Spieltag X betrifft nicht nur Spieltag X. Ab diesem Spieltag müssen alle abhängigen Zustände neu aufgebaut werden.

Das Modell `CorrectionPropagationPlan` beschreibt:

- `correctionStartMatchday`
- `affectedMatchdays`
- `requiresTableRebuild`
- `requiresEventRebuild`
- `requiresHistoryRebuild`

Beispiel: Eine Korrektur an Spieltag 17 in einer 34-Spieltage-Saison erzeugt `affectedMatchdays` von 17 bis 34.

Folgen:

- Spieltag 17 wird neu berechnet.
- Alle späteren Ligatabellen werden neu aufgebaut.
- Events werden neu erzeugt.
- Historische Reports werden aktualisiert.
- Aktuelle Tabellenstände werden konsistent aktualisiert.

## Fixture

`app/domain/matchday-lifecycle/fixture.ts` demonstriert:

- vorläufige Veröffentlichung von Spieltag 17,
- Wiederöffnung für eine Korrektur,
- neue offizielle Version,
- Propagation von Spieltag 17 bis Spieltag 34.

Die Fixture ist bewusst rein deklarativ. Sie löst keine Engine-Berechnung und keine Datenbankoperation aus.
