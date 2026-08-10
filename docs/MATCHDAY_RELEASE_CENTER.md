# Matchday Release Center

Der Matchday Release Center ist die finale fachliche Freigabe eines vollstaendigen Spieltags. Er ist kein technischer Publish-Dialog und fuehrt keine Datenbank-Schreibvorgaenge aus.

## Purpose

Die Seite beantwortet vor der Freigabe:

- Was wird nach der Freigabe sichtbar?
- Wird der Spieltag vorlaeufig freigegeben?
- Wird der Spieltag offiziell abgeschlossen?

`/admin/matchday/release` nutzt Lifecycle-Daten und Release-Fixtures, um den aktuellen Freigabestand, die Release-Art und die Konsequenzen sichtbar zu machen.

## Vorlaeufig

`Vorläufig freigeben` macht die Ergebnisse fuer Manager sichtbar, laesst aber fachliche Korrekturen weiterhin zu. Dieser Modus ist fuer den ersten operativen Stand nach Berechnung und Review gedacht.

Nach der vorlaeufigen Freigabe sind sichtbar:

- Ergebnisse,
- Tabellen,
- Matchanalyse,
- Wettbewerbsstaende,
- Historie.

## Offiziell

`Offiziell abschließen` schliesst den Spieltag fachlich ab. Danach sind weitere Aenderungen nur nach einer bewussten Wiederöffnung vorgesehen.

Zusaetzliche Konsequenzen:

- Spieltag abgeschlossen,
- weitere Aenderungen nur nach Wiederöffnung.

## Current Scope

Sprint 14.2 bildet die Freigabe als UI-Workspace ab. Die Auswahl und der Erfolgszustand laufen clientseitig, ohne Lifecycle-Update, ohne Notifications, ohne E-Mails, ohne Discord und ohne Push-Versand.
