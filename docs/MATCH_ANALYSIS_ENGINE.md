# Match Analysis Engine

## Purpose

The Match Analysis Engine creates one transparent, structured `MatchAnalysis`
for a finished fixture. It is pure domain logic and contains no UI or narrative
generation.

The engine never scores a player, recalculates a lineup, reapplies a rule, or
reads current squad data. Its only historical source is an
`OfficialMatchdayResult` produced by the Official Matchday Processor.

## Pipeline

```text
OfficialMatchdayResult + fixtureId
                    ↓
       Historical fixture lookup
                    ↓
    Player comparisons by occupied
         official starter slot
                    ↓
 Position analysis from stored totals
                    ↓
 Winners and structured match factors
                    ↓
             MatchAnalysis
```

## Input

Call:

```ts
createMatchAnalysis(officialMatchdayResult, fixtureId)
```

`fixtureId` selects a fixture inside the supplied snapshot. It contributes no
match data.

The engine joins two records that already exist in the canonical result:

- `officialResults` supplies the published score, outcome, winner, league
  points, and match-level rule IDs;
- `calculatedMatchday.calculatedLineups` supplies the immutable evaluated
  players, occupied slots, replacements, point breakdowns, position totals,
  missing positions, and mathematical manual penalties.

Team and manager names come from the official league table in the same
snapshot. Applied rule definitions and audit entries come from the same
snapshot as well.

An unknown fixture, missing official result, skipped lineup, duplicate occupied
slot, or missing official team row throws `MatchAnalysisError`. The engine does
not invent missing historical data.

## Player Comparison

The engine emits one comparison for each official starter slot:

```text
1, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16
```

Players are indexed by `evaluatedForLineupId`, not by their squad source slot.
Therefore, a backup from slot `6` that occupied starter slot `3` is compared in
the `3 vs 3` duel.

Each comparison exposes:

- occupied `slotId`;
- complete home and away player records, or `null` for a missing position;
- `HOME`, `AWAY`, or `TIED`;
- signed `pointDifference` (`home - away`).

A missing player contributes no stored player points to the comparison. Every
player record exposes the source slot, name, position, rating, goals,
Yellow-Red and Red flags, Team of the Week status, all five stored point
components, total points, replacement status, and automatic-rating status.

## Position Analysis

Goalkeeper, defence, midfield, and attack duels use the stored
`positionTotals`. For each line, `MatchAnalysis` exposes:

- home points;
- away points;
- signed difference (`home - away`);
- winner.

No player points are summed again.

## Match Winners

The result contains:

- best and worst player for each team;
- overall matchwinner across both team best players;
- biggest individual slot duel.

Input order resolves equal best, worst, or biggest-duel values
deterministically. An exact tie between both team best players produces no
overall matchwinner.

## Match Factors

Structured factors include:

- largest home position advantage;
- largest home position disadvantage;
- highest and lowest scoring team line;
- replacement-player count;
- missing starter slots with side and position;
- applicable rules with their audit entries;
- mathematical manual penalties with their team side.

Factors contain values only. Natural-language match stories are outside this
engine.

## Output

`MatchAnalysis` is sufficient to render a match-analysis view:

- snapshot identity and timestamps;
- home and away team identity;
- calculated and official scores, official outcome, and winner;
- all evaluated player details;
- all slot and position comparisons;
- match winners;
- all structured factors.

Consumers do not need lineup, match, scoring, or rules engines after receiving
this object.

## Historical Stability

Analysis is a deterministic projection of one `OfficialMatchdayResult`.
`createMatchAnalysis()` does not mutate that result and has no access to current
players, squads, ratings, rules, or tables. Persisting the official snapshot
therefore keeps old analyses stable.

`app/domain/match-analysis-engine/fixture.ts` uses the validated historical
Excel match `Thomas 0:28 Ben`. It verifies official-slot comparisons, position
totals, matchwinner selection, replacement accounting, the
`TEAM_INVALID` rule and its `13 → 0` audit, official score preservation, and
input immutability.
