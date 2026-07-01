# BMS Match Calculation Engine

## Purpose

The Lineup Engine is the deterministic foundation for BMS match results, analysis, tables, events, history, and records. It resolves the historically valid squad, selects the evaluated eleven, calculates player points, and applies matchday penalties.

The domain module is located in `app/domain/lineup-engine/`. It has no React, database, external API, randomness, AI, or competition-specific behavior.

## Official lineup IDs

Lineup IDs are permanent game rules and define position, starter status, and replacement priority.

| ID | Role |
| --- | --- |
| 1 | Goalkeeper starter |
| 2 | Goalkeeper backup |
| 3–5 | Defender starters |
| 6–7 | Defender backups |
| 8–12 | Midfielder starters |
| 13–14 | Midfielder backups |
| 15–16 | Forward starters |
| 17–18 | Forward backups |

The eleven starter slots are evaluated in this fixed order:

`1, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16`

## Historical squad assignments

`ManagerSquadAssignment` records which player owned a slot during an inclusive matchday range:

- `managerId`
- `competitionId`
- `playerId`
- `playerName`
- `slotId`
- `validFromMatchday`
- `validToMatchday`
- `reason`

Supported reasons are:

- `INITIAL_SQUAD`
- `REAL_TRANSFER_REPLACEMENT`
- `WINTER_TRANSFER`
- `ADMIN_CORRECTION`

`validToMatchday: null` means that the assignment remains active indefinitely.

Historical assignments are immutable engine input. A later replacement creates a new assignment period instead of changing the previous assignment. For example:

- Player A owns slot 8 from matchday 1 through 3.
- Player B owns slot 8 from matchday 4 onward.
- Recalculating matchday 2 always resolves Player A.
- Calculating matchday 7 resolves Player B.

Match data is linked by `playerId`, never by the player's current slot. This prevents current squad changes from rewriting historical evaluations.

## Effective squad resolution

`getEffectiveSquad()` is called before scoring. It filters assignments by manager, competition, and requested matchday.

The resolver requires:

- exactly one active assignment for every official slot from 1 through 18;
- no overlapping assignments for the same slot on the requested matchday;
- no missing slot;
- no player occupying multiple slots;
- valid inclusive matchday ranges.

Invalid historical data throws `SquadResolutionError`. The engine never guesses which assignment should win.

## Replacement logic

Each starter is checked in official starter order.

1. An eligible starter keeps the slot.
2. An unavailable starter searches only backups in the same position group.
3. The eligible backup with the lowest lineup ID is selected first.
4. A backup can replace only one starter.
5. If no eligible backup remains, the starter position stays empty.

Replacement chains are:

- Goalkeeper: `1 → 2`
- Defender: each of `3, 4, 5 → 6 → 7`
- Midfielder: each of `8, 9, 10, 11, 12 → 13 → 14`
- Forward: each of `15, 16 → 17 → 18`

Cross-position replacements are never allowed. A missing replacement does not invalidate the whole team; it increases `unevaluatedPositions`.

## Player eligibility

A player is evaluated when:

- a valid Kicker rating from `1.0` through `6.0` in `0.5` increments exists;
- the player receives a direct red card without a rating; or
- the player scores a goal without a rating.

The two special cases receive automatic rating `3.5`. This creates zero rating points while preserving appearance, goal, red-card, and Team of the Week scoring.

A player without a valid rating, direct red card, or goal is `NOT PLAYED`.

## Official scoring

### Rating points

| Rating | Points | Rating | Points |
| --- | ---: | --- | ---: |
| 1.0 | +10 | 3.5 | 0 |
| 1.5 | +8 | 4.0 | -2 |
| 2.0 | +6 | 4.5 | -4 |
| 2.5 | +4 | 5.0 | -6 |
| 3.0 | +2 | 5.5 | -8 |
| 6.0 | -10 |  |  |

### Additional points

- Appearance: `+1`
- Goalkeeper goal: `+6`
- Defender goal: `+5`
- Midfielder goal: `+4`
- Forward goal: `+3`
- Yellow-red card: `-3`
- Direct red card: `-6`
- Team of the Week: `+2`

Player total:

`rating + appearance + goals + cards + team of the week`

Negative totals are valid.

## Team totals

The engine calculates player totals for:

- goalkeeper;
- defence;
- midfield;
- attack.

`playerPoints` is the sum of all four position totals.

## Team validity

Team validity is independent of missing individual players:

- `VALID`: calculate the resolved squad normally.
- `INVALID`: return `SKIPPED_INVALID_TEAM` without player, replacement, statistic, or team-point calculation.

An invalid team represents no valid squad submission before the official deadline. The later competition layer can assign the matchday's worst result. The Lineup Engine does not invent that competition-specific result.

The invalid result uses `team: null`, so callers cannot accidentally interpret it as a valid zero-point result.

## Manual matchday penalties

`ManagerMatchdayPenalty` supports:

- manager and competition scope;
- inclusive matchday validity;
- positive or negative point adjustments;
- a required reason;
- an optional affected slot.

Multiple active penalties are added together.

Final team total:

`playerPoints + manualPenaltyPoints`

Penalties do not change position totals or player scores. An affected slot is audit information only.

## Statistics

Calculated valid teams return:

- best player;
- worst player;
- strongest position group;
- weakest position group;
- number of replaced starters;
- number of unevaluated starter positions.

Player ties use the lower lineup ID. Position-group ties use goalkeeper, defence, midfield, attack order.

## Calculation flow

`calculateMatchLineup()` performs these deterministic steps:

1. Resolve the effective historical 18-player squad.
2. Resolve all applicable manual penalties.
3. Stop with `SKIPPED_INVALID_TEAM` when team validity is `INVALID`.
4. Evaluate starters in official lineup order.
5. Resolve same-position backups by ascending lineup ID.
6. Calculate each evaluated player's point breakdown.
7. Calculate position totals and player points.
8. Add all manual penalties.
9. Calculate analysis statistics.
10. Return `MatchLineupResult`.

Competition-specific rules for league, second league, cup, European cup, and Supercup remain outside this domain module.

## Comprehensive fixture

`app/domain/lineup-engine/fixture.ts` includes:

- historical slot 8 ownership changing after matchday 3;
- all 18 effective lineup positions;
- missing starters;
- same-position backup replacements;
- a goal without rating;
- a direct red card without rating;
- a yellow-red card;
- Team of the Week;
- two simultaneous manual penalties;
- valid calculations for matchdays 2 and 7;
- an invalid-team result.

The fixture proves:

- matchday 2 continues to use the original slot 8 player;
- matchday 7 uses the replacement player;
- eleven players are evaluated;
- lower backup IDs win replacement priority;
- player points total `55`;
- penalties total `-3`;
- final team points total `52`;
- invalid teams are not calculated normally.
