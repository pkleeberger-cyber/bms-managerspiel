# Transfer Center Screen

## Purpose

`/team/transfers` is the manager's entry point into a transfer period. The
screen provides orientation, explains the available budget and transfer
framework, and shows whether a saved draft exists.

It is not the transfer market and contains no transfer editing, validation, or
submission logic.

## Information Architecture

The screen follows the existing `Mein Team` shell and left context navigation.
Its content is ordered from seasonal context to the next manager action:

1. **Transfer period hero**
   - season and transfer-window title;
   - motivational introduction;
   - open-window status and placeholder countdown.
2. **Budget and team value**
   - previous budget;
   - seasonal deductions, rewards, and penalties;
   - available transfer budget;
   - previous and current squad value;
   - market-value development.
3. **Transfer status**
   - free, additional, required, used, and remaining transfers;
   - visible placeholder status indicators for budget, positions, duplicate
     players, and required transfers.
4. **Bundesliga departures**
   - placeholder players who left the Bundesliga;
   - explanation that these players can be replaced additionally.
5. **Transfer draft**
   - saved-state and last-change information;
   - team readiness;
   - entry to the future workspace;
   - disabled binding submission.

All values are placeholders for this screen slice.

## Transition to Transfer Workspace

`Transferarbeitsplatz öffnen` points to `/team/transfers/workspace` and
preserves the selected `managerSeasonId`.

The workspace now uses Living Database sources:

- current squad from `TeamService` / `SquadAssignment`;
- transfer player pool from `PlayerService` / `PlayerRepository`;
- only the active applied `PlayerListVersion` for the selected active season
  and transfer phase (`SUMMER` or `WINTER`);
- Player Master fields `displayName`, `club`, `position`, `marketValue` and
  `status`;
- `LEFT_BUNDESLIGA` players are hidden by default and only visible in explicit
  developer mode.

The same player pool is shared across manager switches. The selected manager
changes the current squad, not the Player Master pool.

The landing page must remain read-only when the workspace is introduced.
Transfer validation, player selection, budget calculations, and final
submission belong to the workspace and domain services, not this screen.
