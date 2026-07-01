# BMS Excel Reality Test

## Purpose

The Excel reality fixture validates the Lineup Engine against the real structure of `Test_Auswertung.xlsx` without introducing a production Excel importer.

The workbook remains external test input. Normalized rows extracted from its `Auswertung` and `Kader` sheets are stored in:

`app/domain/lineup-engine/excel-reality.fixture.ts`

Reusable mapping logic is stored in:

`app/domain/lineup-engine/excel-fixture-mapper.ts`

No core engine rules were changed.

## Workbook sheets

### Auswertung

| Column | Meaning |
| --- | --- |
| A | Bundesliga club |
| B | Player name |
| C | Position code |
| D | Kicker rating |
| E | Yellow-red card |
| F | Red card |
| G | Goals |
| H | Team of the Week |
| I | Old Excel points |

Position codes map as follows:

- `t` → goalkeeper;
- `a` → defender;
- `m` → midfielder;
- `s` → forward.

Rating `0` or an empty rating is mapped to `null`. Card and Team of the Week cells are normalized to booleans. Goals remain non-negative integers.

### Kader

| Column | Meaning |
| --- | --- |
| A | Global workbook row ID |
| B | Manager |
| C | Position |
| D | Player name |

## Why `_id` is not `slotId`

The workbook `_id` is a global sequence across all managers.

Patrick's first Kader row has `_id = 235`, but it is his first row and therefore official lineup slot `1`. His eighteenth row has `_id = 252`, but it becomes slot `18`.

The mapper groups rows by manager and preserves their workbook order. Within each manager block:

`slotId = row index + 1`

The mapper requires exactly 18 rows and validates every derived slot against the official BMS position structure. It does not derive a slot from column A.

## Kader mapping

Each normalized Kader row becomes a `ManagerSquadAssignment` with:

- a deterministic fixture manager ID;
- a temporary fixture player ID;
- the derived official slot ID;
- matchday 1 validity;
- reason `INITIAL_SQUAD`.

Player matching currently uses exact `playerName` values.

The mapper contains an explicit TODO: production import must resolve stable player IDs. Name matching is not safe for spelling changes, abbreviations, duplicates, or transfers.

## Auswertung mapping

Each normalized Auswertung row becomes:

- `PlayerMatchData` for the Lineup Engine;
- club and position-code source metadata;
- `oldExcelPoints` for comparison.

The fixture joins Kader and Auswertung rows through the temporary name-derived player ID.

## Appearance bonus verification

The current Lineup Engine awards:

`+1 appearance point`

The old workbook values in this sample use the same rule:

`+1 appearance point`

The reality fixture returns:

- `calculatedNewPoints`;
- `oldExcelPoints`;
- `difference`.

All three evaluated Patrick players now match exactly:

| Player | New points | Old Excel | Difference |
| --- | ---: | ---: | ---: |
| Grimaldo | 5 | 5 | 0 |
| Olise | 1 | 1 | 0 |
| Baumgartner | -1 | -1 | 0 |

The resulting current BMS team total is `5`.

## Real workbook result

The Patrick Kader block contains all 18 official slots. In the supplied Auswertung sheet, only three matching Patrick players have valid ratings:

- Grimaldo;
- Olise;
- Baumgartner.

No same-position backups have valid evaluation data for the remaining starter slots.

The real Lineup Engine result is therefore:

- requested starter slots: `11`;
- evaluated players: `3`;
- replacements used: `0`;
- missing positions: `8`;
- team total: `5`.

The workbook does not contain enough rated Patrick players to produce eleven evaluated players. The fixture intentionally preserves that real result instead of fabricating ratings. `starterSlotAudit` still returns all eleven starter-slot outcomes as either `EVALUATED` or `MISSING`.

A scan of all 24 manager blocks found a maximum of three evaluated players for this workbook state, so switching managers would not produce an eleven-player result.

## Fixture output

`excelRealityFixtureResult` contains:

- manager and workbook metadata;
- evaluated players;
- evaluated player count;
- all eleven starter-slot audit entries;
- replacements used;
- missing starter positions;
- per-player old/new point comparison;
- current BMS team total.

## Current limitations

- The repository does not include a production-grade XLSX parser.
- Workbook OOXML was decoded for this deterministic normalized fixture.
- The binary workbook is not imported by application runtime code.
- Player matching is name-based.
- Only one manager block is encoded.
- Exact spelling and capitalization matter.
- Empty or zero ratings are treated as no rating.
- The supplied workbook state cannot produce eleven evaluated players.
- Formula recalculation and production validation are outside this sprint.

## Full Matchday Snapshot Verification

### Reference workbook

`Test_Auswertung2.xlsx` is treated as one immutable, completed matchday snapshot.

The workbook contains one sheet, `Tabelle1`, with 432 data rows:

- 24 managers;
- 18 rows per manager;
- matchday 34;
- official lineup slots 1 through 18.

This second fixture is independent from the earlier two-sheet mapping. It verifies the complete historical matchday rather than reconstructing a squad from separate `Kader` and `Auswertung` sheets.

### Snapshot columns

| Column | Header | Mapping |
| --- | --- | --- |
| A | `spieltag` | Matchday number |
| B | `manager` | Manager group |
| C | `position` | BMS position validation |
| D | `spieler` | Player name |
| E | `verein` | Bundesliga club audit data |
| F | `note` | Kicker rating |
| G | `gelbRot` | Yellow-red card |
| H | `rot` | Red card |
| I | `tor` | Goals |
| J | `kickerelf` | Team of the Week |
| K | `punkte` | Old Excel points |
| L | `spielernr` | Official BMS lineup slot |

### Direct `spielernr` mapping

For `Test_Auswertung2.xlsx`, column L is authoritative.

`spielernr` maps directly to official BMS lineup slot `1–18`.

The adapter does **not** derive slots from row order. It validates:

- every value is an integer from 1 through 18;
- every manager contains each slot exactly once;
- the row position matches the official position for that slot;
- all 18 rows for a manager belong to one matchday.

This differs intentionally from the earlier `Test_Auswertung.xlsx` workbook, where `_id` was only a global row ID and slot had to be derived from manager-local row order.

### Fixture-only workbook extraction

`app/domain/lineup-engine/excel-matchday-snapshot.mapper.ts` contains a lightweight OOXML extractor for this reality fixture.

It reads:

- `xl/sharedStrings.xml`;
- `xl/worksheets/sheet1.xml`.

The extractor invokes the local `unzip` command and validates the expected A–L headers. It is not a production import pipeline and is not used by application runtime code.

### Manager processing

Rows are grouped by manager. For each manager, the fixture:

1. builds 18 historical `ManagerSquadAssignment` records using `spielernr`;
2. maps all 18 rows to `PlayerMatchData`;
3. runs the unchanged Lineup Engine;
4. records evaluated players, replacements, and missing positions;
5. compares every evaluated player's current points with column K;
6. compares the current team total with the summed old Excel total.

Temporary fixture player IDs are scoped by manager and slot. Production import still requires stable persisted player IDs.

### Audit report

`app/domain/lineup-engine/excel-matchday-reality.fixture.ts` exports `excelMatchdayAuditReport`.

Each manager entry contains:

- `managerName`;
- `evaluatedPlayerCount`;
- `missingPositions`;
- `replacementsUsed`;
- `engineTotal`;
- `oldExcelTotal`;
- `difference`;
- per-player slot, name, current points, old points, and difference.

The report summary contains:

- managers processed;
- managers with perfect totals;
- managers with differences;
- total point difference;
- likely appearance-bonus difference count.

### Verified snapshot result

All 24 managers are processed successfully.

The old workbook and current Lineup Engine both use an appearance bonus of `+1`. Consequently:

- managers processed: `24`;
- managers with perfect match: `24`;
- managers with differences: `0`;
- total difference: `0`;
- likely appearance-bonus differences: `0`.

Every evaluated player matches its old Excel value. For every manager:

`manager difference = 0`

This confirms that the corrected appearance rule reproduces the complete historical snapshot without changing any other scoring component.

### Goal and limitations

The full snapshot fixture exists for deterministic verification only.

It does not provide:

- production file upload;
- persistent player resolution;
- formula recalculation;
- workbook version migration;
- database writes;
- UI reporting.
