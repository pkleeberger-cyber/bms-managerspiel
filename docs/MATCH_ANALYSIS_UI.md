# Match Analysis UI

## Purpose

The Match Analysis UI is the first application page rendered entirely from the
Match Analysis Engine. It preserves the existing match-analysis layout while
replacing all demo teams, scores, position values, players, and findings with a
historical `MatchAnalysis`.

The connected fixture is the validated Excel match:

```text
Thomas Team 0:28 Ben Team
Calculated result: 13:28
Applied rule: Invalid Team
```

## Data Flow

```text
OfficialMatchdayResult
          ↓
createMatchAnalysis()
          ↓
    MatchAnalysis
          ↓
 React components
          ↓
 Rendered analysis and audit
```

The route modules provide the historical `MatchAnalysis` to:

- `MatchdayAnalysisDetail` for the match summary;
- `FullMatchdayEvaluation` for every occupied-slot player duel.

Both components receive `MatchAnalysis` as their only match-data prop.

## Summary Page

The page `/team/spiele/[matchday]/analyse` renders:

- home team and away team;
- official result and official winner;
- competition and matchday;
- an adjustment badge when applied rules exist;
- calculated and official scores in the compact adjustment section;
- only the applied rule labels;
- all four stored position duels;
- stored best players and overall matchwinner;
- replacement, missing-position, biggest-duel, and penalty factors.

Audit entries and internal rule objects are not displayed.

## Full Player Evaluation

The existing full-evaluation table renders the engine's ordered
`playerComparisons`. Each row displays:

- official occupied slot;
- home player and stored total points;
- away player and stored total points;
- engine-provided winner;
- replacement badges;
- `No evaluated player` for an empty position.

The default view contains every official slot and therefore every evaluated
player. Position and player-name controls only filter the rendered rows; they do
not alter analysis data.

Expandable rows contain only official BMS categories:

- Rating;
- Appearance;
- Goals;
- Yellow-Red;
- Red;
- Team of the Week;
- Total Points.

Unsupported categories such as assists, yellow cards, penalties, clean sheets,
and own goals do not exist in the component.

## No UI Calculations

React does not calculate scoring, position totals, point differences, duel
winners, best players, matchwinner, replacements, or applied rules.

Components only:

- select labels for domain enum values;
- format stored values;
- filter rows for user controls;
- control expanded-row state.

All match facts remain owned by `MatchAnalysis`.
