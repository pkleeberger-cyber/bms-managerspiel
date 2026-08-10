# Import Center

The Import Center is the operational gateway between external data and the BMS
database.

It is not a generic upload form. It is a review-oriented workspace that helps
administrators understand what data will enter the system, why it is needed,
what will change and whether the import is safe.

## Purpose

The workspace gives import operations a consistent place inside the BMS Office:

- Bundesliga player pool imports,
- manager squad imports,
- matchday rating imports,
- fixture and result imports,
- Golden Reference imports and comparisons.

Every import card describes the source area, current status, expected content
and available placeholder actions.

## Import Philosophy

External data can change operational outcomes. Imports must therefore be
reviewed before execution instead of being treated as raw file uploads.

Before implementation of actual upload logic, each future import should answer:

- what source is being imported,
- which season or matchday it affects,
- which BMS records can change,
- whether the import is safe to run,
- how the result will be audited.

## Current Scope

Sprint 15.6 is UI-only.

The Import Center does not parse files, call APIs, write to the database or run
engines. CSV, Excel, API and manual import channels are shown as placeholders
for future implementation.

## Office Integration

The route `/admin/import` runs inside the shared BMS Office shell. The shell
navigation highlights `Importe`, and the reusable right sidebar switches to
import-specific context:

- Current Imports,
- Recent Imports,
- System Status.
