# Living Fixtures

## Purpose

Liga 1 fixtures are the first persisted schedule for the fresh calculated
season. The import creates only the future schedule and an empty matchday-0
table baseline.

It does not import:

- historical match results;
- official or calculated goals;
- league table points;
- historical standings;
- player or manager points.

## Import Boundary

The importer is `npm run import:liga1-fixtures -- --workbook /path/to/file.xlsx`.

It reads only the Liga 1 schedule sheet and only these source fields:

- `Spieltag`;
- `Heim` or `Heim_Manager`;
- `Auswärts`, `Auswaerts`, `Auswärts_Manager` or `Auswaerts_Manager`.

Result columns are ignored even when they exist in the workbook.

## Validation

The import fails before writing unless all checks pass:

- exactly 34 matchdays;
- exactly 9 fixtures per matchday;
- exactly 306 fixtures total;
- every home and away manager resolves to an active Liga 1 `ManagerSeason`;
- every fixture has home and away manager names;
- no duplicate home/away pairing within a matchday.

The importer upserts the active-season `LEAGUE_1` competition as `Erste Liga`,
creates or updates one `Team` per active Liga 1 manager, replaces the
competition's existing fixtures, and creates all fixtures with
`status = SCHEDULED`.

## Empty Table

The import writes `LeagueTableSnapshot` for `matchday = 0`.

Every Liga 1 manager starts with:

- 0 games;
- 0 wins, draws and losses;
- 0 goals for and against;
- 0 points;
- 0 movement.

This table is a starting state only. It is not a calculated table and contains
no historical results.

## UI Reads

`Wettbewerbe -> Erste Liga` reads persisted Liga 1 fixtures when available. It
defaults to the latest published matchday with visible results. It must not use
the next scheduled matchday as the default result view.

The page exposes matchday history from `ST 0` to `ST 34`:

- `ST 0` shows the empty starting table.
- Published matchdays show their fixtures, results and accumulated table.
- Calculated but unpublished matchdays stay hidden from manager-facing result
  views.
- Future matchdays can show scheduled fixtures, but no result table state.

`Mein Team -> Spiele` reads the selected `managerSeasonId`, resolves the
manager's season team, and lists the manager's persisted fixtures. All rows stay
unscored until the matchday calculation pipeline writes and publishes results.

`/admin/matchday` uses persisted scheduled fixtures to identify the next
operational matchday when no calculated matchday lifecycle exists yet.

## Calculation Boundary

No engine behavior changes in this step. Matchday calculation, result
persistence, applied rules and table updates remain future work.

## Accumulated Table Snapshots

`LeagueTableSnapshot` is stored per matchday and is accumulated:

- `matchday = 0`: empty starting table.
- `matchday = 1`: table after ST1.
- `matchday = 2`: table after ST1 plus ST2.
- `matchday = X`: table after all published results from ST1 through STX.

When a matchday is preliminarily published, the application rebuilds the
accumulated table snapshot for that matchday from persisted published
`MatchResult` rows. If a published matchday is corrected or republished, the
table snapshot for that matchday and all following published snapshots are
rebuilt from the persisted results. This is table-history maintenance only; it
does not change the scoring engine.
