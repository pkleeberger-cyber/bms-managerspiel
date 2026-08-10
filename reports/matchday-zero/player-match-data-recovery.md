# PlayerMatchData Recovery Report

## Context

The data-entry save bug could overwrite PlayerMatchData rows for players hidden
by an active club filter.

## Audit Availability

No dedicated PlayerMatchData audit collection exists in the current Prisma
schema. `PlayerMatchData` stores only the current row state:

- seasonId
- matchday
- playerId
- rating
- goals
- yellowRed
- red
- teamOfTheWeek
- source
- createdAt
- updatedAt

There is no before/after history for overwritten values.

## Recovery Status

Deleted or overwritten PlayerMatchData values cannot be reconstructed from the
database alone.

Possible external recovery sources:

- browser screenshots
- manually exported admin forms
- database backups
- deployment or database audit logs outside Prisma

## Prevention

The save flow now only upserts explicitly submitted visible player rows.
Missing form rows are never interpreted as delete or clear instructions.
