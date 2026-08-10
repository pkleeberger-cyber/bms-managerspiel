# Reference Season Difference Audit – Liga 1

## Quelle

- Workbook: `Saisondaten.xlsx`
- Wettbewerb: `LEAGUE_1`
- Verarbeitet: 2026-07-01T14:38:19.262Z

## Zusammenfassung

Kennzahl | Wert
--- | ---:
Paarungen mit Abweichung | 118
Betroffene Manager-Ergebnisse | 147
Unbekannte Manager-Abweichungen | 0
Gesamte absolute Punktedifferenz | 1501

## Kategorien

Kategorie | Paarungen | Manager-Ergebnisse | Absolute Differenz
--- | ---: | ---: | ---:
TEAM_INVALID | 34 | 34 | 904
MANUAL_PENALTY | 38 | 43 | 197
POINT_ADJUSTMENT | 23 | 23 | 122
PLAYER_MAPPING | 42 | 46 | 274
MISSING_RATING | 1 | 1 | 4
UNKNOWN | 0 | 0 | 0

## Klassifikationslogik

- `TEAM_INVALID`: bekannter historischer Thomas-Fall; erwartetes offizielles Ergebnis 0.
- `MISSING_RATING`: Engine und Excel-Spielersumme unterscheiden sich und mindestens ein abweichender Slot hat keine gültige Note.
- `PLAYER_MAPPING`: Engine und Excel-Spielersumme unterscheiden sich auf Spielerebene, ohne fehlende Note als unmittelbares Indiz.
- `MANUAL_PENALTY`: Engine entspricht der Excel-Spielersumme, das offizielle Ergebnis ist niedriger.
- `POINT_ADJUSTMENT`: Engine entspricht der Excel-Spielersumme, das offizielle Ergebnis ist höher.
- `UNKNOWN`: die zwei vorhandenen Sheets liefern kein belastbareres Indiz.

Die Kategorien außer dem bekannten Thomas-Fall sind Prüfhinweise, keine neu
implementierten BMS-Regeln. Die Engines bleiben unverändert.

## Abweichungen

### Spieltag 1: Bernd – Holger · Bernd

- Seite: Heim
- Engine: 70
- Offiziell: 61
- Differenz: +9
- Excel-Spielersumme: 70
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
9 | 9 | Amiri | 3.5 | 1 | 0 | +1 | Nein
11 | 11 | Doan | 3 | 3 | 0 | +3 | Nein
13 | 10 | Uzun | 1.5 | 9 | 13 | -4 | Ja

### Spieltag 1: Bernd – Holger · Holger

- Seite: Auswärts
- Engine: 41
- Offiziell: 26
- Differenz: +15
- Excel-Spielersumme: 48
- Engine gegen Excel-Spielersumme: -7
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 2 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 8 | Uzun | 1.5 | 9 | 13 | -4 | Ja
17 | 16 | Diaz | 1.5 | 9 | 12 | -3 | Ja

### Spieltag 1: Patrick – Thomas · Patrick

- Seite: Heim
- Engine: 47
- Offiziell: 41
- Differenz: +6
- Excel-Spielersumme: 41
- Engine gegen Excel-Spielersumme: +6
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 9 | Nebel | 4.5 | -3 | -9 | +6 | Ja

### Spieltag 1: Patrick – Thomas · Thomas

- Seite: Auswärts
- Engine: 1
- Offiziell: 0
- Differenz: +1
- Excel-Spielersumme: -11
- Engine gegen Excel-Spielersumme: +12
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 9 | Nebel | 4.5 | -3 | -9 | +6 | Ja
14 | 10 | Nebel | 4.5 | -3 | -9 | +6 | Ja

### Spieltag 1: Ben – Dirk · Ben

- Seite: Heim
- Engine: 33
- Offiziell: 24
- Differenz: +9
- Excel-Spielersumme: 33
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 1: Ben – Dirk · Dirk

- Seite: Auswärts
- Engine: 12
- Offiziell: 1
- Differenz: +11
- Excel-Spielersumme: 12
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 1: Stephan – Niklas · Niklas

- Seite: Auswärts
- Engine: 36
- Offiziell: 31
- Differenz: +5
- Excel-Spielersumme: 40
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 11 | Knauff | 3.5 | 1 | 5 | -4 | Ja

### Spieltag 1: Joachim – Sven · Sven

- Seite: Auswärts
- Engine: 64
- Offiziell: 68
- Differenz: -4
- Excel-Spielersumme: 68
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 10 | Grifo | 3.5 | 1 | 5 | -4 | Ja

### Spieltag 1: Reinhard – Ulrich · Reinhard

- Seite: Heim
- Engine: 38
- Offiziell: 29
- Differenz: +9
- Excel-Spielersumme: 38
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 1: Reinhard – Ulrich · Ulrich

- Seite: Auswärts
- Engine: 4
- Offiziell: 3
- Differenz: +1
- Excel-Spielersumme: 4
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 2: Niklas – Roland · Niklas

- Seite: Heim
- Engine: 27
- Offiziell: 22
- Differenz: +5
- Excel-Spielersumme: 27
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 2: Dirk – Patrick · Dirk

- Seite: Heim
- Engine: 28
- Offiziell: 30
- Differenz: -2
- Excel-Spielersumme: 28
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 2: Thomas – Andy · Thomas

- Seite: Heim
- Engine: 34
- Offiziell: 0
- Differenz: +34
- Excel-Spielersumme: 40
- Engine gegen Excel-Spielersumme: -6
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
18 | 16 | Schick | 2 | 7 | 13 | -6 | Ja

### Spieltag 2: Benno – Philipp · Philipp

- Seite: Auswärts
- Engine: 54
- Offiziell: 59
- Differenz: -5
- Excel-Spielersumme: 54
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 2: Jan – Bernd · Bernd

- Seite: Auswärts
- Engine: 77
- Offiziell: 51
- Differenz: +26
- Excel-Spielersumme: 51
- Engine gegen Excel-Spielersumme: +26
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 3 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
9 | 9 | Amiri | 2.5 | 9 | 0 | +9 | Nein
11 | 11 | Doan | 1 | 21 | 0 | +21 | Nein
13 | 12 | Uzun | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 2: Holger – Reinhard · Holger

- Seite: Heim
- Engine: 18
- Offiziell: 19
- Differenz: -1
- Excel-Spielersumme: 25
- Engine gegen Excel-Spielersumme: -7
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 2 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 9 | Uzun | 2.5 | 5 | 9 | -4 | Ja
17 | 16 | Diaz | 3.5 | 1 | 4 | -3 | Ja

### Spieltag 3: Bernd – Reinhard · Bernd

- Seite: Heim
- Engine: 30
- Offiziell: 34
- Differenz: -4
- Excel-Spielersumme: 34
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 12 | Uzun | 3 | 3 | 7 | -4 | Ja

### Spieltag 3: Andy – Dirk · Dirk

- Seite: Auswärts
- Engine: -5
- Offiziell: 1
- Differenz: -6
- Excel-Spielersumme: -5
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 3: Patrick – Enzo · Enzo

- Seite: Auswärts
- Engine: 43
- Offiziell: 54
- Differenz: -11
- Excel-Spielersumme: 47
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 10 | Gnabry | 2 | 7 | 11 | -4 | Ja

### Spieltag 3: Ben – Niklas · Niklas

- Seite: Auswärts
- Engine: 45
- Offiziell: 43
- Differenz: +2
- Excel-Spielersumme: 45
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 3: Stephan – Ulrich · Ulrich

- Seite: Auswärts
- Engine: 15
- Offiziell: 19
- Differenz: -4
- Excel-Spielersumme: 19
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 9 | Kaminski | 3 | 3 | 7 | -4 | Ja

### Spieltag 3: Joachim – Holger · Joachim

- Seite: Heim
- Engine: 50
- Offiziell: 54
- Differenz: -4
- Excel-Spielersumme: 54
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 8 | Schmid | 3 | 3 | 7 | -4 | Ja

### Spieltag 3: Joachim – Holger · Holger

- Seite: Auswärts
- Engine: 37
- Offiziell: 43
- Differenz: -6
- Excel-Spielersumme: 44
- Engine gegen Excel-Spielersumme: -7
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 2 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 8 | Uzun | 3 | 3 | 7 | -4 | Ja
17 | 16 | Diaz | 3 | 3 | 6 | -3 | Ja

### Spieltag 3: Philipp – Thomas · Philipp

- Seite: Heim
- Engine: 39
- Offiziell: 33
- Differenz: +6
- Excel-Spielersumme: 39
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 3: Philipp – Thomas · Thomas

- Seite: Auswärts
- Engine: 40
- Offiziell: 0
- Differenz: +40
- Excel-Spielersumme: 43
- Engine gegen Excel-Spielersumme: -3
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
18 | 16 | Schick | 3 | 3 | 6 | -3 | Ja

### Spieltag 4: Sven – Ben · Sven

- Seite: Heim
- Engine: 68
- Offiziell: 74
- Differenz: -6
- Excel-Spielersumme: 74
- Engine gegen Excel-Spielersumme: -6
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 12 | Grifo | 2 | 7 | 13 | -6 | Ja

### Spieltag 4: Niklas – Patrick · Niklas

- Seite: Heim
- Engine: 27
- Offiziell: 35
- Differenz: -8
- Excel-Spielersumme: 27
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 4: Niklas – Patrick · Patrick

- Seite: Auswärts
- Engine: 38
- Offiziell: 42
- Differenz: -4
- Excel-Spielersumme: 42
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 9 | Nebel | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 4: Enzo – Andy · Enzo

- Seite: Heim
- Engine: 17
- Offiziell: 21
- Differenz: -4
- Excel-Spielersumme: 21
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 9 | Gnabry | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 4: Dirk – Philipp · Dirk

- Seite: Heim
- Engine: 2
- Offiziell: 6
- Differenz: -4
- Excel-Spielersumme: 2
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 4: Dirk – Philipp · Philipp

- Seite: Auswärts
- Engine: 35
- Offiziell: 30
- Differenz: +5
- Excel-Spielersumme: 35
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 4: Thomas – Jan · Thomas

- Seite: Heim
- Engine: 18
- Offiziell: 0
- Differenz: +18
- Excel-Spielersumme: 22
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 10 | Nebel | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 4: Benno – Bernd · Bernd

- Seite: Auswärts
- Engine: 38
- Offiziell: 42
- Differenz: -4
- Excel-Spielersumme: 42
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 12 | Uzun | 3 | 3 | 7 | -4 | Ja

### Spieltag 4: Reinhard – Joachim · Joachim

- Seite: Auswärts
- Engine: 56
- Offiziell: 52
- Differenz: +4
- Excel-Spielersumme: 56
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 4: Holger – Stephan · Holger

- Seite: Heim
- Engine: 28
- Offiziell: 27
- Differenz: +1
- Excel-Spielersumme: 32
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 8 | Uzun | 3 | 3 | 7 | -4 | Ja

### Spieltag 4: Holger – Stephan · Stephan

- Seite: Auswärts
- Engine: 23
- Offiziell: 17
- Differenz: +6
- Excel-Spielersumme: 26
- Engine gegen Excel-Spielersumme: -3
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
17 | 16 | Burkhardt | 2.5 | 5 | 8 | -3 | Ja

### Spieltag 5: Bernd – Joachim · Bernd

- Seite: Heim
- Engine: 62
- Offiziell: 68
- Differenz: -6
- Excel-Spielersumme: 68
- Engine gegen Excel-Spielersumme: -6
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 12 | Uzun | 1 | 11 | 17 | -6 | Ja

### Spieltag 5: Bernd – Joachim · Joachim

- Seite: Auswärts
- Engine: -9
- Offiziell: -13
- Differenz: +4
- Excel-Spielersumme: -9
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 5: Andy – Niklas · Niklas

- Seite: Auswärts
- Engine: 20
- Offiziell: 22
- Differenz: -2
- Excel-Spielersumme: 24
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 11 | Knauff | 2 | 7 | 11 | -4 | Ja

### Spieltag 5: Ben – Ulrich · Ulrich

- Seite: Auswärts
- Engine: 12
- Offiziell: 16
- Differenz: -4
- Excel-Spielersumme: 16
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 8 | Kaminski | 3 | 3 | 7 | -4 | Ja

### Spieltag 5: Roland – Holger · Holger

- Seite: Auswärts
- Engine: 45
- Offiziell: 51
- Differenz: -6
- Excel-Spielersumme: 51
- Engine gegen Excel-Spielersumme: -6
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 11 | Uzun | 1 | 11 | 17 | -6 | Ja

### Spieltag 5: Stephan – Reinhard · Stephan

- Seite: Heim
- Engine: 32
- Offiziell: 20
- Differenz: +12
- Excel-Spielersumme: 35
- Engine gegen Excel-Spielersumme: -3
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
17 | 16 | Burkhardt | 2 | 7 | 10 | -3 | Ja

### Spieltag 5: Benno – Thomas · Thomas

- Seite: Auswärts
- Engine: 6
- Offiziell: -11
- Differenz: +17
- Excel-Spielersumme: 6
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -11; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 5: Jan – Dirk · Jan

- Seite: Heim
- Engine: 21
- Offiziell: 17
- Differenz: +4
- Excel-Spielersumme: 21
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 5: Jan – Dirk · Dirk

- Seite: Auswärts
- Engine: 7
- Offiziell: 10
- Differenz: -3
- Excel-Spielersumme: 7
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 5: Philipp – Enzo · Enzo

- Seite: Auswärts
- Engine: 19
- Offiziell: 18
- Differenz: +1
- Excel-Spielersumme: 19
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 6: Niklas – Philipp · Niklas

- Seite: Heim
- Engine: 32
- Offiziell: 30
- Differenz: +2
- Excel-Spielersumme: 32
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 6: Niklas – Philipp · Philipp

- Seite: Auswärts
- Engine: 31
- Offiziell: 28
- Differenz: +3
- Excel-Spielersumme: 31
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 6: Enzo – Jan · Jan

- Seite: Auswärts
- Engine: 22
- Offiziell: 18
- Differenz: +4
- Excel-Spielersumme: 22
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 6: Dirk – Benno · Dirk

- Seite: Heim
- Engine: 4
- Offiziell: 9
- Differenz: -5
- Excel-Spielersumme: 4
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 6: Thomas – Bernd · Thomas

- Seite: Heim
- Engine: 8
- Offiziell: 0
- Differenz: +8
- Excel-Spielersumme: 8
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 6: Holger – Ben · Holger

- Seite: Heim
- Engine: 31
- Offiziell: 36
- Differenz: -5
- Excel-Spielersumme: 39
- Engine gegen Excel-Spielersumme: -8
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
17 | 16 | Diaz | 1 | 11 | 19 | -8 | Ja

### Spieltag 7: Bernd – Stephan · Stephan

- Seite: Auswärts
- Engine: 58
- Offiziell: 66
- Differenz: -8
- Excel-Spielersumme: 66
- Engine gegen Excel-Spielersumme: -8
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
17 | 16 | Burkhardt | 2 | 7 | 15 | -8 | Ja

### Spieltag 7: Roland – Joachim · Joachim

- Seite: Auswärts
- Engine: 50
- Offiziell: 48
- Differenz: +2
- Excel-Spielersumme: 50
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 7: Thomas – Dirk · Thomas

- Seite: Heim
- Engine: 20
- Offiziell: -3
- Differenz: +23
- Excel-Spielersumme: 20
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -3; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 7: Thomas – Dirk · Dirk

- Seite: Auswärts
- Engine: 6
- Offiziell: -2
- Differenz: +8
- Excel-Spielersumme: 6
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 7: Benno – Enzo · Enzo

- Seite: Auswärts
- Engine: 31
- Offiziell: 26
- Differenz: +5
- Excel-Spielersumme: 31
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 7: Jan – Niklas · Jan

- Seite: Heim
- Engine: 16
- Offiziell: 12
- Differenz: +4
- Excel-Spielersumme: 16
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 7: Jan – Niklas · Niklas

- Seite: Auswärts
- Engine: 31
- Offiziell: 25
- Differenz: +6
- Excel-Spielersumme: 31
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 7: Philipp – Sven · Sven

- Seite: Auswärts
- Engine: 62
- Offiziell: 66
- Differenz: -4
- Excel-Spielersumme: 66
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 10 | Grifo | 3.5 | 1 | 5 | -4 | Ja

### Spieltag 8: Ulrich – Philipp · Philipp

- Seite: Auswärts
- Engine: 23
- Offiziell: 30
- Differenz: -7
- Excel-Spielersumme: 27
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 11 | Führich | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 8: Sven – Jan · Jan

- Seite: Auswärts
- Engine: 30
- Offiziell: 26
- Differenz: +4
- Excel-Spielersumme: 30
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 8: Enzo – Thomas · Enzo

- Seite: Heim
- Engine: 15
- Offiziell: 10
- Differenz: +5
- Excel-Spielersumme: 15
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 8: Enzo – Thomas · Thomas

- Seite: Auswärts
- Engine: 4
- Offiziell: 0
- Differenz: +4
- Excel-Spielersumme: 4
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 8: Dirk – Bernd · Dirk

- Seite: Heim
- Engine: 20
- Offiziell: 22
- Differenz: -2
- Excel-Spielersumme: 20
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 8: Stephan – Roland · Stephan

- Seite: Heim
- Engine: 42
- Offiziell: 50
- Differenz: -8
- Excel-Spielersumme: 50
- Engine gegen Excel-Spielersumme: -8
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
17 | 16 | Burkhardt | 1.5 | 9 | 17 | -8 | Ja

### Spieltag 8: Stephan – Roland · Roland

- Seite: Auswärts
- Engine: 23
- Offiziell: 27
- Differenz: -4
- Excel-Spielersumme: 27
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 9 | Führich | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 8: Joachim – Ben · Joachim

- Seite: Heim
- Engine: 9
- Offiziell: 23
- Differenz: -14
- Excel-Spielersumme: 13
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 10 | Führich | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 8: Holger – Andy · Holger

- Seite: Heim
- Engine: 12
- Offiziell: 16
- Differenz: -4
- Excel-Spielersumme: 16
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 8 | Führich | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 8: Holger – Andy · Andy

- Seite: Auswärts
- Engine: 26
- Offiziell: 30
- Differenz: -4
- Excel-Spielersumme: 30
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 10 | Führich | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 9: Ben – Stephan · Stephan

- Seite: Auswärts
- Engine: 7
- Offiziell: -3
- Differenz: +10
- Excel-Spielersumme: 7
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 9: Dirk – Enzo · Dirk

- Seite: Heim
- Engine: 23
- Offiziell: 29
- Differenz: -6
- Excel-Spielersumme: 23
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 9: Dirk – Enzo · Enzo

- Seite: Auswärts
- Engine: -7
- Offiziell: -5
- Differenz: -2
- Excel-Spielersumme: -3
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 12 | Gnabry | 2.5 | 5 | 9 | -4 | Ja

### Spieltag 9: Thomas – Niklas · Thomas

- Seite: Heim
- Engine: 2
- Offiziell: -6
- Differenz: +8
- Excel-Spielersumme: 2
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -6; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 9: Thomas – Niklas · Niklas

- Seite: Auswärts
- Engine: 17
- Offiziell: 22
- Differenz: -5
- Excel-Spielersumme: 22
- Engine gegen Excel-Spielersumme: -5
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
18 | 16 | Diomande | 1.5 | 9 | 14 | -5 | Ja

### Spieltag 9: Jan – Ulrich · Jan

- Seite: Heim
- Engine: 12
- Offiziell: 8
- Differenz: +4
- Excel-Spielersumme: 12
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 9: Jan – Ulrich · Ulrich

- Seite: Auswärts
- Engine: 30
- Offiziell: 36
- Differenz: -6
- Excel-Spielersumme: 36
- Engine gegen Excel-Spielersumme: -6
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 9 | Kaminski | 1.5 | 9 | 15 | -6 | Ja

### Spieltag 9: Philipp – Holger · Philipp

- Seite: Heim
- Engine: 16
- Offiziell: 21
- Differenz: -5
- Excel-Spielersumme: 16
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 10: Ulrich – Benno · Ulrich

- Seite: Heim
- Engine: 12
- Offiziell: 13
- Differenz: -1
- Excel-Spielersumme: 12
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 10: Sven – Thomas · Thomas

- Seite: Auswärts
- Engine: 24
- Offiziell: -2
- Differenz: +26
- Excel-Spielersumme: 32
- Engine gegen Excel-Spielersumme: -8
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -2; the deviation from 0 remains source data.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
18 | 16 | Schick | 2 | 7 | 15 | -8 | Ja

### Spieltag 10: Niklas – Dirk · Niklas

- Seite: Heim
- Engine: 24
- Offiziell: 26
- Differenz: -2
- Excel-Spielersumme: 24
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 10: Niklas – Dirk · Dirk

- Seite: Auswärts
- Engine: 20
- Offiziell: 16
- Differenz: +4
- Excel-Spielersumme: 20
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 10: Enzo – Bernd · Enzo

- Seite: Heim
- Engine: 15
- Offiziell: 12
- Differenz: +3
- Excel-Spielersumme: 15
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 10: Stephan – Patrick · Stephan

- Seite: Heim
- Engine: 37
- Offiziell: 55
- Differenz: -18
- Excel-Spielersumme: 37
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 10: Holger – Jan · Jan

- Seite: Auswärts
- Engine: 21
- Offiziell: 17
- Differenz: +4
- Excel-Spielersumme: 21
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 11: Andy – Stephan · Stephan

- Seite: Auswärts
- Engine: 39
- Offiziell: 33
- Differenz: +6
- Excel-Spielersumme: 47
- Engine gegen Excel-Spielersumme: -8
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
17 | 16 | Burkhardt | 1.5 | 9 | 17 | -8 | Ja

### Spieltag 11: Enzo – Niklas · Enzo

- Seite: Heim
- Engine: 35
- Offiziell: 30
- Differenz: +5
- Excel-Spielersumme: 35
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 11: Dirk – Sven · Dirk

- Seite: Heim
- Engine: 33
- Offiziell: 40
- Differenz: -7
- Excel-Spielersumme: 38
- Engine gegen Excel-Spielersumme: -5
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
17 | 16 | Beier | 2.5 | 5 | 10 | -5 | Ja

### Spieltag 11: Thomas – Ulrich · Thomas

- Seite: Heim
- Engine: 30
- Offiziell: 0
- Differenz: +30
- Excel-Spielersumme: 30
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 11: Thomas – Ulrich · Ulrich

- Seite: Auswärts
- Engine: 25
- Offiziell: 29
- Differenz: -4
- Excel-Spielersumme: 29
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
14 | 9 | Kaminski | 3.5 | 1 | 5 | -4 | Ja

### Spieltag 11: Benno – Holger · Holger

- Seite: Auswärts
- Engine: 15
- Offiziell: 12
- Differenz: +3
- Excel-Spielersumme: 12
- Engine gegen Excel-Spielersumme: +3
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
6 | 3 | K. Schlotterbeck | 4.5 | -3 | -6 | +3 | Ja

### Spieltag 11: Jan – Reinhard · Jan

- Seite: Heim
- Engine: 21
- Offiziell: 17
- Differenz: +4
- Excel-Spielersumme: 21
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 11: Philipp – Joachim · Philipp

- Seite: Heim
- Engine: 47
- Offiziell: 52
- Differenz: -5
- Excel-Spielersumme: 47
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 12: Ulrich – Dirk · Dirk

- Seite: Auswärts
- Engine: 10
- Offiziell: 14
- Differenz: -4
- Excel-Spielersumme: 10
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 12: Sven – Enzo · Sven

- Seite: Heim
- Engine: 25
- Offiziell: 31
- Differenz: -6
- Excel-Spielersumme: 31
- Engine gegen Excel-Spielersumme: -6
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 12 | Grifo | 1.5 | 9 | 15 | -6 | Ja

### Spieltag 12: Sven – Enzo · Enzo

- Seite: Auswärts
- Engine: -11
- Offiziell: -7
- Differenz: -4
- Excel-Spielersumme: -11
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 12: Niklas – Bernd · Niklas

- Seite: Heim
- Engine: 3
- Offiziell: 9
- Differenz: -6
- Excel-Spielersumme: 3
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 12: Ben – Patrick · Patrick

- Seite: Auswärts
- Engine: -9
- Offiziell: -15
- Differenz: +6
- Excel-Spielersumme: -15
- Engine gegen Excel-Spielersumme: +6
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 9 | Nebel | 6 | -9 | -15 | +6 | Ja

### Spieltag 12: Stephan – Philipp · Stephan

- Seite: Heim
- Engine: -3
- Offiziell: -6
- Differenz: +3
- Excel-Spielersumme: -3
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 12: Stephan – Philipp · Philipp

- Seite: Auswärts
- Engine: 2
- Offiziell: 11
- Differenz: -9
- Excel-Spielersumme: 2
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 12: Joachim – Jan · Jan

- Seite: Auswärts
- Engine: -4
- Offiziell: -8
- Differenz: +4
- Excel-Spielersumme: -4
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 12: Holger – Thomas · Thomas

- Seite: Auswärts
- Engine: -10
- Offiziell: -16
- Differenz: +6
- Excel-Spielersumme: -10
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -16; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 13: Bernd – Patrick · Patrick

- Seite: Auswärts
- Engine: 42
- Offiziell: 53
- Differenz: -11
- Excel-Spielersumme: 53
- Engine gegen Excel-Spielersumme: -11
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
18 | 15 | Diomande | 1 | 11 | 22 | -11 | Ja

### Spieltag 13: Niklas – Sven · Niklas

- Seite: Heim
- Engine: 54
- Offiziell: 52
- Differenz: +2
- Excel-Spielersumme: 54
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 13: Dirk – Holger · Dirk

- Seite: Heim
- Engine: -9
- Offiziell: 1
- Differenz: -10
- Excel-Spielersumme: -9
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 13: Dirk – Holger · Holger

- Seite: Auswärts
- Engine: 38
- Offiziell: 31
- Differenz: +7
- Excel-Spielersumme: 38
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 13: Thomas – Reinhard · Thomas

- Seite: Heim
- Engine: 23
- Offiziell: -3
- Differenz: +26
- Excel-Spielersumme: 23
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -3; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 13: Jan – Stephan · Jan

- Seite: Heim
- Engine: 26
- Offiziell: 22
- Differenz: +4
- Excel-Spielersumme: 26
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 13: Jan – Stephan · Stephan

- Seite: Auswärts
- Engine: 16
- Offiziell: 15
- Differenz: +1
- Excel-Spielersumme: 16
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 13: Philipp – Roland · Philipp

- Seite: Heim
- Engine: 56
- Offiziell: 57
- Differenz: -1
- Excel-Spielersumme: 56
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 14: Ben – Philipp · Philipp

- Seite: Auswärts
- Engine: 28
- Offiziell: 21
- Differenz: +7
- Excel-Spielersumme: 28
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 14: Roland – Jan · Roland

- Seite: Heim
- Engine: 15
- Offiziell: 19
- Differenz: -4
- Excel-Spielersumme: 19
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 9 | Führich | 3.5 | 1 | 5 | -4 | Ja

### Spieltag 14: Roland – Jan · Jan

- Seite: Auswärts
- Engine: 22
- Offiziell: 18
- Differenz: +4
- Excel-Spielersumme: 22
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 14: Joachim – Thomas · Thomas

- Seite: Auswärts
- Engine: 5
- Offiziell: -1
- Differenz: +6
- Excel-Spielersumme: 5
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -1; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 14: Reinhard – Dirk · Dirk

- Seite: Auswärts
- Engine: 23
- Offiziell: 19
- Differenz: +4
- Excel-Spielersumme: 23
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 14: Holger – Enzo · Holger

- Seite: Heim
- Engine: 6
- Offiziell: 10
- Differenz: -4
- Excel-Spielersumme: 10
- Engine gegen Excel-Spielersumme: -4
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
13 | 8 | Führich | 3.5 | 1 | 5 | -4 | Ja

### Spieltag 14: Holger – Enzo · Enzo

- Seite: Auswärts
- Engine: 18
- Offiziell: 21
- Differenz: -3
- Excel-Spielersumme: 18
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 15: Sven – Ulrich · Sven

- Seite: Heim
- Engine: 35
- Offiziell: 41
- Differenz: -6
- Excel-Spielersumme: 41
- Engine gegen Excel-Spielersumme: -6
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 2 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
6 | 3 | Brown | 2.5 | 5 | 7 | -2 | Ja
13 | 8 | Grifo | 3 | 3 | 7 | -4 | Ja

### Spieltag 15: Enzo – Reinhard · Enzo

- Seite: Heim
- Engine: 32
- Offiziell: 28
- Differenz: +4
- Excel-Spielersumme: 34
- Engine gegen Excel-Spielersumme: -2
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
6 | 3 | Brown | 2.5 | 5 | 7 | -2 | Ja

### Spieltag 15: Dirk – Joachim · Dirk

- Seite: Heim
- Engine: 18
- Offiziell: 12
- Differenz: +6
- Excel-Spielersumme: 18
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 15: Thomas – Stephan · Thomas

- Seite: Heim
- Engine: 15
- Offiziell: 0
- Differenz: +15
- Excel-Spielersumme: 20
- Engine gegen Excel-Spielersumme: -5
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
18 | 16 | Schick | 2 | 7 | 12 | -5 | Ja

### Spieltag 15: Thomas – Stephan · Stephan

- Seite: Auswärts
- Engine: 33
- Offiziell: 45
- Differenz: -12
- Excel-Spielersumme: 33
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 15: Jan – Ben · Jan

- Seite: Heim
- Engine: 21
- Offiziell: 17
- Differenz: +4
- Excel-Spielersumme: 21
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 16: Roland – Thomas · Thomas

- Seite: Auswärts
- Engine: 34
- Offiziell: 0
- Differenz: +34
- Excel-Spielersumme: 34
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 16: Joachim – Enzo · Enzo

- Seite: Auswärts
- Engine: 30
- Offiziell: 31
- Differenz: -1
- Excel-Spielersumme: 30
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `POINT_ADJUSTMENT`
- Indizien: Engine total equals the sum of workbook player points. Official total is higher without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 17: Sven – Reinhard · Sven

- Seite: Heim
- Engine: 19
- Offiziell: 16
- Differenz: +3
- Excel-Spielersumme: 19
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 17: Thomas – Ben · Thomas

- Seite: Heim
- Engine: 5
- Offiziell: -2
- Differenz: +7
- Excel-Spielersumme: 5
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -2; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 18: Patrick – Thomas · Thomas

- Seite: Auswärts
- Engine: 75
- Offiziell: -19
- Differenz: +94
- Excel-Spielersumme: 75
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -19; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 19: Thomas – Andy · Thomas

- Seite: Heim
- Engine: -14
- Offiziell: 0
- Differenz: -14
- Excel-Spielersumme: -14
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 20: Ben – Niklas · Ben

- Seite: Heim
- Engine: 19
- Offiziell: 18
- Differenz: +1
- Excel-Spielersumme: 19
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `MANUAL_PENALTY`
- Indizien: Engine total equals the sum of workbook player points. Official total is lower without a player-level scoring difference.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 20: Philipp – Thomas · Thomas

- Seite: Auswärts
- Engine: 31
- Offiziell: 0
- Differenz: +31
- Excel-Spielersumme: 31
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 21: Thomas – Jan · Thomas

- Seite: Heim
- Engine: 20
- Offiziell: 0
- Differenz: +20
- Excel-Spielersumme: 20
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 22: Benno – Thomas · Thomas

- Seite: Auswärts
- Engine: 7
- Offiziell: 0
- Differenz: +7
- Excel-Spielersumme: 7
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 23: Thomas – Bernd · Thomas

- Seite: Heim
- Engine: 6
- Offiziell: 0
- Differenz: +6
- Excel-Spielersumme: 6
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 24: Thomas – Dirk · Thomas

- Seite: Heim
- Engine: 8
- Offiziell: -21
- Differenz: +29
- Excel-Spielersumme: 8
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -21; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 25: Ulrich – Philipp · Ulrich

- Seite: Heim
- Engine: 64
- Offiziell: 63
- Differenz: +1
- Excel-Spielersumme: 63
- Engine gegen Excel-Spielersumme: +1
- Wahrscheinliche Kategorie: `PLAYER_MAPPING`
- Indizien: Engine total differs from the sum of workbook player points. 1 player slot(s) have different engine and workbook points.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
3 | 3 | Laimer | 2.5 | 12 | 11 | +1 | Nein

### Spieltag 25: Enzo – Thomas · Thomas

- Seite: Auswärts
- Engine: 49
- Offiziell: 0
- Differenz: +49
- Excel-Spielersumme: 49
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 26: Thomas – Niklas · Thomas

- Seite: Heim
- Engine: 17
- Offiziell: -3
- Differenz: +20
- Excel-Spielersumme: 17
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total is -3; the deviation from 0 remains source data.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 27: Ulrich – Benno · Ulrich

- Seite: Heim
- Engine: 19
- Offiziell: 15
- Differenz: +4
- Excel-Spielersumme: 15
- Engine gegen Excel-Spielersumme: +4
- Wahrscheinliche Kategorie: `MISSING_RATING`
- Indizien: Engine total differs from the sum of workbook player points. 1 differing player slot(s) have no valid Kicker rating.

Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz
---: | ---: | --- | ---: | ---: | ---: | ---: | ---
15 | 15 | Demirovic | — | 4 | 0 | +4 | Nein

### Spieltag 27: Sven – Thomas · Thomas

- Seite: Auswärts
- Engine: 23
- Offiziell: 0
- Differenz: +23
- Excel-Spielersumme: 23
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 28: Thomas – Ulrich · Thomas

- Seite: Heim
- Engine: 37
- Offiziell: 0
- Differenz: +37
- Excel-Spielersumme: 37
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 29: Holger – Thomas · Thomas

- Seite: Auswärts
- Engine: 29
- Offiziell: 0
- Differenz: +29
- Excel-Spielersumme: 29
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 30: Thomas – Reinhard · Thomas

- Seite: Heim
- Engine: 85
- Offiziell: 0
- Differenz: +85
- Excel-Spielersumme: 85
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 31: Joachim – Thomas · Thomas

- Seite: Auswärts
- Engine: 80
- Offiziell: 0
- Differenz: +80
- Excel-Spielersumme: 80
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 32: Thomas – Stephan · Thomas

- Seite: Heim
- Engine: 52
- Offiziell: 0
- Differenz: +52
- Excel-Spielersumme: 52
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 33: Roland – Thomas · Thomas

- Seite: Auswärts
- Engine: 12
- Offiziell: 0
- Differenz: +12
- Excel-Spielersumme: 12
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

### Spieltag 34: Thomas – Ben · Thomas

- Seite: Heim
- Engine: 13
- Offiziell: 0
- Differenz: +13
- Excel-Spielersumme: 13
- Engine gegen Excel-Spielersumme: 0
- Wahrscheinliche Kategorie: `TEAM_INVALID`
- Indizien: Known historical invalid-team case for Thomas. Expected official invalid-team score is 0. Workbook official total matches the expected invalid-team score.

_Keine Abweichung auf Spielerebene erkennbar._

