# User Manager Linking

## Purpose

The BMS separates login accounts from the operational manager identity.

- `User` is the future login account.
- `Manager` is the permanent BMS team identity.
- `ManagerSeason` is the season-specific participation of that manager.

## Migration Managers

Migrated managers can exist without users. This is intentional because historical
and operational data must remain valid before authentication is implemented.

## Manager Users

A normal manager user links to exactly one `Manager`.

The relation is optional while migration is incomplete:

- `User.managerId` is nullable.
- `User.managerId` is unique.
- `Manager.user` is optional.

This allows one-to-one linking without requiring every migrated manager to have
an account immediately.

## Admin and Data Maintainer Users

`ADMIN` and `DATA_MAINTAINER` users do not need a manager link. They operate the
BMS Office, not a manager team.

## No Authentication Yet

This foundation does not implement:

- passwords
- sessions
- login UI
- authorization checks

It only prepares the data model, repository methods, and administration screens
for later authentication work.
