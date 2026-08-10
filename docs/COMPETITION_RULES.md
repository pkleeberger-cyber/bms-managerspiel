# Competition Rules

## Purpose

This document records the competition modes that the domain layer must support.
It distinguishes confirmed structural rules from scoring rules that still need
confirmation.

Competition-specific scoring behavior is supplied to the Lineup Engine through
`CompetitionScoringConfig`. The engine does not inspect competition names,
round numbers, or tournament modes.

## Erste Liga

Mode: normal league.

- Every team plays through the configured league schedule.
- Official match results update the league table.
- Standard league points, form, position changes, events, tension zones, and
  leaderboards apply.
- Published pages consume `OfficialMatchdayResult`.

## Zweite Liga

Mode: normal league.

- Uses the same matchday, table, event, story, tension-zone, and leaderboard
  pipeline as Erste Liga.
- Competition configuration may define a different team count, Europe ranks,
  and relegation ranks.
- The current UI fixture contains six teams and three matches.
- Published pages consume `OfficialMatchdayResult`.

## Pokal

Mode: knockout.

### Rounds 1–2

- Each tie is played over two legs.
- Advancement is determined by the aggregate score across both legs.
- Kicker ratings are not used.
- Every evaluated player receives the default rating `3.5`.
- Goals count without a Kicker rating.
- Yellow-red and red cards remain enabled when event data exists.
- Team of the Week scoring is disabled.

The exact Pokal appearance-point (`Einsatzpunkt`) rule is pending confirmation.
The placeholder configuration currently sets
`countAppearanceWithoutRating: false`; callers can change that flag after the
rule is confirmed without changing engine code.

### Later Rounds

Later knockout-round details remain structural placeholders. Any differences
from the two-leg opening rounds must be confirmed before implementation.

## Europapokal

Mode: league phase followed by knockout matches.

- The league phase produces a competition table.
- Qualified teams advance to semifinals.
- Semifinal winners advance to the final.

Detailed qualification and tie-breaking rules remain outside the current
implementation scope.

## Supercup

Mode: single match.

- One fixture determines the winner.
- No league table or aggregate score is required.

## Implementation Boundary

Competition mode and scoring policy are separate concerns. Schedule and
advancement configuration determine how fixtures work.
`CompetitionScoringConfig` determines how supplied player data is scored for a
specific `phaseId` or `roundId`.

Current implementation status:

- normal league mode is active for Erste Liga and the six-team Zweite Liga
  fixture;
- Pokal, Europapokal, and Supercup remain structural UI placeholders;
- the Pokal rounds 1–2 scoring configuration can be passed by a future caller;
- no competition branch or confirmed Pokal appearance-point behavior has been
  added to the engine.
