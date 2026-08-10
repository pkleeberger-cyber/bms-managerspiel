# AppliedRule Candidates – Reference Season Liga 1

## Status

Diese Datei enthält ausschließlich prüfbare Vorschläge. Keine Regel wurde
angewendet, persistiert oder an eine Manager-ID gebunden.

Kennzahl | Wert
--- | ---:
Kandidaten gesamt | 100
TEAM_INVALID | 34
TEAM_PENALTY | 43
POINT_ADJUSTMENT | 23
Ausgeschlossene Datenprobleme | 47
PLAYER_MAPPING | 46
MISSING_RATING | 1
UNKNOWN | 0

## Review-Grenze

- `MANUAL_PENALTY` wird als `TEAM_PENALTY` mit der Differenz offiziell minus Engine vorgeschlagen.
- `POINT_ADJUSTMENT` bleibt `POINT_ADJUSTMENT`.
- `TEAM_INVALID` schlägt das erwartete ungültige Ergebnis 0 vor.
- Persistierte Manager-/Team-IDs müssen vor einer späteren Anwendung aufgelöst werden.
- `PLAYER_MAPPING`, `MISSING_RATING` und `UNKNOWN` werden niemals in Regeln umgewandelt.

## Regelkandidaten

### reference-season:matchday-1:bernd:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 1
- Manager: Bernd
- Manager-ID: noch nicht aufgelöst
- Paarung: Bernd – Holger
- Seite: Heim
- Punkte: -9
- Engine: 70
- Offiziell: 61
- Excel-Spielersumme: 70
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-1:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 1
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Patrick – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 1
- Offiziell: 0
- Excel-Spielersumme: -11
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-1:ben:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 1
- Manager: Ben
- Manager-ID: noch nicht aufgelöst
- Paarung: Ben – Dirk
- Seite: Heim
- Punkte: -9
- Engine: 33
- Offiziell: 24
- Excel-Spielersumme: 33
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-1:dirk:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 1
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Ben – Dirk
- Seite: Auswärts
- Punkte: -11
- Engine: 12
- Offiziell: 1
- Excel-Spielersumme: 12
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-1:reinhard:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 1
- Manager: Reinhard
- Manager-ID: noch nicht aufgelöst
- Paarung: Reinhard – Ulrich
- Seite: Heim
- Punkte: -9
- Engine: 38
- Offiziell: 29
- Excel-Spielersumme: 38
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-1:ulrich:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 1
- Manager: Ulrich
- Manager-ID: noch nicht aufgelöst
- Paarung: Reinhard – Ulrich
- Seite: Auswärts
- Punkte: -1
- Engine: 4
- Offiziell: 3
- Excel-Spielersumme: 4
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-2:niklas:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 2
- Manager: Niklas
- Manager-ID: noch nicht aufgelöst
- Paarung: Niklas – Roland
- Seite: Heim
- Punkte: -5
- Engine: 27
- Offiziell: 22
- Excel-Spielersumme: 27
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-2:dirk:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 2
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Dirk – Patrick
- Seite: Heim
- Punkte: +2
- Engine: 28
- Offiziell: 30
- Excel-Spielersumme: 28
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-2:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 2
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Andy
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 34
- Offiziell: 0
- Excel-Spielersumme: 40
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-2:philipp:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 2
- Manager: Philipp
- Manager-ID: noch nicht aufgelöst
- Paarung: Benno – Philipp
- Seite: Auswärts
- Punkte: +5
- Engine: 54
- Offiziell: 59
- Excel-Spielersumme: 54
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-3:dirk:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 3
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Andy – Dirk
- Seite: Auswärts
- Punkte: +6
- Engine: -5
- Offiziell: 1
- Excel-Spielersumme: -5
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-3:niklas:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 3
- Manager: Niklas
- Manager-ID: noch nicht aufgelöst
- Paarung: Ben – Niklas
- Seite: Auswärts
- Punkte: -2
- Engine: 45
- Offiziell: 43
- Excel-Spielersumme: 45
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-3:philipp:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 3
- Manager: Philipp
- Manager-ID: noch nicht aufgelöst
- Paarung: Philipp – Thomas
- Seite: Heim
- Punkte: -6
- Engine: 39
- Offiziell: 33
- Excel-Spielersumme: 39
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-3:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 3
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Philipp – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 40
- Offiziell: 0
- Excel-Spielersumme: 43
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-4:niklas:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 4
- Manager: Niklas
- Manager-ID: noch nicht aufgelöst
- Paarung: Niklas – Patrick
- Seite: Heim
- Punkte: +8
- Engine: 27
- Offiziell: 35
- Excel-Spielersumme: 27
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-4:dirk:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 4
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Dirk – Philipp
- Seite: Heim
- Punkte: +4
- Engine: 2
- Offiziell: 6
- Excel-Spielersumme: 2
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-4:philipp:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 4
- Manager: Philipp
- Manager-ID: noch nicht aufgelöst
- Paarung: Dirk – Philipp
- Seite: Auswärts
- Punkte: -5
- Engine: 35
- Offiziell: 30
- Excel-Spielersumme: 35
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-4:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 4
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Jan
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 18
- Offiziell: 0
- Excel-Spielersumme: 22
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-4:joachim:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 4
- Manager: Joachim
- Manager-ID: noch nicht aufgelöst
- Paarung: Reinhard – Joachim
- Seite: Auswärts
- Punkte: -4
- Engine: 56
- Offiziell: 52
- Excel-Spielersumme: 56
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-5:joachim:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 5
- Manager: Joachim
- Manager-ID: noch nicht aufgelöst
- Paarung: Bernd – Joachim
- Seite: Auswärts
- Punkte: -4
- Engine: -9
- Offiziell: -13
- Excel-Spielersumme: -9
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-5:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 5
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Benno – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 6
- Offiziell: -11
- Excel-Spielersumme: 6
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -11; the deviation from 0 remains source data.

### reference-season:matchday-5:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 5
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Jan – Dirk
- Seite: Heim
- Punkte: -4
- Engine: 21
- Offiziell: 17
- Excel-Spielersumme: 21
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-5:dirk:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 5
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Jan – Dirk
- Seite: Auswärts
- Punkte: +3
- Engine: 7
- Offiziell: 10
- Excel-Spielersumme: 7
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-5:enzo:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 5
- Manager: Enzo
- Manager-ID: noch nicht aufgelöst
- Paarung: Philipp – Enzo
- Seite: Auswärts
- Punkte: -1
- Engine: 19
- Offiziell: 18
- Excel-Spielersumme: 19
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-6:niklas:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 6
- Manager: Niklas
- Manager-ID: noch nicht aufgelöst
- Paarung: Niklas – Philipp
- Seite: Heim
- Punkte: -2
- Engine: 32
- Offiziell: 30
- Excel-Spielersumme: 32
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-6:philipp:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 6
- Manager: Philipp
- Manager-ID: noch nicht aufgelöst
- Paarung: Niklas – Philipp
- Seite: Auswärts
- Punkte: -3
- Engine: 31
- Offiziell: 28
- Excel-Spielersumme: 31
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-6:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 6
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Enzo – Jan
- Seite: Auswärts
- Punkte: -4
- Engine: 22
- Offiziell: 18
- Excel-Spielersumme: 22
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-6:dirk:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 6
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Dirk – Benno
- Seite: Heim
- Punkte: +5
- Engine: 4
- Offiziell: 9
- Excel-Spielersumme: 4
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-6:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 6
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Bernd
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 8
- Offiziell: 0
- Excel-Spielersumme: 8
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-7:joachim:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 7
- Manager: Joachim
- Manager-ID: noch nicht aufgelöst
- Paarung: Roland – Joachim
- Seite: Auswärts
- Punkte: -2
- Engine: 50
- Offiziell: 48
- Excel-Spielersumme: 50
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-7:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 7
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Dirk
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 20
- Offiziell: -3
- Excel-Spielersumme: 20
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -3; the deviation from 0 remains source data.

### reference-season:matchday-7:dirk:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 7
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Dirk
- Seite: Auswärts
- Punkte: -8
- Engine: 6
- Offiziell: -2
- Excel-Spielersumme: 6
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-7:enzo:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 7
- Manager: Enzo
- Manager-ID: noch nicht aufgelöst
- Paarung: Benno – Enzo
- Seite: Auswärts
- Punkte: -5
- Engine: 31
- Offiziell: 26
- Excel-Spielersumme: 31
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-7:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 7
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Jan – Niklas
- Seite: Heim
- Punkte: -4
- Engine: 16
- Offiziell: 12
- Excel-Spielersumme: 16
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-7:niklas:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 7
- Manager: Niklas
- Manager-ID: noch nicht aufgelöst
- Paarung: Jan – Niklas
- Seite: Auswärts
- Punkte: -6
- Engine: 31
- Offiziell: 25
- Excel-Spielersumme: 31
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-8:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 8
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Sven – Jan
- Seite: Auswärts
- Punkte: -4
- Engine: 30
- Offiziell: 26
- Excel-Spielersumme: 30
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-8:enzo:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 8
- Manager: Enzo
- Manager-ID: noch nicht aufgelöst
- Paarung: Enzo – Thomas
- Seite: Heim
- Punkte: -5
- Engine: 15
- Offiziell: 10
- Excel-Spielersumme: 15
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-8:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 8
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Enzo – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 4
- Offiziell: 0
- Excel-Spielersumme: 4
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-8:dirk:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 8
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Dirk – Bernd
- Seite: Heim
- Punkte: +2
- Engine: 20
- Offiziell: 22
- Excel-Spielersumme: 20
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-9:stephan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 9
- Manager: Stephan
- Manager-ID: noch nicht aufgelöst
- Paarung: Ben – Stephan
- Seite: Auswärts
- Punkte: -10
- Engine: 7
- Offiziell: -3
- Excel-Spielersumme: 7
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-9:dirk:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 9
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Dirk – Enzo
- Seite: Heim
- Punkte: +6
- Engine: 23
- Offiziell: 29
- Excel-Spielersumme: 23
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-9:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 9
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Niklas
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 2
- Offiziell: -6
- Excel-Spielersumme: 2
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -6; the deviation from 0 remains source data.

### reference-season:matchday-9:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 9
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Jan – Ulrich
- Seite: Heim
- Punkte: -4
- Engine: 12
- Offiziell: 8
- Excel-Spielersumme: 12
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-9:philipp:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 9
- Manager: Philipp
- Manager-ID: noch nicht aufgelöst
- Paarung: Philipp – Holger
- Seite: Heim
- Punkte: +5
- Engine: 16
- Offiziell: 21
- Excel-Spielersumme: 16
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-10:ulrich:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 10
- Manager: Ulrich
- Manager-ID: noch nicht aufgelöst
- Paarung: Ulrich – Benno
- Seite: Heim
- Punkte: +1
- Engine: 12
- Offiziell: 13
- Excel-Spielersumme: 12
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-10:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 10
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Sven – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 24
- Offiziell: -2
- Excel-Spielersumme: 32
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -2; the deviation from 0 remains source data.

### reference-season:matchday-10:niklas:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 10
- Manager: Niklas
- Manager-ID: noch nicht aufgelöst
- Paarung: Niklas – Dirk
- Seite: Heim
- Punkte: +2
- Engine: 24
- Offiziell: 26
- Excel-Spielersumme: 24
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-10:dirk:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 10
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Niklas – Dirk
- Seite: Auswärts
- Punkte: -4
- Engine: 20
- Offiziell: 16
- Excel-Spielersumme: 20
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-10:enzo:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 10
- Manager: Enzo
- Manager-ID: noch nicht aufgelöst
- Paarung: Enzo – Bernd
- Seite: Heim
- Punkte: -3
- Engine: 15
- Offiziell: 12
- Excel-Spielersumme: 15
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-10:stephan:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 10
- Manager: Stephan
- Manager-ID: noch nicht aufgelöst
- Paarung: Stephan – Patrick
- Seite: Heim
- Punkte: +18
- Engine: 37
- Offiziell: 55
- Excel-Spielersumme: 37
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-10:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 10
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Holger – Jan
- Seite: Auswärts
- Punkte: -4
- Engine: 21
- Offiziell: 17
- Excel-Spielersumme: 21
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-11:enzo:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 11
- Manager: Enzo
- Manager-ID: noch nicht aufgelöst
- Paarung: Enzo – Niklas
- Seite: Heim
- Punkte: -5
- Engine: 35
- Offiziell: 30
- Excel-Spielersumme: 35
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-11:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 11
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Ulrich
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 30
- Offiziell: 0
- Excel-Spielersumme: 30
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-11:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 11
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Jan – Reinhard
- Seite: Heim
- Punkte: -4
- Engine: 21
- Offiziell: 17
- Excel-Spielersumme: 21
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-11:philipp:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 11
- Manager: Philipp
- Manager-ID: noch nicht aufgelöst
- Paarung: Philipp – Joachim
- Seite: Heim
- Punkte: +5
- Engine: 47
- Offiziell: 52
- Excel-Spielersumme: 47
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-12:dirk:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 12
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Ulrich – Dirk
- Seite: Auswärts
- Punkte: +4
- Engine: 10
- Offiziell: 14
- Excel-Spielersumme: 10
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-12:enzo:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 12
- Manager: Enzo
- Manager-ID: noch nicht aufgelöst
- Paarung: Sven – Enzo
- Seite: Auswärts
- Punkte: +4
- Engine: -11
- Offiziell: -7
- Excel-Spielersumme: -11
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-12:niklas:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 12
- Manager: Niklas
- Manager-ID: noch nicht aufgelöst
- Paarung: Niklas – Bernd
- Seite: Heim
- Punkte: +6
- Engine: 3
- Offiziell: 9
- Excel-Spielersumme: 3
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-12:stephan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 12
- Manager: Stephan
- Manager-ID: noch nicht aufgelöst
- Paarung: Stephan – Philipp
- Seite: Heim
- Punkte: -3
- Engine: -3
- Offiziell: -6
- Excel-Spielersumme: -3
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-12:philipp:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 12
- Manager: Philipp
- Manager-ID: noch nicht aufgelöst
- Paarung: Stephan – Philipp
- Seite: Auswärts
- Punkte: +9
- Engine: 2
- Offiziell: 11
- Excel-Spielersumme: 2
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-12:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 12
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Joachim – Jan
- Seite: Auswärts
- Punkte: -4
- Engine: -4
- Offiziell: -8
- Excel-Spielersumme: -4
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-12:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 12
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Holger – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: -10
- Offiziell: -16
- Excel-Spielersumme: -10
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -16; the deviation from 0 remains source data.

### reference-season:matchday-13:niklas:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 13
- Manager: Niklas
- Manager-ID: noch nicht aufgelöst
- Paarung: Niklas – Sven
- Seite: Heim
- Punkte: -2
- Engine: 54
- Offiziell: 52
- Excel-Spielersumme: 54
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-13:dirk:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 13
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Dirk – Holger
- Seite: Heim
- Punkte: +10
- Engine: -9
- Offiziell: 1
- Excel-Spielersumme: -9
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-13:holger:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 13
- Manager: Holger
- Manager-ID: noch nicht aufgelöst
- Paarung: Dirk – Holger
- Seite: Auswärts
- Punkte: -7
- Engine: 38
- Offiziell: 31
- Excel-Spielersumme: 38
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-13:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 13
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Reinhard
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 23
- Offiziell: -3
- Excel-Spielersumme: 23
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -3; the deviation from 0 remains source data.

### reference-season:matchday-13:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 13
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Jan – Stephan
- Seite: Heim
- Punkte: -4
- Engine: 26
- Offiziell: 22
- Excel-Spielersumme: 26
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-13:stephan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 13
- Manager: Stephan
- Manager-ID: noch nicht aufgelöst
- Paarung: Jan – Stephan
- Seite: Auswärts
- Punkte: -1
- Engine: 16
- Offiziell: 15
- Excel-Spielersumme: 16
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-13:philipp:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 13
- Manager: Philipp
- Manager-ID: noch nicht aufgelöst
- Paarung: Philipp – Roland
- Seite: Heim
- Punkte: +1
- Engine: 56
- Offiziell: 57
- Excel-Spielersumme: 56
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-14:philipp:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 14
- Manager: Philipp
- Manager-ID: noch nicht aufgelöst
- Paarung: Ben – Philipp
- Seite: Auswärts
- Punkte: -7
- Engine: 28
- Offiziell: 21
- Excel-Spielersumme: 28
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-14:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 14
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Roland – Jan
- Seite: Auswärts
- Punkte: -4
- Engine: 22
- Offiziell: 18
- Excel-Spielersumme: 22
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-14:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 14
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Joachim – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 5
- Offiziell: -1
- Excel-Spielersumme: 5
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -1; the deviation from 0 remains source data.

### reference-season:matchday-14:dirk:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 14
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Reinhard – Dirk
- Seite: Auswärts
- Punkte: -4
- Engine: 23
- Offiziell: 19
- Excel-Spielersumme: 23
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-14:enzo:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 14
- Manager: Enzo
- Manager-ID: noch nicht aufgelöst
- Paarung: Holger – Enzo
- Seite: Auswärts
- Punkte: +3
- Engine: 18
- Offiziell: 21
- Excel-Spielersumme: 18
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-15:dirk:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 15
- Manager: Dirk
- Manager-ID: noch nicht aufgelöst
- Paarung: Dirk – Joachim
- Seite: Heim
- Punkte: -6
- Engine: 18
- Offiziell: 12
- Excel-Spielersumme: 18
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-15:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 15
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Stephan
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 15
- Offiziell: 0
- Excel-Spielersumme: 20
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-15:stephan:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 15
- Manager: Stephan
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Stephan
- Seite: Auswärts
- Punkte: +12
- Engine: 33
- Offiziell: 45
- Excel-Spielersumme: 33
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-15:jan:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 15
- Manager: Jan
- Manager-ID: noch nicht aufgelöst
- Paarung: Jan – Ben
- Seite: Heim
- Punkte: -4
- Engine: 21
- Offiziell: 17
- Excel-Spielersumme: 21
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-16:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 16
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Roland – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 34
- Offiziell: 0
- Excel-Spielersumme: 34
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-16:enzo:point-adjustment

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `POINT_ADJUSTMENT`
- Ursprungskategorie: `POINT_ADJUSTMENT`
- Spieltag: 16
- Manager: Enzo
- Manager-ID: noch nicht aufgelöst
- Paarung: Joachim – Enzo
- Seite: Auswärts
- Punkte: +1
- Engine: 30
- Offiziell: 31
- Excel-Spielersumme: 30
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

### reference-season:matchday-17:sven:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 17
- Manager: Sven
- Manager-ID: noch nicht aufgelöst
- Paarung: Sven – Reinhard
- Seite: Heim
- Punkte: -3
- Engine: 19
- Offiziell: 16
- Excel-Spielersumme: 19
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-17:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 17
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Ben
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 5
- Offiziell: -2
- Excel-Spielersumme: 5
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -2; the deviation from 0 remains source data.

### reference-season:matchday-18:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 18
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Patrick – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 75
- Offiziell: -19
- Excel-Spielersumme: 75
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -19; the deviation from 0 remains source data.

### reference-season:matchday-19:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 19
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Andy
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: -14
- Offiziell: 0
- Excel-Spielersumme: -14
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-20:ben:team-penalty

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_PENALTY`
- Ursprungskategorie: `MANUAL_PENALTY`
- Spieltag: 20
- Manager: Ben
- Manager-ID: noch nicht aufgelöst
- Paarung: Ben – Niklas
- Seite: Heim
- Punkte: -1
- Engine: 19
- Offiziell: 18
- Excel-Spielersumme: 19
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

### reference-season:matchday-20:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 20
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Philipp – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 31
- Offiziell: 0
- Excel-Spielersumme: 31
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-21:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 21
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Jan
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 20
- Offiziell: 0
- Excel-Spielersumme: 20
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-22:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 22
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Benno – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 7
- Offiziell: 0
- Excel-Spielersumme: 7
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-23:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 23
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Bernd
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 6
- Offiziell: 0
- Excel-Spielersumme: 6
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-24:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 24
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Dirk
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 8
- Offiziell: -21
- Excel-Spielersumme: 8
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -21; the deviation from 0 remains source data.

### reference-season:matchday-25:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 25
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Enzo – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 49
- Offiziell: 0
- Excel-Spielersumme: 49
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-26:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 26
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Niklas
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 17
- Offiziell: -3
- Excel-Spielersumme: 17
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -3; the deviation from 0 remains source data.

### reference-season:matchday-27:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 27
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Sven – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 23
- Offiziell: 0
- Excel-Spielersumme: 23
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-28:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 28
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Ulrich
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 37
- Offiziell: 0
- Excel-Spielersumme: 37
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-29:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 29
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Holger – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 29
- Offiziell: 0
- Excel-Spielersumme: 29
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-30:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 30
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Reinhard
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 85
- Offiziell: 0
- Excel-Spielersumme: 85
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-31:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 31
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Joachim – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 80
- Offiziell: 0
- Excel-Spielersumme: 80
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-32:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 32
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Stephan
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 52
- Offiziell: 0
- Excel-Spielersumme: 52
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-33:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 33
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Roland – Thomas
- Seite: Auswärts
- Ungültiges Ergebnis: 0
- Engine: 12
- Offiziell: 0
- Excel-Spielersumme: 12
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

### reference-season:matchday-34:thomas:team-invalid

- Status: `REVIEW_REQUIRED`
- Vorgeschlagener Regeltyp: `TEAM_INVALID`
- Ursprungskategorie: `TEAM_INVALID`
- Spieltag: 34
- Manager: Thomas
- Manager-ID: noch nicht aufgelöst
- Paarung: Thomas – Ben
- Seite: Heim
- Ungültiges Ergebnis: 0
- Engine: 13
- Offiziell: 0
- Excel-Spielersumme: 13
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.


## Ausgeschlossene Mapping- und Datenprobleme

- Spieltag 1, Bernd – Holger, Holger: `PLAYER_MAPPING`; Engine 41, offiziell 26; Slot 14 Uzun: 9 / 13; Slot 17 Diaz: 9 / 12
- Spieltag 1, Patrick – Thomas, Patrick: `PLAYER_MAPPING`; Engine 47, offiziell 41; Slot 13 Nebel: -3 / -9
- Spieltag 1, Stephan – Niklas, Niklas: `PLAYER_MAPPING`; Engine 36, offiziell 31; Slot 14 Knauff: 1 / 5
- Spieltag 1, Joachim – Sven, Sven: `PLAYER_MAPPING`; Engine 64, offiziell 68; Slot 13 Grifo: 1 / 5
- Spieltag 2, Jan – Bernd, Bernd: `PLAYER_MAPPING`; Engine 77, offiziell 51; Slot 9 Amiri: 9 / 0; Slot 11 Doan: 21 / 0; Slot 13 Uzun: 5 / 9
- Spieltag 2, Holger – Reinhard, Holger: `PLAYER_MAPPING`; Engine 18, offiziell 19; Slot 14 Uzun: 5 / 9; Slot 17 Diaz: 1 / 4
- Spieltag 3, Bernd – Reinhard, Bernd: `PLAYER_MAPPING`; Engine 30, offiziell 34; Slot 13 Uzun: 3 / 7
- Spieltag 3, Patrick – Enzo, Enzo: `PLAYER_MAPPING`; Engine 43, offiziell 54; Slot 13 Gnabry: 7 / 11
- Spieltag 3, Stephan – Ulrich, Ulrich: `PLAYER_MAPPING`; Engine 15, offiziell 19; Slot 14 Kaminski: 3 / 7
- Spieltag 3, Joachim – Holger, Joachim: `PLAYER_MAPPING`; Engine 50, offiziell 54; Slot 14 Schmid: 3 / 7
- Spieltag 3, Joachim – Holger, Holger: `PLAYER_MAPPING`; Engine 37, offiziell 43; Slot 14 Uzun: 3 / 7; Slot 17 Diaz: 3 / 6
- Spieltag 4, Sven – Ben, Sven: `PLAYER_MAPPING`; Engine 68, offiziell 74; Slot 13 Grifo: 7 / 13
- Spieltag 4, Niklas – Patrick, Patrick: `PLAYER_MAPPING`; Engine 38, offiziell 42; Slot 13 Nebel: 5 / 9
- Spieltag 4, Enzo – Andy, Enzo: `PLAYER_MAPPING`; Engine 17, offiziell 21; Slot 13 Gnabry: 5 / 9
- Spieltag 4, Benno – Bernd, Bernd: `PLAYER_MAPPING`; Engine 38, offiziell 42; Slot 13 Uzun: 3 / 7
- Spieltag 4, Holger – Stephan, Holger: `PLAYER_MAPPING`; Engine 28, offiziell 27; Slot 14 Uzun: 3 / 7
- Spieltag 4, Holger – Stephan, Stephan: `PLAYER_MAPPING`; Engine 23, offiziell 17; Slot 17 Burkhardt: 5 / 8
- Spieltag 5, Bernd – Joachim, Bernd: `PLAYER_MAPPING`; Engine 62, offiziell 68; Slot 13 Uzun: 11 / 17
- Spieltag 5, Andy – Niklas, Niklas: `PLAYER_MAPPING`; Engine 20, offiziell 22; Slot 14 Knauff: 7 / 11
- Spieltag 5, Ben – Ulrich, Ulrich: `PLAYER_MAPPING`; Engine 12, offiziell 16; Slot 14 Kaminski: 3 / 7
- Spieltag 5, Roland – Holger, Holger: `PLAYER_MAPPING`; Engine 45, offiziell 51; Slot 14 Uzun: 11 / 17
- Spieltag 5, Stephan – Reinhard, Stephan: `PLAYER_MAPPING`; Engine 32, offiziell 20; Slot 17 Burkhardt: 7 / 10
- Spieltag 6, Holger – Ben, Holger: `PLAYER_MAPPING`; Engine 31, offiziell 36; Slot 17 Diaz: 11 / 19
- Spieltag 7, Bernd – Stephan, Stephan: `PLAYER_MAPPING`; Engine 58, offiziell 66; Slot 17 Burkhardt: 7 / 15
- Spieltag 7, Philipp – Sven, Sven: `PLAYER_MAPPING`; Engine 62, offiziell 66; Slot 13 Grifo: 1 / 5
- Spieltag 8, Ulrich – Philipp, Philipp: `PLAYER_MAPPING`; Engine 23, offiziell 30; Slot 14 Führich: 5 / 9
- Spieltag 8, Stephan – Roland, Stephan: `PLAYER_MAPPING`; Engine 42, offiziell 50; Slot 17 Burkhardt: 9 / 17
- Spieltag 8, Stephan – Roland, Roland: `PLAYER_MAPPING`; Engine 23, offiziell 27; Slot 13 Führich: 5 / 9
- Spieltag 8, Joachim – Ben, Joachim: `PLAYER_MAPPING`; Engine 9, offiziell 23; Slot 13 Führich: 5 / 9
- Spieltag 8, Holger – Andy, Holger: `PLAYER_MAPPING`; Engine 12, offiziell 16; Slot 13 Führich: 5 / 9
- Spieltag 8, Holger – Andy, Andy: `PLAYER_MAPPING`; Engine 26, offiziell 30; Slot 14 Führich: 5 / 9
- Spieltag 9, Dirk – Enzo, Enzo: `PLAYER_MAPPING`; Engine -7, offiziell -5; Slot 13 Gnabry: 5 / 9
- Spieltag 9, Thomas – Niklas, Niklas: `PLAYER_MAPPING`; Engine 17, offiziell 22; Slot 18 Diomande: 9 / 14
- Spieltag 9, Jan – Ulrich, Ulrich: `PLAYER_MAPPING`; Engine 30, offiziell 36; Slot 14 Kaminski: 9 / 15
- Spieltag 11, Andy – Stephan, Stephan: `PLAYER_MAPPING`; Engine 39, offiziell 33; Slot 17 Burkhardt: 9 / 17
- Spieltag 11, Dirk – Sven, Dirk: `PLAYER_MAPPING`; Engine 33, offiziell 40; Slot 17 Beier: 5 / 10
- Spieltag 11, Thomas – Ulrich, Ulrich: `PLAYER_MAPPING`; Engine 25, offiziell 29; Slot 14 Kaminski: 1 / 5
- Spieltag 11, Benno – Holger, Holger: `PLAYER_MAPPING`; Engine 15, offiziell 12; Slot 6 K. Schlotterbeck: -3 / -6
- Spieltag 12, Sven – Enzo, Sven: `PLAYER_MAPPING`; Engine 25, offiziell 31; Slot 13 Grifo: 9 / 15
- Spieltag 12, Ben – Patrick, Patrick: `PLAYER_MAPPING`; Engine -9, offiziell -15; Slot 13 Nebel: -9 / -15
- Spieltag 13, Bernd – Patrick, Patrick: `PLAYER_MAPPING`; Engine 42, offiziell 53; Slot 18 Diomande: 11 / 22
- Spieltag 14, Roland – Jan, Roland: `PLAYER_MAPPING`; Engine 15, offiziell 19; Slot 13 Führich: 1 / 5
- Spieltag 14, Holger – Enzo, Holger: `PLAYER_MAPPING`; Engine 6, offiziell 10; Slot 13 Führich: 1 / 5
- Spieltag 15, Sven – Ulrich, Sven: `PLAYER_MAPPING`; Engine 35, offiziell 41; Slot 6 Brown: 5 / 7; Slot 13 Grifo: 3 / 7
- Spieltag 15, Enzo – Reinhard, Enzo: `PLAYER_MAPPING`; Engine 32, offiziell 28; Slot 6 Brown: 5 / 7
- Spieltag 25, Ulrich – Philipp, Ulrich: `PLAYER_MAPPING`; Engine 64, offiziell 63; Slot 3 Laimer: 12 / 11
- Spieltag 27, Ulrich – Benno, Ulrich: `MISSING_RATING`; Engine 19, offiziell 15; Slot 15 Demirovic: 4 / 0
