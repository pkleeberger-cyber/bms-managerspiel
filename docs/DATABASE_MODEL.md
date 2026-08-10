# Database Model

## Overview

The first persistent BMS data model is defined with Prisma and the existing
MongoDB database provider. It stores stable source data and official historical
outputs without changing the validated domain engines.

The schema is located at `app/prisma/schema.prisma`.

## Season as Root Object

`Season` is the root for season-dependent product data:

- teams
- competitions
- player match data
- transfer phases

Managers and players remain independent records because both can exist across
multiple seasons. A compound unique constraint on `Team` ensures that one
manager can own only one team in a season.

## Historical Squad Assignments

`SquadAssignment` does not store only the current squad. Every assignment
contains:

- team and player
- official slot ID from 1 to 18
- first valid matchday
- optional final valid matchday
- assignment reason

Transfers and administrative corrections therefore create new validity ranges
instead of overwriting old squad membership. Historical matchdays can always
resolve the squad that was valid at that time.

Compound indexes support slot and player lookups by validity range. A compound
unique constraint prevents duplicate assignment records for the same team,
slot, player and range.

## Calculated and Official Results

`MatchResult` stores calculated and official scores together. Its status
indicates whether the result is still calculated or has become official.

The official values are persistence outputs of the Official Matchday Processor.
Consumers must not reconstruct them from current player or squad data.
`auditJson` can preserve the complete engine audit payload used to explain an
official result.

One fixture can have only one `MatchResult`.

## Stored JSON Outputs

Complex and still-evolving engine payloads remain JSON initially:

- match result audits
- league table snapshots
- applied rule values
- transfer budgets
- transfer movements
- transfer validation results

This avoids prematurely normalizing stable domain output objects into many
database tables. Frequently queried identities, relationships, statuses and
matchday keys remain strongly modeled and indexed.

The JSON boundary can be narrowed later when real query requirements are known.

## Transfer Submissions as Drafts

`TransferPhase` defines the summer or winter transfer window for a season.
`TransferSubmission` stores one team submission per phase.

A submission starts as `DRAFT` and contains snapshots of:

- budget state
- planned transfers
- validation result

Submitting, accepting or rejecting the draft changes its status without
discarding the original payload. `submittedAt` records when a manager made the
plan binding.

## Player Values

The Prisma MongoDB connector does not support Prisma `Decimal`. `marketValue`
and player ratings use `Float` in this initial schema. A fixed minor-unit
representation can replace market-value floats if later financial requirements
need exact arithmetic at database level.

Domain engines remain responsible for their validated calculations.

## Local Commands

Prisma reads the existing `MONGODB_URI` from `app/.env.local`.

From `app/`:

```bash
npm run db:validate
npm run db:generate
npm run db:push
```

MongoDB does not use Prisma SQL migration files. `prisma db push` synchronizes
collections and indexes with the configured database. Use a local development
MongoDB URI before running it; do not point schema experiments at production.

`db:validate` and `db:generate` do not mutate the database.
