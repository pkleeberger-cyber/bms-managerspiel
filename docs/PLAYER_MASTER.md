# Player Master

The Player Master is the operational source of truth for Bundesliga players and
player-level admin changes.

The primary admin workflow lives at:

`/admin/players`

## Purpose

Modules should use Prisma `Player` records as their player source:

- imports
- transfer market
- manager squads
- lineup validation
- matchday data entry
- matchday calculation inputs

The Player Master is also where admins draft and release operational player
changes.

## Editable Operations

Admins can create draft changes for:

- player status
- Bundesliga club
- market value

The UI also reserves the data model for future position changes.

Changes do not affect manager squads, transfer market availability, or
calculation inputs until release.

## Draft And Release

Player changes are stored in `PlayerMasterChangeBatch` and
`PlayerMasterChange`.

On draft creation the page shows:

- old value
- new value
- affected manager count
- affected manager slots
- possible rule impacts

On release:

`effectiveFromMatchday = latest officially closed matchday + 1`

Already officially closed matchdays stay historically untouched.

## Rule Impacts

`STATUS_CHANGE` to `LEFT_BUNDESLIGA`:

- updates the current Player status on release
- creates a released `PlayerDepartureBatch`
- creates active `PlayerDepartureEvent` rows
- creates open `ManagerMandatoryTransfer` rows for affected manager slots

`CLUB_CHANGE`:

- updates `Player.bundesligaClub` on release
- records club-limit warning impact in the released change
- warns that affected squads may exceed the max 3 players per Bundesliga club

`MARKET_VALUE_CHANGE`:

- updates `Player.marketValue` on release
- affects transfer market and budget displays only

`POSITION_CHANGE`:

- supported by the data model for future use
- warns that squad structure can become invalid

## UI

Player cards show:

- status badge: Aktiv / Abgang / Inaktiv
- managers under contract count
- open change badge when a draft exists
- per-player action form

The top operations board shows:

- estimated effective matchday
- draft changes
- affected slots
- warnings
- release action

## Boundary

This workflow does not change the scoring engine.

Closed matchdays are not recalculated or rewritten. From the effective matchday
onward, downstream validation and calculation use the released Player Master
state.
