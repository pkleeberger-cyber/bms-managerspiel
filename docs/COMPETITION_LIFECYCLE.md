# Competition Lifecycle

The Season Operations Center does not model the season as a workflow.

A BMS season is the container for multiple operational competitions. Each
competition can be prepared, activated and completed independently. Liga 1 can
already be active while Liga 2 still needs a fixture, the cup is drawn and the
Europapokal is still waiting for participants.

## Domain Model

The lifecycle domain lives in `app/domain/competition-lifecycle`.

It exposes `CompetitionLifecycleSnapshot` for the Season Operations Center:

- `competitionId`
- `competitionType`
- `status`
- `progressPercent`
- `availableActions`
- `completedActions`
- `nextRecommendedAction`
- `timelineEntries`

Snapshots are read-only operational state. They do not write to the database and
do not call any engine.

## Independent Lifecycles

Supported competition types:

- `LEAGUE_1`
- `LEAGUE_2`
- `CUP`
- `EUROPE`
- `SUPERCUP`

Each type owns its own status sequence:

- League: `CREATED → PARTICIPANTS_CONFIRMED → FIXTURE_GENERATED → READY → ACTIVE → COMPLETED`
- Cup: `CREATED → DRAW_REQUIRED → ROUND_READY → ACTIVE → COMPLETED`
- Europe: `CREATED → PARTICIPANTS_REQUIRED → LEAGUE_PHASE_READY → ACTIVE → KNOCKOUT_READY → COMPLETED`
- Supercup: `CREATED → PARTICIPANTS_REQUIRED → FIXTURE_READY → READY → COMPLETED`

The season itself intentionally has no lifecycle. Forcing a single season
workflow would incorrectly imply that competitions must be prepared in a fixed
order.

## Actions and Timeline

Every snapshot exposes current `availableActions`, already
`completedActions`, a `nextRecommendedAction` and timeline entries.

Examples:

- League: `Spielplan erzeugen`, `Liga aktivieren`
- Cup: `Auslosung durchführen`, `Nächste Runde erzeugen`
- Europe: `Teilnehmer erzeugen`, `Ligaphase starten`
- Supercup: `Spiel erzeugen`

The timeline records operational events with a time, action, optional user and
description. It is meant for workspace context, not audit persistence.

## Season Operations Center

`/admin/season` consumes the fixture snapshots from the lifecycle domain.

The UI remains a control center, not a wizard. Cards, tasks and timeline entries
are derived from independent competition snapshots, so no competition is blocked
by another competition's lifecycle state.
