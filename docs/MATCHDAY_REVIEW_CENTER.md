# Matchday Review Center

Der Matchday Review Center ist die letzte fachliche Sichtpruefung zwischen Berechnung und Veroeffentlichung. Er ist kein Editor fuer Spieler-, Manager- oder Ergebnisdaten.

## Purpose

Die Seite beantwortet drei operative Fragen:

- Was braucht Aufmerksamkeit?
- Was ist bereits in Ordnung?
- Kann der Spieltag veroeffentlicht werden?

Dafuer zeigt `/admin/matchday/review` Regelkandidaten, eine kompakte Berechnungsuebersicht, eine Review-Checkliste und den aktuellen Veroeffentlichungsstatus.

## Relationship to Calculation and Publication

Der Workflow bleibt:

Calculation

↓

Review

↓

Publication

Die Berechnung erzeugt den offiziellen Spieltagsstand und markiert Regelkandidaten. Der Review Center stellt diese Ergebnisse als finalen Quality Check dar. Erst wenn die offenen Review-Punkte geklaert sind, wird die Veroeffentlichung fachlich freigegeben.

## Current Scope

Sprint 14.1 nutzt Review-Fixtures und Lifecycle-Daten fuer die Anzeige. Es gibt keine Backend-Writes, keine Engine-Aufrufe und keine Datenbearbeitung in React.

Vorbereitet, aber noch nicht implementiert:

- Applied Rules,
- Audit,
- Golden Reference comparison,
- Version history.
