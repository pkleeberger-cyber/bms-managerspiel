# BMS Event Rulebook

## 1. Purpose

The BMS Event Engine detects meaningful sporting events from matchday and competition data.

It answers:

> What is the most important story this week?

The Event Engine is the deterministic foundation for:

- Competition Hero
- News
- History
- Season timeline
- Matchday summaries

## 2. Core Principle

Events are calculated from data.

No manual writing.
No AI generation.
No admin effort.

Every event must be reproducible from the same input data and rule version.

## 3. Event Output Model

Each event has:

- `id`
- `type`
- `category`
- `title`
- `priority`
- `severity`
- `scope`
- `validFor`
- `relatedCompetitionId`
- `relatedManagerIds`
- `relatedTeamIds`
- `matchday`
- `payload`

The `payload` contains only structured values needed to render the event later.
It must not contain free-form generated prose.

## 4. Event Categories

Initial categories:

- `league`
- `matchday`
- `club`
- `player`
- `cup`
- `european`
- `record`

## 5. Priority Logic

Events are ranked by numeric `priority`.

The highest-priority event becomes the Competition Hero.

Other high-priority events can later be used for News, History and Timelines.

Priority examples:

- `CHAMPIONSHIP_DECIDED`: `1000`
- `LEADER_CHANGED`: `120`
- `TITLE_RACE_CLOSE`: `95`
- `RELEGATION_BATTLE_CLOSE`: `90`
- `EUROPE_BATTLE_CLOSE`: `85`
- `MATCHDAY_SURPRISE`: `80`

## 6. Validity

Events have an explicit validity window.

Examples:

- Tabellenführung gewechselt: valid for 1 matchday
- Meisterschaft entschieden: valid until season end
- Pokalsieger: permanent history event

Validity is part of the event output so rendering systems can decide where and how long an event appears.

## 7. Initial League Rules

### TITLE_RACE_CLOSE

Condition:

`points(place 1) - points(place 2) <= 3`

Output:

- `type`: `TITLE_RACE_CLOSE`
- `title`: `Meisterrennen spitzt sich zu`
- `category`: `league`
- `priority`: `95`

### LEADER_CHANGED

Condition:

Current place 1 differs from previous place 1.

Output:

- `type`: `LEADER_CHANGED`
- `title`: `Tabellenführung gewechselt`
- `category`: `league`
- `priority`: `120`

### LEADER_PULLS_AWAY

Condition:

`points(place 1) - points(place 2) >= 6`

Output:

- `type`: `LEADER_PULLS_AWAY`
- `title`: `Tabellenführer setzt sich ab`
- `category`: `league`
- `priority`: `90`

### EUROPE_BATTLE_CLOSE

Condition:

Places 3 to 6 are within 3 points.

Output:

- `type`: `EUROPE_BATTLE_CLOSE`
- `title`: `Kampf um Europa`
- `category`: `league`
- `priority`: `85`

### RELEGATION_BATTLE_CLOSE

Condition:

Relevant lower-table places are within 3 points.

Output:

- `type`: `RELEGATION_BATTLE_CLOSE`
- `title`: `Abstiegskampf wird dramatisch`
- `category`: `league`
- `priority`: `90`

### MATCHDAY_SURPRISE

Condition:

A team ranked at least 10 places lower beats a Top 3 team.

Output:

- `type`: `MATCHDAY_SURPRISE`
- `title`: `Überraschung des Spieltags`
- `category`: `matchday`
- `priority`: `80`

### CHAMPIONSHIP_DECIDED

Condition:

Leader advantage is greater than maximum remaining points.

Output:

- `type`: `CHAMPIONSHIP_DECIDED`
- `title`: `Meisterschaft entschieden`
- `category`: `league`
- `priority`: `1000`
- `validFor`: `season`

## 8. Initial Cup Rules

Placeholder rules:

- `CUP_ROUND_COMPLETED`
- `CUP_DRAW_READY`
- `CUP_FINAL_SET`
- `CUP_WINNER_DECIDED`

Cup events use knockout state. They must not produce league-table stories.

## 9. Initial European Rules

Placeholder rules:

- `EURO_TOP4_CLOSE`
- `EURO_QUALIFICATION_LINE_CLOSE`
- `EURO_SEMIFINALS_SET`
- `EURO_FINAL_SET`
- `EURO_WINNER_DECIDED`

European events use phase state:

- `league_phase`
- `semifinal`
- `final`

## 10. Example

Input:

- leader changed
- title race close
- relegation battle close

Generated events:

- `LEADER_CHANGED`, priority `120`
- `TITLE_RACE_CLOSE`, priority `95`
- `RELEGATION_BATTLE_CLOSE`, priority `90`

Hero Event:

`Tabellenführung gewechselt`

Reason:

Priority `120` beats `95` and `90`.
