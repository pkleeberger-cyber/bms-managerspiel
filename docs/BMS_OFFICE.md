# BMS Office

The BMS Office is the shared operational workspace for administrators.

It is not a CRUD menu and not a technical backend console. It is the mission
control surface for running the managerspiel: season preparation, matchday
operation, publication readiness and future operational modules.

## Purpose

The Office shell gives every operational route the same frame:

- persistent left navigation,
- top operational header,
- reusable right context sidebar,
- child route content in the main workspace.

Existing modules such as the Season Operations Center and Matchday Operations
Center keep their own content. The shell only provides the shared operational
workspace around them.

## Operational Philosophy

The BMS Office is designed around decisions and quality checks, not data
maintenance tables.

Administrators should immediately see:

- which operational area they are in,
- current season and matchday context,
- database/fallback status,
- current tasks,
- recent activity,
- system readiness.

Future modules should feel like workspaces, not isolated admin screens.

## Workspace Concept

Routes under `/admin` use the shared shell:

- `/admin` — Office Home
- `/admin/season` — Season Operations
- `/admin/matchday` — Matchday Operations
- `/admin/transfers` — future Transfer Office
- `/admin/import` — future Import Office
- `/admin/managers` — future Manager Office
- `/admin/players` — future Player Office
- `/admin/system` — future System Office

The Office Home shows large module cards that link into operational areas. This
keeps navigation task-oriented and avoids a generic CRUD administration menu.

## Components

The shell is composed from reusable components:

- `AdminShell`
- `AdminNavigation`
- `AdminHeader`
- `AdminContext`

These components live in `app/components/admin-shell/`.

The nested route layout `app/app/admin/layout.tsx` applies the shell to all
current and future `/admin` routes.

## Boundaries

The shell does not call engines, write to the database or introduce business
rules. Existing route pages continue to own their application-service and
repository loading paths.
