# Manager Profile

The Manager Profile is the permanent identity surface for a BMS manager.

Design authority:

- `docs/BMS_DESIGN_SYSTEM.md`
- `docs/BMS_COMPONENT_GUIDE.md`

## Routes

- Manager area: `/team/profile`
- Admin area: `/admin/managers/[managerSeasonId]`

Both routes use the same profile snapshot from `ManagerService` and the same
`ManagerProfile` component. Admin-specific maintenance actions remain outside
the shared profile component.

## Identity Model

The profile is based on real `ManagerSeason` data and its linked `Manager`
identity.

Displayed identity fields:

- name
- short name
- league
- status
- current season
- since
- titles
- current squad value
- current budget

`since` uses the permanent `Manager.createdAt` value. Budget, league, status and
season come from the selected `ManagerSeason`.

## Statistics

Profile statistics are calculated only from visible living fixtures with a real
`MatchResult`.

Displayed statistics:

- matches
- wins
- draws
- losses
- goals
- points
- win percentage

If no visible result exists yet, the profile shows `Noch nicht berechnet`
instead of fixture data or guessed values.

## Career

The career timeline uses real `ManagerSeason` history for the permanent manager
identity. The current season includes the current squad value. Historical squad
values are not backfilled unless a real source exists.

Displayed career fields:

- season
- league
- ManagerSeason status
- participation
- budget
- squad value when available

Promotions, relegations and titles are reserved until a canonical aggregate
source exists.

## Achievements

Reserved achievements:

- Champion
- Cup Winner
- European Champion
- Super Cup

These are displayed as placeholders with `Noch nicht berechnet` until titles are
persisted or derived from an authoritative competition result source.

## Current Team

The current team preview uses real current `SquadAssignment` records:

- slot
- player
- position
- Bundesliga club
- market value

The preview is intentionally compact and does not replace the full squad page.

## Future Sections

Reserved profile sections:

- favourite formation
- favourite player
- club records

They are visible as prepared placeholders only. No fake data is shown.

## Implementation Rules

- Do not duplicate manager identity rendering between Team and Admin.
- Do not use fixtures for profile identity.
- Do not invent titles, records, promotion or relegation counts.
- Show clean placeholders where aggregate statistics are not calculated yet.
- Keep admin-only actions outside the shared manager-facing profile component.
- Keep the layout aligned with the BMS Design System.
