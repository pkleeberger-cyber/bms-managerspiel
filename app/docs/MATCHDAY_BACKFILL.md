# Matchday 1-17 Simulation Backfill

This backfill imports only source inputs for simulation and UI/statistics testing:

- `PlayerMatchData` for matchdays 1-17
- historical `SquadAssignment` periods derived from manager slot changes

It does not import match results, league table rows, official results, or published simulation state. Results and table snapshots must be produced by the existing BMS calculation flow.

## Dry Run

Run the dry-run first:

```bash
npm run backfill:matchdays -- --workbook /Users/patrickk/Downloads/Spieltag1_17.xlsx
```

The dry-run writes:

- `reports/backfill/matchday-1-17-backfill-report.md`
- `reports/backfill/matchday-1-17-backfill-report.json`

Review the report for:

- parsed matchdays
- `PlayerMatchData` count
- squad change count
- unknown players
- unknown managers
- conflicts

The report includes DB-vs-workbook conflict details for each issue type. Apply is
blocked while unknown players, unknown managers, workbook-internal conflicts, or
non-replaceable DB conflicts remain.

## Apply And Calculate

Only apply after the dry-run report has no unknown players, unknown managers, or conflicts:

```bash
npm run backfill:matchdays -- --workbook /Users/patrickk/Downloads/Spieltag1_17.xlsx --apply --calculate
```

`--apply` writes `PlayerMatchData` and `SquadAssignment` history. `--calculate` then runs matchdays 1-17 through the existing matchday calculation service.

If a previous backfill run created input rows and the workbook needs to be
re-applied, use:

```bash
npm run backfill:matchdays -- --workbook /Users/patrickk/Downloads/Spieltag1_17.xlsx --apply --replace-backfill-data
```

This mode is still blocked by unknowns and workbook-internal conflicts. It only
replaces DB input rows that are classified as replaceable in the dry-run report;
it does not touch `MatchResult`, `MatchdayVersion`, league table snapshots, or
published official data.

## Guardrails

- Final match results are never read from the workbook.
- League table results are never read from the workbook.
- Existing conflicting `PlayerMatchData` blocks apply.
- Existing conflicting assignment history blocks apply.
- Publishing is intentionally not part of this command.
- Engine rules are not changed by the backfill.
