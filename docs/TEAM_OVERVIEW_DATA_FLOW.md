# Team Overview Data Flow

## Purpose

The `/team` area now uses one shared Living Team context. The selected
`managerSeasonId` drives the Team header, overview, Kader, Spiele, transfer
center and transfer workspace.

`TeamService` is the page data boundary for manager-facing team identity, squad
data and fixtures. It loads the selected `ManagerSeason`, current
`SquadAssignment` records and Living Fixtures from Prisma before falling back to
clearly labeled fixture data only when no live source exists.

## Pipeline

```text
React

↓

ManagerContextService

↓

TeamService

↓

SquadRepository + LivingFixtureRepository

↓

Prisma ManagerSeason + SquadAssignments + Competition + Fixtures

↓

TeamOverviewSnapshot
```

`ManagerContextService` is the temporary context boundary while login users are
not linked to managers yet. It loads active `ManagerSeason` records for the
active season, resolves the selected `managerSeasonId`, and falls back to the
first active manager season if no selection exists. It also preloads lightweight
Team header summaries for every selectable manager:

- manager name,
- league,
- manager-season status,
- budget,
- current matchday from Living Fixtures,
- next scheduled fixture,
- last calculated fixture if one exists,
- current squad size,
- current squad market value.

`TeamService` is the team data boundary. It loads:

- the active season,
- the selected `ManagerSeason`,
- the current squad assignments,
- player master fields such as club, position group and market value,
- live manager-season fields such as league, budget, status, participation,
  transfer status and lifecycle,
- selected-manager fixtures from `Competition` and `Fixture`.

`TeamService` also projects shared summary fields used by both overview and
Kader:

- total squad market value,
- current player count and expected count,
- position counts and position market values,
- explicit `NOT_AVAILABLE` status for starter/bench roles because no live source
  exists yet,
- next fixture,
- last fixture when a non-scheduled fixture exists,
- the full selected-manager season schedule.

`createTeamOverviewData()` remains only as an internal fallback payload for the
legacy fixture path. When `TeamService` returns a Living DB snapshot, the
overview renders Living Team sections and does not render historical match,
table, form or analysis cards.

## Temporary Manager Context

The complete `/team` area accepts `managerSeasonId` as a query parameter:

```text
/team/overview?managerSeasonId=...
/team/kader?managerSeasonId=...
/team/transfers?managerSeasonId=...
/team/transfers/workspace?managerSeasonId=...
```

The compact selector lives in the shared Team shell. It exists because migrated
managers are not linked to future login users yet. Selecting a manager updates
the current URL with the selected `managerSeasonId`. Team navigation preserves
this query parameter across overview, Kader, Spiele, transfer center and
transfer workspace.

If no `managerSeasonId` exists, `ManagerContextService` selects the first active
manager season. The Team shell renders internal links with that selected id, so
the temporary context is stable as soon as the user navigates inside `/team`.

Future authentication will replace this selector with:

```text
current user

↓

linked Manager

↓

current ManagerSeason
```

Admin and data-maintainer users may remain unlinked. Manager users will resolve
to exactly one `Manager`.

## Living Squad

The current squad comes from `SquadAssignment` records with open validity
(`validToMatchday = null`). The repository preserves official slot order:

- `1-2` Torwart,
- `3-7` Abwehr,
- `8-14` Mittelfeld,
- `15-18` Sturm.

The Kader page displays real Player Master values:

- player name,
- Bundesliga club,
- position group,
- player status,
- market value,
- official slot ID.

When `PlayerMatchData` exists for the selected season, `/team/kader` also
projects persisted player statistics into the squad table:

- saved match-data appearances,
- goals,
- yellow-red/red card counts,
- average Kicker rating from saved ratings,
- Team of the Week count.

Player total points are not persisted as a season aggregate. The Kader page
therefore renders `—` for points and points per game until an official
persisted source exists. It does not rerun the scoring engine or invent
derived values.

The overview page uses the same snapshot and therefore the same total market
value as Kader. It also renders manager name, league, manager-season status,
budget and transfer status from the selected `ManagerSeason`.

## Living Team Header

The Team header is rendered inside the shared `/team` shell and selected on the
client from the same `managerSeasonId` query parameter as the pages. It displays
only Prisma-backed data where available:

- manager name and initials,
- season and league,
- manager-season status,
- current matchday from Living Fixtures,
- next scheduled fixture,
- last calculated fixture if available,
- current squad market value,
- squad count,
- ManagerSeason budget.

The global legacy `ManagerHeader` is hidden for `/team/*` routes so static
prototype values such as hardcoded manager names, points, goals or form do not
appear in the Team area.

## Living Fixtures

`TeamService` loads selected-manager fixtures through
`LivingFixtureRepository.loadManagerFixtures(managerSeasonId)`.

`/team/spiele` displays:

- next match from Living Fixtures,
- last match only when a non-scheduled fixture exists,
- the full season schedule for the selected manager,
- status `Noch nicht berechnet`,
- empty result cells.

No result, league points or table movement is inferred from the imported
schedule. Analyse routes under `/team/spiele/[matchday]` render explicit
"not yet calculated" placeholders until Matchday calculation creates real
results.

Decision-evaluation cards that previously used prototype players now render an
explicit "not calculable" state. There is no live source yet for season points,
expectation values, best-value player, biggest disappointment or most important
player.

## Fixture Fallback

If Prisma is unavailable, no active `ManagerSeason` exists, or no squad
assignments exist, `TeamService` returns the existing lineup fixture snapshot.
This keeps the manager-facing pages renderable while the Living Database is
completed.

Fixture fallback is internally labeled as `FIXTURE` and rendered as a fallback
source, not as a real manager. No page should introduce new dummy manager names
or dummy player evaluations.

## Team Page Audit

| Page | Live source | Fixture fallback | Not yet calculable |
| --- | --- | --- | --- |
| `/team/overview` | Manager name, league, manager-season status, budget, transfer status, current squad, position structure, player count, Kaderwert, next fixture, last fixture and selected-manager schedule from `TeamService`. | Full page falls back to the lineup fixture only when the live squad cannot be loaded. | Starter/bench roles, player performance evaluations, calculated match results, league table position and form. |
| `/team/kader` | Current squad rows, Player Master club/position/status/market value, position structure, Kaderwert and persisted `PlayerMatchData` stats from the same `TeamService` snapshot as overview. | Full page falls back to the lineup fixture only when the live squad cannot be loaded. | Best-value player, disappointment, key player, season points and points per game until an official persisted source exists. |
| `/team/transfers` | Selected manager, budget, transfer status, player count and current Kaderwert from `TeamService`. | Uses the same `TeamService` fixture fallback if the live context is unavailable. | Transfer budget derivation, free/additional/mandatory transfer counts, used transfer count, Bundesliga departures and draft state. |
| `/team/transfers/workspace` | Shared `managerSeasonId`, selected manager, current squad, position structure, slot roles, player clubs, market values, budget and transfer status come from the same `TeamService` snapshot as overview and Kader. | Uses the same explicit `TeamService` fixture fallback with an internal/dev warning when no Prisma squad exists. | Transfer-market candidates, mandatory replacements, transfer planning, validation and submission are not connected to live persistence. |
| `/team/history` and `/team/historie` | Shared `managerSeasonId` is preserved by the Team shell. | Placeholder only. | Historical manager timeline. |
| `/team/spiele` | Shared `managerSeasonId`, next fixture, full schedule and status come from `TeamService` and Living Fixtures. | No prototype schedule is rendered when Living Fixtures are missing. | Calculated results, last match, W/D/L balance and analysis actions. |
| `/team/spiele/[matchday]/analyse` | Shared Team shell context and selected `managerSeasonId`. | Explicit "not yet calculated" placeholder. | Selected-manager analysis lookup after Matchday calculation. |

## Official Matchday Data

The official snapshot supplies:

- competition and matchday;
- official score and result;
- the applied-rule indicator;
- current and previous league position;
- position change;
- league points;
- official form.

Official matchday data is not used for Living Team pages until real Matchday
calculation exists for the imported schedule.

## Match Analysis Data

The analysis snapshot supplies:

- the largest position disadvantage explaining the loss;
- all four stored position duels;
- best and worst home player;
- replacement and missing-position counts;
- biggest individual duel slot;
- manual penalty count.

## React Boundary

`ManagerCockpit` and the Kader table receive already-projected data. React maps
enums to German labels, formats values, and preserves interaction and layout.

React does not calculate:

- official scores or outcomes;
- league positions, points, or form;
- position totals, differences, or winners;
- best or worst players;
- replacements, missing positions, or match factors.

Squad data and selected-manager fixtures are no longer sourced from static
manager-facing fixtures when Prisma provides the selected manager season,
current squad and imported Liga-1 schedule.
