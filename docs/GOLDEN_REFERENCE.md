# Golden Reference Season

## Zweck

Die Golden Reference ist der eingefrorene historische Saisonstand für Liga 1.
Sie ersetzt die bisherige mutable Referenzdatei als fachliche Wahrheit für
historische Validierungen.

## Grundsatz

Die Golden Reference wird nicht an die Engine angepasst. Wenn Engine und
Golden Reference auseinanderlaufen, wird die Differenz klassifiziert und
berichtet. Engine-Änderungen sind in diesem Sprint ausdrücklich ausgeschlossen.

## Pipeline

```text
Golden Workbook
        ↓
Historischer Kader + Spieltagswerte
        ↓
Lineup Engine
        ↓
Match Result Engine
        ↓
League Engine
        ↓
Rules Engine Kandidaten
        ↓
Golden Verification Reports
```

## Reports

Die Golden-Berichte liegen getrennt von den bisherigen Referenzreports:

- `reports/golden-reference/verification.json`
- `reports/golden-reference/verification.md`
- `reports/golden-reference/difference-audit.json`
- `reports/golden-reference/difference-audit.md`
- `reports/golden-reference/rule-candidates.json`
- `reports/golden-reference/rule-candidates.md`
- `reports/golden-reference/final-verification.json`
- `reports/golden-reference/final-verification.md`
- `reports/golden-reference/remaining-differences.json`
- `reports/golden-reference/remaining-differences.md`

## Vergleich zur bisherigen Referenz

Der Golden-Verifikationsreport enthält einen Vergleich gegen
`reports/reference-season/`. Berichtet werden:

- Differenzanzahl
- Kategorienanzahl
- `TEAM_INVALID`
- `TEAM_PENALTY`
- `POINT_ADJUSTMENT`
- `PLAYER_MAPPING`
- `MISSING_RATING`
- `UNKNOWN`

## Grenzen

Es gibt keine Datenbank-Schreibvorgänge. Rule Candidates sind reviewbare
Vorschläge und werden nicht automatisch angewendet. Mapping- und Rating-Fälle
bleiben Datenqualitätsprobleme und werden nicht in Regeln umgewandelt.

## Validated Golden Season

Die finale Golden-Verifikation nimmt alle Golden Rule Candidates als reviewed
historical rules an und führt die Saison erneut durch die bestehende Pipeline:

```text
Calculation
        ↓
Rules
        ↓
Official Season
        ↓
Verification
```

Angewendet werden ausschließlich:

- `TEAM_INVALID`
- `TEAM_PENALTY`
- `POINT_ADJUSTMENT`

Nicht angewendet werden:

- `PLAYER_MAPPING`
- `MISSING_RATING`
- `UNKNOWN`

Diese ausgeschlossenen Kategorien bleiben als Datenqualitätsgrenze in
`remaining-differences.*` sichtbar. Wenn nach Anwendung der reviewed rules noch
`TEAM_INVALID`, `TEAM_PENALTY` oder `POINT_ADJUSTMENT` verbleibt, ist das ein
Hinweis auf eine Kandidaten- oder Quellwertabweichung, nicht auf eine Änderung
der Calculation Engines.
