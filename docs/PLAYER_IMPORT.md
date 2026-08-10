# Player Import

The Player Import is the first production-grade migration workflow for BMS
master data.

It imports no data blindly. Every run starts with a preview that explains what
would change before any apply step exists.

## Flow

Excel

↓

Parser

↓

Import Preview

↓

Review

↓

Prisma

Sprint 16.3 completes the flow with an explicit Apply action.

## Preview Model

`PlayerImportService` creates a `PlayerImportPreview` with:

- `newPlayers`
- `changedPlayers`
- `unchangedPlayers`
- `leftBundesliga`
- `clubChanges`
- `marketValueChanges`
- `duplicateWarnings`

The same preview pattern is intended for future Manager, Squad and Matchday
imports.

## Upload Workflow

The operational route `/admin/import/player-master` is upload-first.

The administrator selects:

- `Datei auswählen` (`.xlsx` only),
- `Saison`,
- `Transferphase` (`Sommer` or `Winter`),
- an optional note or reason.

`Vorschau erstellen` uploads the workbook to a temporary server location and
rebuilds the preview from that selected file. Workbook discovery through
environment paths may remain as a development fallback in the service, but it is
not the primary UI path anymore.

Supported sheet structures:

- the official season-phase workbook with `Vorrunde` and `Rückrunde` sheets,
- the official BMS transfer workbook with the columns `Verkaufspreis`,
  `Unter Vertrag`, `Kaufpreis`, `Spieler`, `Verein` and `Position`,
- legacy transfer-list sheets such as Torwart, Abwehr, Mittelfeld and Sturm
  lists,
- legacy `Spielerliste` sheets with position, price, name and club columns.

## Official BMS Import Format

The certified source is the official BMS transfer workbook. The importer adapts
to this workbook; the workbook format is not changed for the importer.

The current official workbook can contain two phase sheets:

- `Vorrunde` → `Sommer` / persisted `SUMMER`
- `Rückrunde` → `Winter` / persisted `WINTER`

The selected transfer phase decides which sheet is parsed. A summer preview
reads only `Vorrunde`; a winter preview reads only `Rückrunde`. The importer
does not import both sheets in one run.

Required official workbook columns:

- `Spieler` → `displayName`
- `Verein` → `bundesligaClub`
- `Position` → `positionGroup`
- `Verkaufspreis` → `marketValue`

Ignored fields:

- `Unter Vertrag`
- `Kaufpreis`

The ignored values are shown in the review screen but are not written. They are
later calculated automatically from `SquadAssignment` data by the BMS Engine.

For phase workbooks, the selected worksheet is shown in the review and stored in
the version metadata. For older official workbooks without `Vorrunde` or
`Rückrunde`, the importer identifies player sheets by the required column
headers.

Status rules:

- non-empty `Verein` → `ACTIVE`
- empty `Verein` or `Abgang` → `LEFT_BUNDESLIGA`

Identity rules:

- `displayName` is the canonical player name,
- names are not split into first and last name,
- Prisma generates the internal `Player` id.

The Apply step writes only:

- `displayName`
- `bundesligaClub`
- `positionGroup`
- `marketValue`
- `status`

## Review Route

The route `/admin/import/player-master` renders the preview inside the BMS
Office. It shows summary cards and grouped review lists for new players, market
value changes, club changes, Bundesliga departures and duplicates.

The preview also shows:

- season,
- transfer phase,
- selected sheet,
- version candidate,
- selected filename,
- imported fields,
- ignored fields,
- delta compared with the previous active version.

`Import übernehmen` now requires a final confirmation before it writes.

## Season and Phase Context

Every player-list import belongs to exactly one season and one transfer phase.

The UI labels use BMS wording:

- `Sommer`
- `Winter`

The persisted phase values use the existing Prisma `TransferPhaseType` enum:

- `SUMMER`
- `WINTER`

This context makes the Player Master import repeatable and auditable across
summer and winter transfer windows.

If a player changes position between `Vorrunde` and `Rückrunde`, the preview
shows that as a `positionGroup` delta for the selected phase. Later this can
trigger mandatory transfer handling for affected managers; that engine logic is
not part of the Player Master import.

## Versioning

`PlayerListVersion` stores the operational import version:

- `seasonId`
- `phase`
- `versionNumber`
- `status`
- `filename`
- `importedAt`
- `appliedAt`
- `countsJson`
- `ignoredColumnsJson`
- `deltaJson`
- optional `note`
- optional `createdBy`

Version numbers start at `1` for every `seasonId + phase` pair.

When a new version is applied:

- the previous active `APPLIED` version for the same season and phase becomes
  `SUPERSEDED`,
- the new version is created as `APPLIED`,
- the new version becomes the active player-list version.

## Import Verification

`PlayerImportVerification` compares the workbook import against Prisma and
reports:

- imported workbook player count,
- current Prisma player count,
- duplicate canonical names,
- missing clubs,
- missing positions.

Duplicate canonical `displayName` values block Apply because the Player Master
uses `displayName` as the official identity from the transfer workbook.

## Safety Rules

- Database writes only happen after explicit confirmation.
- No parser side effects.
- No engine calls.
- No fixture fallback.
- The administrator must see what changes before applying changes.

## Apply Step

The Apply step is the first production write workflow in BMS.

Before execution, the administrator must confirm:

`You are about to update the Player Master.`

After confirmation, the service rebuilds the preview from the workbook and writes
only the required changes:

- new workbook players create `Player` records,
- existing players update club, market value, position or status,
- Bundesliga departures are marked as `LEFT_BUNDESLIGA`,
- players are never deleted.

Historical references therefore remain valid even when a player leaves the
Bundesliga.

## Transaction

The repository executes the complete Apply operation inside one Prisma
transaction:

- bulk player inserts for new players,
- updates for changed players only,
- bulk departure status updates,
- player-list version activation,
- import audit creation.

If any write fails, the transaction fails and no partial Player Master update is
kept.

## Audit

Every successful Apply creates a `PlayerImportAudit` record with:

- import time,
- workbook name and path,
- imported, updated, unchanged and departure counts,
- duration,
- summary metadata for future import history.

The Import History page can later read these audit records.

## Idempotency

The Apply operation is designed to be repeatable.

Running the same workbook again rebuilds the preview against the current Prisma
state. If no data changed, the report contains:

- `0` imported players,
- `0` updated players,
- `0` Bundesliga departures.

Already marked departures are not counted again.
