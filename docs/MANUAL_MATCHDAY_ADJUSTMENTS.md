# Manual Matchday Adjustments

Manual Matchday Adjustments are administrative corrections applied after the
Living DB matchday calculation. They do not change the scoring engine and they
do not overwrite the raw engine result.

## Data Model

`ManualMatchdayAdjustment`

- `seasonId`
- `competitionId`
- `matchday`
- `managerSeasonId`
- `type`: `TEAM_PENALTY`, `POINT_ADJUSTMENT`, `BONUS`, `OTHER`
- `points`: positive or negative integer
- `reason`
- `createdAt`
- `createdBy`
- `status`: `ACTIVE` or `VOIDED`

Voiding keeps the row for audit history. Only `ACTIVE` adjustments are used for
published final scores.

## Score Rule

The engine score remains stored in `MatchResult.calculatedHomeGoals` and
`MatchResult.calculatedAwayGoals`.

The published score is recalculated as:

```text
final score = engine score + sum(active manual adjustments)
```

The final score is written to `MatchResult.officialHomeGoals` and
`MatchResult.officialAwayGoals`.

## Re-Publish Flow

When an adjustment is added or voided from `/admin/matchday/review`:

1. The adjustment row is written or marked `VOIDED`.
2. All affected fixture `MatchResult.official*` scores are recalculated from
   `calculated*` plus active adjustments.
3. `MatchResult.auditJson.manualAdjustments` is updated.
4. Persisted `matchAnalysis` receives updated official score and manual
   adjustment entries.
5. The league table snapshot for the matchday is recalculated from final
   published scores.
6. Competition and team routes are revalidated.

## UI

`/admin/matchday/review` contains the Malus-Rechner:

- add adjustment
- select manager
- select type
- enter positive or negative points
- enter reason
- void active adjustment
- compare engine score, manual adjustment, and final score

The match analysis page shows manual adjustments separately and keeps raw debug
data collapsed.

## Boundary

This feature is a presentation and persistence layer around the official
published result. It does not modify scoring, lineup resolution, rules engine,
or matchday engine behavior.
