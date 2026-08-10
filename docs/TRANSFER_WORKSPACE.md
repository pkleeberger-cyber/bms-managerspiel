# Transfer Workspace

## Purpose

`/team/transfers/workspace` is the manager's central editing surface during a
transfer period. It replaces the operational Excel view with a focused,
immediate workspace.

The current screen now initializes from the shared Team data boundary:

- `/team/transfers/workspace?managerSeasonId=...` is a server route;
- it loads `TeamService.loadCurrentTeamOverview()` with the selected
  `managerSeasonId`;
- it loads `PlayerService.loadTransferMarket()` for the selected transfer phase;
- the client workspace receives the selected manager, current squad,
  position structure, market values, budget, transfer status and Player Master
  market pool;
- the current squad, sold-player options and squad preview come from the
  selected manager's current `SquadAssignment` records when Prisma is
  available.
- replacement candidates come from `PlayerRepository` and are only exposed when
  an applied `PlayerListVersion` exists for the active season and selected
  phase.

The transfer workflow itself is still not persisted:

- no persistence;
- no submission;
- no authoritative transfer budget derivation;
- no transfer-rule validation;
- no calculated purchase price;
- no under-contract calculation.

Sell and buy actions update local visual selection state so the interaction can
be evaluated before domain integration. If Prisma has no current squad,
`TeamService` may return the internal fixture fallback; the workspace must show
that fallback as an internal/dev warning and must not present it as live manager
data.

## Three-Column Philosophy

### Mein aktueller Kader

The left column answers: **What do I have now?**

Players are grouped by official position and expose their slot, role
(`Stamm`/`Ersatz`), club and Player Master market value. Selecting `Verkaufen`
marks the player and removes them from the local preview.

### Transfermarkt

The center column answers: **What could I add?**

Search, position, club, price and sorting controls remain in the workspace
shell. Candidates come from the active Player Master list. `LEFT_BUNDESLIGA`
players are hidden unless developer mode is explicitly enabled. Selecting
`Kaufen` marks a candidate as `Neu` and adds it to the preview. No contract
ownership, market eligibility or pricing rule is evaluated yet.

### Neuer Kader

The right column answers: **What would my squad look like?**

It groups retained and newly selected players by official position and keeps
empty slots visible. New players are highlighted. Sold players do not appear.

The preview is not a submitted or validated squad.

## Persistent Status

The sticky top bar keeps the transfer context visible:

- ManagerSeason budget when available;
- remaining transfers;
- required replacements only when a live source exists;
- current validation state.

The sticky footer keeps local validation categories visible:

- budget;
- positions;
- duplicate players;
- required transfers;
- local draft status.

These values are derived from the loaded squad plus local draft state. Missing
domain sources are rendered as unavailable instead of filled with dummy values.

Purchase price and "under contract" indicators are intentionally not imported
from Player Master. They are future calculated values derived from
`SquadAssignment` and transfer rules. Until that service exists, the workspace
displays market value only.

## Future Transfer Engine

The Transfer Engine will eventually own:

- sale and purchase draft commands;
- authoritative squad-slot changes;
- transfer counts;
- purchase prices and budget effects;
- required replacement fulfillment;
- draft persistence and restoration.

The UI should consume one prepared transfer-workspace object rather than
reimplementing those calculations.

## Future Rules Engine

The Rules Engine will eventually provide competition- and period-specific
constraints such as:

- permitted transfer counts;
- mandatory transfers;
- player exclusivity;
- position structure;
- transfer-window validity;
- administrative adjustments.

The workspace will render rule outcomes and validation messages. It must not
hardcode or independently calculate those rules.
