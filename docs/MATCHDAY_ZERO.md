# Matchday Zero

## Purpose

Matchday Zero is the first BMS matchday intended to run entirely from the Living
Database:

- Player Master
- ManagerSeason
- SquadAssignments
- Living Fixtures
- PlayerMatchData

No historical results, league table points or fixture scores are imported.

## Boundary

The calculation boundary is:

```text
Admin Matchday Selector
↓
Admin Data Entry
↓
PlayerMatchData
↓
MatchdayZeroService
↓
processOfficialMatchday()
↓
MatchResult + LeagueTableSnapshot + MatchdayLifecycle
```

`MatchdayZeroService` prepares the existing domain-engine input from Prisma. It
does not change the Lineup Engine, Match Result Engine, Rules Engine or Official
Matchday processor.

## Data Entry

`/admin/matchday/data-entry?matchday=N` loads the relevant player pool from
active Liga-1 SquadAssignments for the selected matchday. Players are unique by
`Player.id`, with a manager count showing how many manager squads contain that
player.

Players with status `LEFT_BUNDESLIGA` are hidden. The working list can be
filtered by Bundesliga club and is sorted by club, position (`TW`, `AB`, `MF`,
`ST`) and player name.

The page writes only `PlayerMatchData`:

- rating
- goals
- yellow-red card
- red card
- team of the week
- source `ADMIN`

Empty ratings are valid input. They remain explicit admin input and are not
filled with dummy values.

## Calculation

`/admin/matchday/calculate?matchday=N` blocks until all relevant players have
`PlayerMatchData` for the selected matchday.

When complete, calculation uses:

- 9 Liga-1 fixtures for the selected matchday,
- active Liga-1 manager squads,
- the previous matchday table snapshot,
- stored AppliedRules for the selected matchday,
- no manual penalties unless they exist as explicit persisted rule data.

The service calls `processOfficialMatchday()` and persists:

- `MatchResult` rows,
- `Fixture.status = OFFICIAL`,
- `LeagueTableSnapshot` for matchday 1,
- `MatchdayLifecycle`,
- `MatchdayVersion`,
- official matchday JSON,
- generated match-analysis JSON inside the match result audit payload.

Calculation now leaves the operative lifecycle at `CALCULATED`. Preliminary
publication, malus confirmation, correction confirmation and official close are
separate administrative lifecycle steps.

## Workflow Completion

The weekly process is:

1. Select the operative matchday in `/admin/matchday`.
2. Enter PlayerMatchData.
3. Run calculation.
4. Publish preliminary state.
5. Confirm manual/malus review.
6. Confirm corrections complete.
7. Close the matchday officially.

Closing a matchday officially does not recalculate scores. It marks the
Lifecycle as closed and makes the next not-closed matchday operative.

## Golden Reference

Golden-reference comparison is intentionally report-only. Differences must be
reported and must not trigger automatic engine changes.

At the current state, no Matchday-1 Golden Reference source is wired into the
Living pipeline. The calculation remains blocked until PlayerMatchData exists;
after calculation, the comparison step must compare the official result against
the Matchday-1 reference only.

## Current Blocker

The Living database currently has Liga-1 fixtures, managers, squads and table
snapshot 0. Matchday 1 still requires PlayerMatchData entry before calculation.

The calculation page reports missing PlayerMatchData and disables the final
calculation button rather than inventing scores or importing historical results.
