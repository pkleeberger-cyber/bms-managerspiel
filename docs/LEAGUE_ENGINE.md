# BMS League Table Engine

## Purpose

The League Table Engine processes the official match results of one matchday and returns a new, sorted league table. It is pure domain logic in `app/domain/league-engine/` with no UI, React, database access, external APIs, or mutation of historical input.

## Relationship to other engines

The engine consumes `MatchResult` objects produced by the Match Result Engine.

- The Lineup Engine calculates historical squads and final team points.
- The Match Result Engine converts two calculated teams into fantasy goals and league points.
- The League Table Engine aggregates those official match results into standings.

It does not recalculate lineups, scoring, winners, or penalties.

## Input

`calculateLeagueTable()` receives:

- `previousLeagueTable`;
- all `matchResults` for one matchday;
- `competitionId`;
- `matchday`.

The previous table is also the authoritative registry for team and manager metadata. Every manager in the supplied matches must already exist in that table.

Rows without a previous `position` are supported for initial or newly registered standings and receive position change `new`.

## Updated row

Each output row contains:

- `position`;
- `previousPosition`;
- `positionChange`;
- `managerId`;
- `teamId`;
- `teamName`;
- `managerName`;
- `matchesPlayed`;
- `wins`;
- `draws`;
- `losses`;
- `fantasyGoalsFor`;
- `fantasyGoalsAgainst`;
- `fantasyGoalDifference`;
- `leaguePoints`;
- `formLastFive`.

## Match aggregation

For each participating team:

- matches played increase by one;
- wins, draws, or losses increase from the official result;
- league points are added using `3 / 1 / 0`;
- fantasy goals for and against are added;
- goal difference is recalculated as goals for minus goals against;
- the new result is appended to form.

Negative fantasy goals are added normally. A result such as `30:-12` or `-5:-5` is valid.

## Sorting

The updated table uses this deterministic order:

1. league points descending;
2. fantasy goal difference descending;
3. fantasy goals for descending;
4. team name ascending.

Team-name comparison uses direct string ordering so the result does not depend on runtime locale settings.

## Position change

After sorting, each row compares its new position with its previous position:

- `up`: the new position number is lower;
- `down`: the new position number is higher;
- `unchanged`: both positions are equal;
- `new`: no previous position existed.

## Form

Form values are:

- `W`: win;
- `D`: draw;
- `L`: loss.

The newest result is appended. Only the latest five entries remain.

## Historical stability

The engine creates new row and form arrays before applying results. The supplied previous table and its nested form arrays are never modified.

The engine also rejects:

- duplicate manager IDs;
- duplicate team IDs;
- unknown managers in match results;
- competition or matchday mismatches;
- a manager appearing in multiple matches on one matchday.

## Invalid teams

This sprint accepts only valid `MatchResult` objects.

Invalid-team matchday penalty handling remains a deliberate TODO in the engine until the final competition penalty rule is confirmed. No fallback result or penalty is invented here.

## Output

`UpdatedLeagueTable` contains:

- `competitionId`;
- `matchday`;
- newly sorted `rows`.

## Fixture

`app/domain/league-engine/fixture.ts` contains six previous table rows and three match results.

It demonstrates:

- a former second-place team moving to first;
- updated 3/1/0 league points;
- updated fantasy goals and goal differences;
- a valid `-5:-5` result;
- tie-break sorting between equal-point teams;
- up, down, and unchanged positions;
- latest-five form trimming;
- unchanged previous input.
