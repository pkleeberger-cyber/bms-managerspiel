# Midseason Player Departures

Midseason departures handle Bundesliga players who leave during an active BMS
season while they are still assigned to manager squads.

## Principle

Departures are not tied to a hardcoded matchday or a fixed calendar date. The
operative trigger is the admin release action:

`Aenderung freigeben` in `/admin/players`

Until release, departure changes stay in draft state and do not affect managers,
fixtures, scoring, or the transfer workspace.

## Data Flow

1. Admin creates a `PlayerMasterChangeBatch` in status `DRAFT`.
2. Admin adds one or more `PlayerMasterChange` rows in status `DRAFT`.
3. The Player Master preview shows all currently affected `SquadAssignment` rows for the
   estimated effective matchday.
4. On release, the system determines the effective matchday dynamically.
5. Release marks player master changes `ACTIVE`, the batch `RELEASED`, and
   affected players `LEFT_BUNDESLIGA`.
6. For departures, release creates a released `PlayerDepartureBatch` and active
   `PlayerDepartureEvent` rows.
7. One `ManagerMandatoryTransfer` is created for every affected
   manager/player/slot combination.

## Effective Matchday

On release:

`effectiveFromMatchday = latest officially closed matchday + 1`

If no matchday is officially closed yet, the effective matchday is `1`.

Already officially closed matchdays remain historically untouched. Points scored
before `effectiveFromMatchday` stay valid forever.

## Mandatory Transfers

An affected manager receives an open `ManagerMandatoryTransfer`.

The transfer workspace shows the outgoing player as a Pflichttransfer with the
reason:

`Pflichttransfer wegen Bundesliga-Abgang`

The outgoing player is fixed. The replacement must use the same position group.
Mandatory transfers are handled separately from normal free-transfer limits.

On completion, the historical assignment is split:

- old `SquadAssignment.validToMatchday = effectiveFromMatchday - 1`
- new `SquadAssignment.validFromMatchday = effectiveFromMatchday`

Existing squad history is never overwritten.

## Scoring Boundary

The scoring engine is unchanged.

Matchdays before the effective matchday use the old player normally. From the
effective matchday onward, the manager must complete the Pflichttransfer or the
team can be handled by the existing invalid-team workflow.

## Admin Screen

The primary admin workflow lives at:

`/admin/players`

It provides:

- per-player status change to Abgang
- reason field
- Player Master draft list
- affected manager and slot preview
- release action

The old `/admin/transfers/departures` route redirects to `/admin/players`.
