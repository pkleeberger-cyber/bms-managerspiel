# BMS Rules Engine

## Purpose

The Rules Engine transforms a mathematically calculated matchday into the officially published BMS matchday.

Calculation and administration are intentionally separate:

```text
Lineup Engine
      |
      v
Match Result Engine
      |
      v
Calculated Matchday
      |
      v
Rules Engine
      |
      v
Official Matchday
```

The calculation engines remain the permanent mathematical record. The Rules Engine never recalculates ratings, player points, replacements, position totals, or calculated fantasy goals.

## Input

`applyRulesToMatchday()` receives:

- a calculated matchday;
- ordered official rules;
- a deterministic publication timestamp.

Rules are applied in the supplied order. This makes combinations of penalties, corrections, and overrides deterministic and auditable.

The calculated matchday is read only and is returned unchanged as part of the official result.

## Rule Model

Every rule contains:

- stable rule ID;
- rule type;
- competition ID;
- inclusive matchday validity;
- reason;
- creation timestamp;
- optional administrator.

Supported rule types are:

### `TEAM_INVALID`

Replaces one manager's official fantasy goals with a configured invalid result.

The default invalid result is `0`. The calculated value remains available in `calculatedGoals`.

### `TEAM_PENALTY`

Adds a temporary positive or negative point value to the current official goals. Matchday ranges allow a penalty to remain active for a defined period.

### `POINT_ADJUSTMENT`

Applies a stable manual point correction without changing the calculated result.

### `MATCH_OVERRIDE`

Replaces both official match scores for an exceptional administrative decision.

The match is identified by its home and away manager IDs. Reversed or guessed pairings are not accepted.

### `ADMIN_NOTE`

Records an administrative note without changing a score. It appears in the rule log but not in the score-change audit trail.

## Official Results

Each `OfficialMatchResult` stores:

- the complete calculated match result;
- calculated home and away goals;
- official home and away goals;
- official outcome and winner;
- official league points;
- official team goals for, goals against, and goal difference;
- applied rule IDs.

Whenever a score changes, winner, league points, and both team result records are derived again from the official score only. Calculated values remain untouched.

Negative official scores remain valid.

## Audit Trail

Every score-changing rule creates an audit entry containing:

- rule ID and type;
- affected home and away managers;
- old score;
- new score;
- reason;
- publication timestamp;
- optional administrator.

The separate rule log contains all active rules, including administrative notes.

Rules outside the current competition or matchday range are not applied. Active mutation rules whose manager or match cannot be found fail explicitly.

## Historical Thomas Example

The verified historical calculation produced:

```text
Thomas 13:28 Ben
```

The official workbook published:

```text
Thomas 0:28 Ben
```

The Rules Engine represents this without changing the calculation:

```text
Calculated Thomas goals: 13
Rule: TEAM_INVALID
Configured invalid result: 0
Official Thomas goals: 0
```

Ben remains the winner, so league points remain:

```text
Thomas 0
Ben    3
```

Ben's official goals against and goal difference are updated from `13` and `+15` to `0` and `+28`.

`app/domain/rules-engine/fixture.ts` proves this case and also demonstrates temporary penalties, point adjustments, match overrides, administrative notes, audit generation, and input immutability.

## Boundary

The Rules Engine publishes official match results. It does not update league tables, generate events, write history, or persist data.

The Official Matchday Processor consumes `RulesEngineResult` and publishes the canonical `OfficialMatchdayResult`. Downstream application modules consume only that canonical processor output.
