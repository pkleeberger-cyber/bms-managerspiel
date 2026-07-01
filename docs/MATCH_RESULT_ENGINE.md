# BMS Match Result Engine

## Purpose

The Match Result Engine combines two completed Lineup Engine results into one official BMS match result. It determines fantasy goals, winner, league points, goal differences, position comparisons, and match-wide top performers.

The engine is pure domain logic in `app/domain/match-engine/`. It has no UI, React, database access, external API, randomness, or competition-specific table mutation.

## Relationship to the Lineup Engine

The Lineup Engine remains responsible for:

- resolving historical squads;
- selecting evaluated players;
- calculating player and position points;
- applying manual penalties;
- producing final team points.

The Match Result Engine does not recalculate players. It treats each calculated lineup's final `team.totalPoints` as fantasy goals.

Only results with `calculationStatus: "CALCULATED"` can enter a match. An `INVALID` lineup result is rejected with `MatchCalculationError`. Assignment of a matchday's worst result remains future competition logic and is not invented by this engine.

## Input

`calculateMatchResult()` receives:

- `homeTeam`: calculated home `MatchLineupResult`;
- `awayTeam`: calculated away `MatchLineupResult`;
- `competitionId`;
- `matchday`.

Both lineup results must belong to the requested competition and matchday.

## Calculation flow

1. Validate that both lineup results were calculated.
2. Validate competition and matchday consistency.
3. Read home and away final team points as fantasy goals.
4. Compare fantasy goals to determine home win, draw, or away win.
5. Assign league points.
6. Calculate goals for, goals against, and goal difference for both teams.
7. Subtract away position totals from home position totals.
8. Compare all evaluated players across both teams.
9. Compare all eight team-position lines.
10. Return `MatchResult`.

## Result and league points

| Outcome | Home points | Away points |
| --- | ---: | ---: |
| Home win | 3 | 0 |
| Draw | 1 | 1 |
| Away win | 0 | 3 |

Negative fantasy goals are valid because negative Lineup Engine totals are valid.

## Fantasy goals and goal difference

For each team:

- `fantasyGoalsFor`: own final team points;
- `fantasyGoalsAgainst`: opponent final team points;
- `fantasyGoalDifference`: goals for minus goals against.

The home and away goal differences are exact opposites.

## Position comparison

Position comparison is always expressed from the home team's perspective:

`home position points - away position points`

It returns numeric differences for:

- goalkeeper;
- defence;
- midfield;
- attack.

Manual penalties affect final fantasy goals but do not belong to a position group. Position differences therefore do not have to sum to the final fantasy-goal difference.

## Top performers

The result contains:

- best player of the match;
- worst player of the match;
- best team line;
- worst team line;
- highest-scoring team;
- lowest-scoring team.

Player ties prefer the home team, then the lower lineup ID. Team-line ties prefer the home team, then the official position order. Equal team totals return `TIED` for both highest- and lowest-scoring team.

## Output

`MatchResult` contains:

- competition and matchday;
- outcome and winner;
- home and away fantasy goals;
- home and away league points;
- per-team goals for, goals against, and goal difference;
- position comparison;
- top performers.

No explanations or generated stories are part of this output.

## Fixture

`app/domain/match-engine/fixture.ts` derives both teams from the existing Lineup Engine fixture.

- Home final team points: `52`
- Away final team points: `43`
- Result: home win
- League points: `3 : 0`
- Goal difference: `+9 / -9`
- Position differences: goalkeeper `0`, defence `0`, midfield `+8`, attack `+4`

The fixture also verifies best and worst players plus highest- and lowest-scoring teams.
