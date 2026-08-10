# Reference Season Import – Liga 1

## Purpose

`Saisondaten.xlsx` is the first full-season reference workbook for Liga 1. The
verification importer reads the workbook without writing to the database and
compares the existing BMS lineup engine with every official fixture score.

The validated domain engines are used unchanged.

## Workbook Structure

The importer requires two worksheets.

### Bewertung

Expected columns:

1. `spieltag`
2. `manager`
3. `position`
4. `spieler`
5. `verein`
6. `note`
7. `gelbRot`
8. `rot`
9. `tor`
10. `kickerelf`
11. `punkte`
12. `spielernr`

`spielernr` is the official BMS lineup slot ID. Every imported manager and
matchday must contain all slots from 1 to 18. Position labels are validated
against the official slot structure before calculation.

### Paarungen

Expected columns:

1. `spieltag`
2. `heim`
3. `auswarts`
4. `hTore`
5. `aTore`

The managers present in `Paarungen` define the Liga 1 manager set. Evaluation
rows for managers outside that set are parsed but excluded from Liga 1 scoring
and listed separately in the report.

## Verification Flow

```text
Saisondaten.xlsx
        ↓
Bewertung + Paarungen validation
        ↓
Rows grouped by matchday and manager
        ↓
spielernr mapped to official slotId
        ↓
Existing Lineup Engine calculation
        ↓
Calculated manager scores
        ↓
Comparison with official Paarungen scores
        ↓
JSON and Markdown reports
```

No fixture, lineup or scoring logic is duplicated in the importer.

## Running the Verification

From `app/`:

```bash
npm run verify:reference-season -- \
  --workbook /path/to/Saisondaten.xlsx \
  --output ../reports/reference-season
```

The output directory receives:

- `liga-1-verification.json`
- `liga-1-verification.md`
- `difference-audit.json`
- `difference-audit.md`
- `applied-rule-candidates.json`
- `applied-rule-candidates.md`
- `final-season-verification.json`
- `final-season-verification.md`

The JSON report contains every manager evaluation and every fixture difference.
The Markdown report provides the review summary and readable difference tables.

## Difference Audit

The difference audit preserves the 118 fixture-level differences from the
verification report. Every affected manager side within those fixtures includes:

- matchday and fixture
- manager and home/away side
- engine, official and workbook player totals
- total differences
- all 18 official slot comparisons
- likely category and supporting evidence

Categories are:

- `TEAM_INVALID`
- `MANUAL_PENALTY`
- `POINT_ADJUSTMENT`
- `PLAYER_MAPPING`
- `MISSING_RATING`
- `UNKNOWN`

Thomas is the only explicit historical special case. It is classified as
`TEAM_INVALID`, with an expected official score of `0`. If the workbook stores
another value, the audit preserves that source value and calls out the
deviation.

For all other managers, the category is an audit heuristic:

- a mismatch between engine total and the sum of workbook player points points
  to player mapping or missing-rating behavior
- an official reduction after matching player totals points to a manual penalty
- an official increase after matching player totals points to a point adjustment
- insufficient evidence remains `UNKNOWN`

These classifications do not change the Lineup Engine, Rules Engine or official
matchday pipeline. They are review evidence for a later rules/data import.

## AppliedRule Candidates

The candidate report converts only rule-like audit categories:

- `TEAM_INVALID` → `TEAM_INVALID`
- `MANUAL_PENALTY` → `TEAM_PENALTY`
- `POINT_ADJUSTMENT` → `POINT_ADJUSTMENT`

Every candidate is marked `REVIEW_REQUIRED`, references one matchday and
manager name, and preserves the fixture, engine total, official total, workbook
total and classification evidence. Manager IDs remain `null` because Sprint
12.2b performs no database lookup or write.

`PLAYER_MAPPING`, `MISSING_RATING` and `UNKNOWN` remain in a separate
`excludedIssues` collection. They cannot become rule candidates because they
indicate unresolved calculation input or mapping quality rather than an
administrative result decision.

The reports are suggestions only. They are not passed to the Rules Engine and
are not persisted as Prisma `AppliedRule` records.

## Validated Reference Season

The final verification run treats all generated rule candidates as reviewed
input for this isolated reference test:

```text
Calculated manager totals
        ↓
Calculated matchday results
        ↓
Reviewed TEAM_INVALID / TEAM_PENALTY / POINT_ADJUSTMENT rules
        ↓
Existing Rules Engine
        ↓
Official matchday results
        ↓
Official league table
        ↓
Historical Excel verification
```

The adapter builds calculated match results from the already verified manager
totals. It does not calculate player points again. Rules are converted to the
existing `BmsRule` contract and applied with `applyRulesToMatchday`.

After each matchday, the official results update the league table through the
existing League Engine. The final report contains all 306 fixtures, the
resulting final table, applied-rule counts and every remaining difference.

`PLAYER_MAPPING` and `MISSING_RATING` are never passed to the Rules Engine.
They remain explicit data-quality issues in the final verification report.

The known `TEAM_INVALID` candidate always proposes the confirmed invalid score
of `0`. Historical workbook rows that contain a negative Thomas score therefore
remain visible as `TEAM_INVALID` source differences after rule application.
They are not silently converted into penalties.

This process performs no database writes and does not change the Lineup,
Rules, Match or League Engines.

## Current Reference Result

The checked-in report generated from `Saisondaten.xlsx` contains:

| Metric | Result |
| --- | ---: |
| Matchdays processed | 34 |
| Fixtures processed | 306 |
| Manager evaluations processed | 612 |
| Exact fixture matches | 188 |
| Fixtures with differences | 118 |
| Invalid-team cases | 34 |
| Total absolute score difference | 1501 |

The workbook contains 24 evaluated managers. `Paarungen` identifies 18 of them
as Liga 1 managers, producing 18 × 34 = 612 manager evaluations.

## Differences

A fixture is exact only when both calculated manager scores equal the official
home and away scores. Any mismatch is included with:

- matchday and pairing
- calculated score
- official score
- home and away difference

`totalScoreDifference` is the sum of all absolute home and away score
differences. It intentionally includes invalid-team overrides.

## Invalid-Team Cases

The workbook has no dedicated applied-rules worksheet. The importer therefore
identifies a full-season invalid manager when:

- the manager appears on all 34 matchdays
- every official score is non-positive

Every differing fixture for that manager is reported as an invalid-team case.
This preserves negative official scores rather than assuming that every invalid
result is exactly zero.

All 34 current cases concern Thomas. This is a transparent inference from
the workbook, not a newly implemented transfer or match rule. A future official
rules import can replace this inference with explicit `AppliedRule` data.

## Database Boundary

Sprint 12.2 performs no database writes. The report is the review artifact for
mapping, engine compatibility and official-result differences.

Persisting seasons, evaluations, fixtures, results and applied rules belongs to
a later import sprint after the differences have been reviewed.
