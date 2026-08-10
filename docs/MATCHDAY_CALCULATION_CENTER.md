# Matchday Calculation Center

Der Matchday Calculation Center ist die operative Kontrollseite für die offizielle BMS-Berechnung eines Spieltags. Er ist kein Ladebildschirm, sondern zeigt Administratoren, welche Pipeline-Schritte verarbeitet wurden und welches Ergebnis daraus entstanden ist.

## Zweck

- Administratoren sehen den Status der kompletten Spieltagsberechnung.
- Die Seite macht die Engine-Pipeline nachvollziehbar, ohne technische Konsolenlogs zu zeigen.
- Nach erfolgreicher Berechnung führt die Oberfläche direkt in die Regelprüfung oder zurück zum Spieltagsleitstand.

## Pipeline

Die sichtbare Pipeline entspricht der fachlichen Reihenfolge der validierten Domain-Verarbeitung:

1. **Historical Squad**: verwendet historische Kaderstände für den Spieltag.
2. **Lineup Engine**: wertet Manager-Aufstellungen aus.
3. **Match Result Engine**: berechnet Begegnungen.
4. **League Engine**: bereitet Tabellenstände vor.
5. **Rules Engine**: erkennt administrative Regelkandidaten.
6. **Official Matchday**: erzeugt den offiziellen Spieltagsstand.
7. **Match Analysis**: erstellt transparente Analyseobjekte.
8. **Event Engine**: erzeugt Wettbewerbs- und Story-Ereignisse.
9. **Official League Table**: aktualisiert offizielle Tabellen-Snapshots.

Im MVP sind alle Werte Platzhalter. Es werden keine Datenbankdaten gelesen, keine Berechnung gestartet und keine Engine-Ergebnisse persistiert.

## Statusmodell

Jeder Pipeline-Schritt kann einen klaren Betriebszustand anzeigen:

- **Waiting**: Schritt wartet auf vorherige Verarbeitung.
- **Running**: Schritt wird gerade verarbeitet.
- **Completed**: Schritt ist abgeschlossen.
- **Later**: Schritt ist für eine spätere Phase vorgesehen.
- **Error**: Schritt ist fehlgeschlagen.

Die aktuelle MVP-Ansicht zeigt eine erfolgreich abgeschlossene Berechnung.

## Beziehung zu den Domain Engines

Die Seite ist eine Admin-Oberfläche über der bestehenden Domain-Pipeline. Sie soll später vorbereitete Ergebnisse aus den Engines anzeigen, aber selbst keine Berechnungen durchführen:

- keine Punkteberechnung in React,
- keine Tabellenberechnung in React,
- keine Regelanwendung in React,
- keine Persistenz im MVP.

Damit bleibt die fachliche Verantwortung bei den Domain Engines. Die UI visualisiert nur den vorbereiteten Zustand und bietet den nächsten operativen Schritt an.
