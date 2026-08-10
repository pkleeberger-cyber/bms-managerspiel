# Squad Master

The Squad Master is the canonical historical squad source for BMS.

It is not a simple `Manager -> Players` list. BMS uses official slot IDs
`1` through `18`, and those slots are part of the rules contract for lineup
calculation, transfers and historical audits.

## Model

Manager

↓

ManagerSeason

↓

SquadAssignment

↓

Player

`ManagerSeason` owns the season-specific squad history. The permanent `Manager`
identity remains stable across seasons.

## Slot IDs

Official BMS slots must be preserved:

- `1-2` Torwart,
- `3-7` Abwehr,
- `8-14` Mittelfeld,
- `15-18` Sturm.

Every imported manager season must have exactly 18 active initial assignments.

## Operational Squad

The operational squad is the first Prisma-backed source for manager squads.
It represents the current season's official squad state for every
`ManagerSeason`.

This import is intentionally strict:

- every manager must resolve to an existing `ManagerSeason`,
- every player must already exist in the Player Master,
- every manager squad must contain exactly 18 official slots,
- the position structure must be `2 Torwart`, `5 Abwehr`, `7 Mittelfeld`,
  `4 Sturm`,
- no slot or player may be duplicated.

The squad import does not create managers or players. Missing master data is a
blocking validation issue and must be fixed in the Manager or Player Master
before Apply.

## Living Squad Migration

The Living Squad migration validates the first real historical squads against
the productive master data chain:

Player Master `SUMMER`

↓

ManagerSeason

↓

Official Season Workbook, Matchday 1

The migration intentionally uses the summer player pool (`Vorrunde`) for player
resolution and the official season workbook for squad ownership. The canonical
initial squad is exactly the matchday 1 state from the `Kader` sheet, identified
by `gültig_ab_Spieltag = 1` or equivalent `1.Spieltag` values.

The winter player list must not be used to build initial squads, because players
who later leave the Bundesliga still need valid historical `SquadAssignment`
references for matchday 1.

The preview must pass all checks before Apply is enabled:

- only matchday 1 rows are considered,
- every squad workbook player resolves in the Player Master,
- every manager resolves to a `ManagerSeason`,
- every manager has exactly 18 slots,
- slots `1-18` are present,
- the position structure is valid,
- no duplicate slot assignments exist.

If any of these checks fail, the migration produces a Squad Verification Report
instead of writing assignments. The report records the active Player Master
version evidence, missing players, missing managers and validation issues so the
master data can be corrected before retrying.

## Initial Squad

Initial squad migration reads only the matchday 1 state from the official season
workbook. It does not import matchday 34 as the current squad and it does not
import all 34 matchday states.

Initial squad apply writes:

- `validFromMatchday = 1`,
- `validToMatchday = null`,
- `reason = INITIAL_SQUAD`.

Future transfer imports will not overwrite history. They will split validity
ranges by closing the old assignment and opening the replacement assignment at
the transfer matchday.

Later squad states are produced by transfer workflows. They are not imported as
static full-season snapshots from the workbook.

## Future Transfer Split

Future transfer workflows will preserve history by splitting assignments:

1. close the old `SquadAssignment` with `validToMatchday`,
2. create a new assignment for the replacement player,
3. keep the same official `slotId`,
4. store the transfer reason, for example `SUMMER_TRANSFER` or
   `WINTER_TRANSFER`.

Historical matchdays therefore continue to resolve the squad that was valid at
that time.

## Import Workflow

Excel

↓

Parser

↓

Preview

↓

Review

↓

Apply

↓

Audit

The import reads the official season workbook, currently the `Kader` sheet with
manager, slot, player and matchday columns. Rows are included only when the
matchday marker represents matchday 1.

## Validation

The preview blocks Apply when:

- a manager has fewer or more than 18 slots,
- an official slot ID is missing,
- a slot is assigned more than once,
- a manager has duplicate players,
- a ManagerSeason is missing,
- a Player cannot be resolved from the Player Master,
- a player's position does not match the official slot position.

## Apply

Apply runs inside one Prisma transaction:

- bulk upsert `SquadAssignment`,
- create `SquadImportAudit`.

The import is idempotent because assignments are keyed by
`managerSeasonId + slotId + validFromMatchday`.

## Fixture Fallback

`SquadService` starts the migration away from fixtures:

- read historical squad assignments from Prisma when available,
- fall back to the existing lineup fixture when data is missing.

This keeps current engine fixtures operational while allowing future modules to
move to Prisma-backed squad history.
