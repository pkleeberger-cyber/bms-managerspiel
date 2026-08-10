# Manager Season

`ManagerSeason` is the operational season participation model for BMS.

BMS intentionally does not model an independent club or team identity for each
manager. In the game, the manager identity and the playing team are the same
thing.

## Model

Manager

↓

ManagerSeason

↓

Season

## Manager

`Manager` is the permanent identity.

It stores stable information:

- display name,
- short name,
- status,
- creation metadata.

There must be no duplicate manager identities. The permanent identity is reused
across seasons.

## ManagerSeason

`ManagerSeason` stores season-specific operational data:

- season,
- league,
- budget,
- season status,
- participation status,
- transfer status,
- current lifecycle.

A manager can have exactly one `ManagerSeason` per season.

## Why Not Manager To Team?

The BMS domain has no separate club concept for managers.

Introducing `Manager -> Team` as a second identity would create artificial
duplication:

- manager name and team name would represent the same actor,
- seasonal league membership would be split across models,
- future imports would need to reconcile two identities for one real object.

Instead, `ManagerSeason` is the operational object. It answers:

- Does this manager participate this season?
- Which league is the manager in?
- What is the current budget?
- What is the transfer status?
- Is the manager active, paused or archived for this season?

## Migration vs Operational Management

Manager import is a migration tool, not a recurring yearly operational import.

It remains available for:

- initial migration,
- exceptional manager additions,
- controlled repair of historical ManagerSeason data.

After go-live, regular manager changes are maintained directly inside BMS
Office. The Manager Detail Workspace now implements the safe operational
actions directly:

- create manager,
- archive manager,
- reactivate manager,
- hard delete for setup and correction cases,
- edit ManagerSeason budget,
- assign league.

Pause handling and dangerous squad repair actions remain prepared but disabled
until their validation and audit flows are defined.

## Manager Detail Workspace

`/admin/managers` remains the overview for all current and archived managers.
Each manager card links to `/admin/managers/[managerSeasonId]`, the
object-centered workspace for one seasonal participation.

The detail workspace combines the operational state that was previously spread
across admin surfaces:

- overview KPIs for status, league, season, budget, squad value, open mandatory
  transfers and last matchday status,
- permanent manager data (`displayName`, `shortName`, linked user),
- season management for league, ManagerSeason status, budget and transfer
  status,
- the current 18-slot squad from live `SquadAssignment` records,
- a matchday selector that shows the squad valid for a historical matchday,
- prepared correction actions for future squad and assignment repairs.

Safe actions implemented now:

- budget edit on `ManagerSeason.budget`,
- league assignment on `ManagerSeason.league`,
- archive, reactivate and hard delete through the existing Manager Master
  actions.

Dangerous squad editing remains intentionally disabled:

- player in slot correction,
- SquadAssignment period correction,
- direct Spieltagssquad repair.

Those actions need their own validation and audit model before they become
write-enabled.

This keeps the permanent `Manager` identity under BMS control instead of making
an external workbook the recurring source of truth.

## Data Integrity And Repair

Manual deletes in MongoDB can create orphaned operational data. For example,
deleting a `Manager` document directly leaves existing `ManagerSeason` records
that still reference the removed manager id.

The Manager Master is defensive:

- valid managers still render,
- orphaned `ManagerSeason` rows are skipped,
- the page shows a warning instead of exposing raw Prisma errors.
- archived managers are rendered in a separate archive section and are not mixed
  into active league lists.

Use BMS Office actions for future manager changes instead of direct MongoDB
deletes. Until those actions cover every repair case, use the dry-run repair
helper:

```bash
npm run repair:manager-seasons
```

The default mode only reports orphaned records. To remove them intentionally:

```bash
npm run repair:manager-seasons -- --apply
```

This command only removes `ManagerSeason` records whose `managerId` no longer
exists in `Manager`.

## Archive vs Hard Delete

Production managers should normally be archived, not deleted.

Archive is the recommended operational action:

- `Manager.status` becomes `ARCHIVED`,
- related `ManagerSeason` records become `ARCHIVED`,
- participation is withdrawn,
- transfer state is locked,
- historical references remain intact.

Archived managers can be reactivated without creating duplicate identities:

- `Manager.status` becomes `ACTIVE`,
- the current/latest `ManagerSeason` becomes `ACTIVE`,
- participation becomes active again,
- transfer state reopens,
- historical rows and squad references are preserved.

Hard delete exists only for setup, admin testing and correction cases. It is
dangerous because historical data can be removed permanently. The BMS Office UI
therefore marks it as `Endgültig löschen` and requires typing the manager display
name before execution.

Hard delete removes data in a controlled order:

1. `SquadAssignment` records for the manager's `ManagerSeason` or legacy `Team`
   rows,
2. `ManagerSeason` records for the manager,
3. legacy `Team` rows for the manager if present,
4. optional `User.managerId` links,
5. the `Manager` itself.

Use hard delete only for test managers or setup mistakes. For real historical
participants, archive instead.

## Migration Import Workflow

Manager season data can be migrated through the same safe pattern as the Player
Master:

Excel

↓

Preview

↓

Review

↓

Apply

↓

Audit

The import reads a workbook with a `Manager` sheet. It supports:

- `Manager_ID`,
- `Manager_Name`,
- `Liga`,
- optional `Budget`,
- optional `Status`.

Missing budget values are imported as `0` until the source workbook provides a
real budget column.

## Apply Rules

- New manager identity creates `Manager` and `ManagerSeason`.
- Existing manager identity updates only the season participation.
- League and budget changes are visible in the preview before apply.
- Managers missing from the workbook are marked as paused for the season.
- Managers are never deleted.

Every successful apply creates a `ManagerImportAudit` record.

## Verification Report

The Manager Master generates a verification report from Prisma:

- managers imported,
- active managers,
- paused managers,
- archived managers,
- missing season assignments,
- duplicate names.

This report is intended to support the migration cutover and later operational
health checks.

## Season Operations

The Season Operations Center reads ManagerSeason data for:

- real manager count,
- real active participant count,
- real first league count,
- real second league count.

Manager counts are read from Prisma only. If no ManagerSeason data exists yet,
the counts remain `0`; fixture manager counts are not used for operational
season reporting.
