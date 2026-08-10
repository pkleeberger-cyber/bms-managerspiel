# Golden Final Verification – Liga 1

## Pipeline

```text
Golden Reference
        ↓
Calculation Engine
        ↓
Rules Engine
        ↓
Official Matchday
        ↓
Official League Table
        ↓
Verification
```

## Ergebnis

Kennzahl | Wert
--- | ---:
Fixtures verarbeitet | 306
Exakte Matches | 298
Verbleibende Differenzen | 8
Verbleibende Score-Differenz | 59
TEAM_INVALID angewendet | 34
TEAM_PENALTY angewendet | 53
POINT_ADJUSTMENT angewendet | 72

## Verbleibende Kategorien

Kategorie | Manager-Ergebnisse | Absolute Differenz
--- | ---: | ---:
TEAM_INVALID | 0 | 0
MANUAL_PENALTY | 0 | 0
POINT_ADJUSTMENT | 0 | 0
PLAYER_MAPPING | 5 | 43
MISSING_RATING | 3 | 16
UNKNOWN | 0 | 0

## Datenqualitätsgrenze

`PLAYER_MAPPING`, `MISSING_RATING` und `UNKNOWN` werden nicht als Regeln angewendet.
