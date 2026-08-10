# Final Season Verification – Liga 1

## Verarbeitung

```text
Berechnete Referenzsaison
        ↓
Geprüfte AppliedRule-Kandidaten
        ↓
Bestehender Rules Engine
        ↓
Offizielle Matchday-Ergebnisse
        ↓
Offizielle Abschlusstabelle
        ↓
Vergleich mit historischen Excel-Ergebnissen
```

Für diesen Verifikationslauf werden alle 100 Kandidaten als geprüft angenommen.
Es erfolgt keine Persistierung und keine automatische Freigabe für Produktion.

## Ergebnis

Kennzahl | Wert
--- | ---:
Paarungen gesamt | 306
Exakte Paarungen | 253
Verbleibende Paarungen mit Abweichung | 53
Verbleibende absolute Punktedifferenz | 365
TEAM_INVALID angewendet | 34
TEAM_PENALTY angewendet | 43
POINT_ADJUSTMENT angewendet | 23
PLAYER_MAPPING verbleibend | 46
MISSING_RATING verbleibend | 1
UNKNOWN verbleibend | 0

## Verbleibende Differenzen nach Kategorie

Kategorie | Manager-Ergebnisse | Absolute Differenz
--- | ---: | ---:
TEAM_INVALID | 11 | 87
MANUAL_PENALTY | 0 | 0
POINT_ADJUSTMENT | 0 | 0
PLAYER_MAPPING | 46 | 274
MISSING_RATING | 1 | 4
UNKNOWN | 0 | 0

## Verbleibende Abweichungen

Spieltag | Paarung | Official Engine | Historisch | Differenz | Kategorie
---: | --- | ---: | ---: | ---: | ---
1 | Bernd – Holger | 61:41 | 61:26 | 0 / +15 | `PLAYER_MAPPING`
1 | Patrick – Thomas | 47:0 | 41:0 | +6 / 0 | `PLAYER_MAPPING`
1 | Stephan – Niklas | 31:36 | 31:31 | 0 / +5 | `PLAYER_MAPPING`
1 | Joachim – Sven | 45:64 | 45:68 | 0 / -4 | `PLAYER_MAPPING`
2 | Jan – Bernd | 12:77 | 12:51 | 0 / +26 | `PLAYER_MAPPING`
2 | Holger – Reinhard | 18:25 | 19:25 | -1 / 0 | `PLAYER_MAPPING`
3 | Bernd – Reinhard | 30:14 | 34:14 | -4 / 0 | `PLAYER_MAPPING`
3 | Patrick – Enzo | 40:43 | 40:54 | 0 / -11 | `PLAYER_MAPPING`
3 | Stephan – Ulrich | 3:15 | 3:19 | 0 / -4 | `PLAYER_MAPPING`
3 | Joachim – Holger | 50:37 | 54:43 | -4 / -6 | `PLAYER_MAPPING`
4 | Sven – Ben | 68:56 | 74:56 | -6 / 0 | `PLAYER_MAPPING`
4 | Niklas – Patrick | 35:38 | 35:42 | 0 / -4 | `PLAYER_MAPPING`
4 | Enzo – Andy | 17:43 | 21:43 | -4 / 0 | `PLAYER_MAPPING`
4 | Benno – Bernd | 8:38 | 8:42 | 0 / -4 | `PLAYER_MAPPING`
4 | Holger – Stephan | 28:23 | 27:17 | +1 / +6 | `PLAYER_MAPPING`
5 | Bernd – Joachim | 62:-13 | 68:-13 | -6 / 0 | `PLAYER_MAPPING`
5 | Andy – Niklas | 36:20 | 36:22 | 0 / -2 | `PLAYER_MAPPING`
5 | Ben – Ulrich | 35:12 | 35:16 | 0 / -4 | `PLAYER_MAPPING`
5 | Roland – Holger | 12:45 | 12:51 | 0 / -6 | `PLAYER_MAPPING`
5 | Stephan – Reinhard | 32:22 | 20:22 | +12 / 0 | `PLAYER_MAPPING`
5 | Benno – Thomas | 1:0 | 1:-11 | 0 / +11 | `TEAM_INVALID`
6 | Holger – Ben | 31:11 | 36:11 | -5 / 0 | `PLAYER_MAPPING`
7 | Bernd – Stephan | 29:58 | 29:66 | 0 / -8 | `PLAYER_MAPPING`
7 | Thomas – Dirk | 0:-2 | -3:-2 | +3 / 0 | `TEAM_INVALID`
7 | Philipp – Sven | 28:62 | 28:66 | 0 / -4 | `PLAYER_MAPPING`
8 | Ulrich – Philipp | 6:23 | 6:30 | 0 / -7 | `PLAYER_MAPPING`
8 | Stephan – Roland | 42:23 | 50:27 | -8 / -4 | `PLAYER_MAPPING`
8 | Joachim – Ben | 9:25 | 23:25 | -14 / 0 | `PLAYER_MAPPING`
8 | Holger – Andy | 12:26 | 16:30 | -4 / -4 | `PLAYER_MAPPING`
9 | Dirk – Enzo | 29:-7 | 29:-5 | 0 / -2 | `PLAYER_MAPPING`
9 | Thomas – Niklas | 0:17 | -6:22 | +6 / -5 | `TEAM_INVALID`, `PLAYER_MAPPING`
9 | Jan – Ulrich | 8:30 | 8:36 | 0 / -6 | `PLAYER_MAPPING`
10 | Sven – Thomas | 20:0 | 20:-2 | 0 / +2 | `TEAM_INVALID`
11 | Andy – Stephan | 46:39 | 46:33 | 0 / +6 | `PLAYER_MAPPING`
11 | Dirk – Sven | 33:66 | 40:66 | -7 / 0 | `PLAYER_MAPPING`
11 | Thomas – Ulrich | 0:25 | 0:29 | 0 / -4 | `PLAYER_MAPPING`
11 | Benno – Holger | 26:15 | 26:12 | 0 / +3 | `PLAYER_MAPPING`
12 | Sven – Enzo | 25:-7 | 31:-7 | -6 / 0 | `PLAYER_MAPPING`
12 | Ben – Patrick | -8:-9 | -8:-15 | 0 / +6 | `PLAYER_MAPPING`
12 | Holger – Thomas | 33:0 | 33:-16 | 0 / +16 | `TEAM_INVALID`
13 | Bernd – Patrick | 20:42 | 20:53 | 0 / -11 | `PLAYER_MAPPING`
13 | Thomas – Reinhard | 0:21 | -3:21 | +3 / 0 | `TEAM_INVALID`
14 | Roland – Jan | 15:18 | 19:18 | -4 / 0 | `PLAYER_MAPPING`
14 | Joachim – Thomas | 29:0 | 29:-1 | 0 / +1 | `TEAM_INVALID`
14 | Holger – Enzo | 6:21 | 10:21 | -4 / 0 | `PLAYER_MAPPING`
15 | Sven – Ulrich | 35:24 | 41:24 | -6 / 0 | `PLAYER_MAPPING`
15 | Enzo – Reinhard | 32:18 | 28:18 | +4 / 0 | `PLAYER_MAPPING`
17 | Thomas – Ben | 0:36 | -2:36 | +2 / 0 | `TEAM_INVALID`
18 | Patrick – Thomas | 18:0 | 18:-19 | 0 / +19 | `TEAM_INVALID`
24 | Thomas – Dirk | 0:16 | -21:16 | +21 / 0 | `TEAM_INVALID`
25 | Ulrich – Philipp | 64:56 | 63:56 | +1 / 0 | `PLAYER_MAPPING`
26 | Thomas – Niklas | 0:28 | -3:28 | +3 / 0 | `TEAM_INVALID`
27 | Ulrich – Benno | 19:33 | 15:33 | +4 / 0 | `MISSING_RATING`

## Offizielle Abschlusstabelle

Pos. | Manager | Sp. | S | U | N | Punkte für | Punkte gegen | Diff. | Ligapunkte
---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:
1 | Andy | 34 | 24 | 0 | 10 | 1372 | 972 | 400 | 72
2 | Niklas | 34 | 24 | 0 | 10 | 1036 | 884 | 152 | 72
3 | Patrick | 34 | 23 | 0 | 11 | 1157 | 943 | 214 | 69
4 | Roland | 34 | 21 | 0 | 13 | 1228 | 983 | 245 | 63
5 | Philipp | 34 | 21 | 0 | 13 | 1231 | 1026 | 205 | 63
6 | Ben | 34 | 20 | 0 | 14 | 1112 | 991 | 121 | 60
7 | Sven | 34 | 20 | 0 | 14 | 1295 | 1191 | 104 | 60
8 | Bernd | 34 | 19 | 1 | 14 | 1207 | 934 | 273 | 58
9 | Reinhard | 34 | 19 | 0 | 15 | 1091 | 931 | 160 | 57
10 | Stephan | 34 | 17 | 0 | 17 | 1188 | 934 | 254 | 51
11 | Joachim | 34 | 17 | 0 | 17 | 1072 | 1070 | 2 | 51
12 | Enzo | 34 | 17 | 0 | 17 | 791 | 877 | -86 | 51
13 | Holger | 34 | 15 | 0 | 19 | 988 | 930 | 58 | 45
14 | Jan | 34 | 15 | 0 | 19 | 865 | 1035 | -170 | 45
15 | Ulrich | 34 | 13 | 1 | 20 | 647 | 844 | -197 | 40
16 | Dirk | 34 | 10 | 0 | 24 | 640 | 978 | -338 | 30
17 | Benno | 34 | 9 | 0 | 25 | 565 | 921 | -356 | 27
18 | Thomas | 34 | 1 | 0 | 33 | 0 | 1041 | -1041 | 3
