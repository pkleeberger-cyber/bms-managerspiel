# Persistence Layer

Die BMS-Engines bleiben reine Domain-Module. Sie importieren kein Prisma, kennen keine Datenbankverbindung und schreiben keine Daten. Persistenz liegt außerhalb der Engine und wird über Repository-Ports angebunden.

## Ziel

Die erste Persistenzschicht verbindet:

Domain

↓

Repository

↓

Prisma

Im aktuellen Stand liefern die Repositories noch Fixture-Daten. Die Interfaces entsprechen aber bereits der späteren Prisma-Nutzung.

## Dependency Rule

Erlaubte Richtung:

React

↓

Application Service

↓

Repository

↓

Prisma

Nicht erlaubt:

React

↓

Prisma

React-Komponenten dürfen keine Prisma-Queries ausführen und keine Engine-Snapshots selbst zusammensetzen.

## Repository Pattern

Die Repositories liegen in `app/infrastructure/`:

- `matchday-repository.ts`
- `season-repository.ts`
- `competition-repository.ts`

Sie enthalten keine Fachlogik und keine Berechnungen. Ihre Aufgabe ist nur:

- Daten laden,
- Daten speichern,
- Domain-Objekte auf persistierbare Strukturen vorbereiten,
- später Prisma-Aufrufe kapseln.

## Matchday Repository

`MatchdayRepository` unterstützt:

- `loadMatchday`
- `loadLatestVersion`
- `loadLifecycle`
- `saveVersion`
- `saveOfficialMatchday`
- `saveCalculationSnapshot`

Die aktuelle `FixtureMatchdayRepository` nutzt `operationalMatchdayLifecycleFixture`. Dadurch funktioniert die bestehende Lifecycle-UI weiter, während die Schnittstelle bereits persistent gedacht ist.

## Season Repository

`SeasonRepository` unterstützt:

- `loadActiveSeason`
- `loadSeason`

Der Fixture-Adapter liefert die aktive Saison aus dem Lifecycle-Fixture.

## Competition Repository

`CompetitionRepository` unterstützt:

- `loadCompetition`
- `loadCurrentMatchday`

Der Fixture-Adapter liefert die aktuelle Liga und den aktiven Spieltag aus dem Lifecycle-Fixture.

## Prisma-Modelle

Das Prisma-Schema enthält Persistenzmodelle für:

- `MatchdayLifecycle`
- `MatchdayVersion`

`MatchdayLifecycle` speichert den aktuellen operativen Zustand eines Spieltags. `MatchdayVersion` speichert jeden Berechnungs- und Veröffentlichungszyklus. Historische Versionen werden nie überschrieben.

Komplexe Outputs wie Calculation Snapshot und Official Matchday werden initial als JSON gespeichert:

- `calculationSnapshotJson`
- `officialMatchdayJson`
- `correctionPlanJson`

Das verhindert frühe Übernormalisierung, solange die Engine-Ausgabe noch fachlich stabilisiert wird.

## Warum Engines kein Prisma importieren

Die Engine muss deterministisch bleiben:

- gleiche Eingabe,
- gleiche Ausgabe,
- keine Datenbank-Seiteneffekte,
- keine versteckten Abhängigkeiten.

Persistenz wird daher um die Engine gelegt. Ein Application Service lädt Daten über Repositories, ruft die Domain Engine auf und speichert Ergebnisse wieder über Repositories.

## Nächster Schritt

Die Fixture-Repositories können später durch Prisma-Implementierungen ersetzt werden, ohne Domain-Types oder UI-Komponenten umzubauen. Die aktuellen Interfaces sind der stabile Vertrag für diese Migration.

## First Live Repository

Der erste Live-Adapter ist `PrismaMatchdayRepository`.

Der neue Leseweg für den Spieltagsleitstand ist:

React

↓

`MatchdayOperationsService`

↓

`MatchdayRepository`

↓

Prisma

Die React-Seite `/admin/matchday` importiert keine Fixture mehr und kennt Prisma nicht. Sie lädt über `MatchdayOperationsService` ein `OperationalMatchdayLifecycleSnapshot`. Dieses Objekt ist identisch zur vorherigen Fixture-Struktur, damit die UI unverändert rendern kann.

`PrismaMatchdayRepository` liest:

1. aktive Saison,
2. aktiven Wettbewerb,
3. aktuellen Matchday Lifecycle,
4. aktuelle Version und Version-History.

Wenn keine persistenten Daten existieren oder die lokale Datenbank nicht erreichbar ist, liefert `PrismaMatchdayRepository` `null`. Der `MatchdayOperationsService` fällt dann auf `FixtureMatchdayRepository` zurück. Dadurch bleibt die Entwicklung stabil, während die Persistenz schrittweise befüllt wird.

Der Live-Adapter ist bewusst read-only:

- keine Creates,
- keine Updates,
- keine Deletes,
- keine Engine-Ausführung.

Writes bleiben für spätere Sprints getrennt.

## Operational Matchday Seed

`app/scripts/seed-operational-matchday.ts` legt den ersten minimalen operativen Datensatz für den Spieltagsleitstand an:

- aktive Saison `2026/27`,
- aktiven Wettbewerb `Erste Liga` mit Typ `LEAGUE_1`,
- `MatchdayLifecycle` für Spieltag `18` im Status `PUBLISHED_PRELIMINARY`,
- drei `MatchdayVersion`-Einträge bis zur aktuellen Version `3`.

Der Seed ist idempotent. Saison, Wettbewerb, Lifecycle und Versionen werden über die Prisma-Unique-Keys per Upsert angelegt oder aktualisiert, damit mehrfache Läufe keine Duplikate erzeugen.

Ausführen:

```bash
npm run seed:operational-matchday
```

Wenn lokal keine MongoDB-Verbindungszeichenfolge über `DATABASE_URL` oder `MONGODB_URI` konfiguriert ist, beendet sich der Seed mit einer klaren Meldung ohne Datenbankänderung. Der Fixture-Fallback bleibt davon unberührt.

`/admin/matchday` liest weiterhin über `MatchdayOperationsService` und `PrismaMatchdayRepository`. Existieren die Seed-Daten, rendert der Leitstand den persistenten Lifecycle. Existieren sie nicht oder ist die Datenbank nicht erreichbar, liefert `FixtureMatchdayRepository` weiter den bisherigen Fixture-Zustand.

## Operational Data Flow

Der operative Live-Pfad fuer den Spieltagsleitstand ist:

Database

↓

`PrismaMatchdayRepository`

↓

`MatchdayOperationsService`

↓

UI

`PrismaMatchdayRepository` liest die aktive Saison, den aktiven Wettbewerb, den aktuellen `MatchdayLifecycle` und die zugehoerigen `MatchdayVersion`-Eintraege aus MongoDB. Wenn ein Lifecycle gefunden wird, gibt der Service `dataSource: "DATABASE"` zusammen mit dem Snapshot zurueck. Die UI rendert diesen Snapshot und zeigt im Hero die temporaere Quelle `Datenbank`.

Nur wenn Prisma keinen operativen Lifecycle findet oder die Datenbank nicht erreichbar ist, fragt der Service das Fixture-Repository ab. In diesem Fall gibt er `dataSource: "FIXTURE"` zurueck und die UI zeigt `Fixture` als Quelle. Die Fixture-Daten bleiben damit ein Notfall-Fallback und ersetzen keine vorhandenen Seed-Daten.

## Season Operations Flow

Der Saisonleitstand nutzt denselben Architekturpfad wie der Spieltagsleitstand:

React

↓

`SeasonOperationsService`

↓

`CompetitionRepository`

↓

Prisma

↓

`CompetitionLifecycle`

`PrismaCompetitionRepository` liest die aktive Saison, aktive Wettbewerbe und den
aktuellen Lifecycle-Snapshot pro Wettbewerb. Der Repository-Adapter führt keinen
Fixture-Fallback aus. Wenn keine aktive Saison, keine aktiven Wettbewerbe oder
keine Lifecycle-Daten geladen werden können, liefert er `null`.

Der Fallback liegt ausschließlich im `SeasonOperationsService`. Der Service
versucht zuerst den Prisma-Repository-Pfad. Wenn dieser kein vollständiges
operatives Snapshot liefert, verwendet er die Fixture-Snapshots aus
`competition-lifecycle` und gibt `dataSource: "FIXTURE"` zurück.

Die React-Seite `/admin/season` importiert keine Fixture-Daten mehr direkt. Sie
lädt über `SeasonOperationsService`, rendert weiterhin dieselben Karten und zeigt
temporär die Quelle:

- `🟢 Datenbank`
- `🟡 Fixture`

Der Season Repository Pfad ist read-only. Create-, Update- und Delete-Methoden
sind als zukünftige Schnittstelle im `CompetitionRepository` vorbereitet, aber
bewusst noch nicht implementiert. Es gibt weiterhin keine Datenbank-Schreibvorgänge
und keine Engine-Aufrufe im Saisonleitstand.

## Operational Season Seed

`app/scripts/seed-season-operations.ts` legt den ersten operativen Datensatz für
den Saisonleitstand an.

Ausführen:

```bash
npm run seed:season
```

Der Seed erstellt oder aktualisiert idempotent:

- die aktive Saison `2026/27`,
- die Wettbewerbe `Erste Liga`, `Zweite Liga`, `Pokal`, `Europapokal` und
  `Supercup`,
- einen persistierten `CompetitionLifecycle` pro Wettbewerb,
- `progressPercent`, `availableActions`, `completedActions`,
  `nextRecommendedAction` und realistische Timeline-Einträge.

Die initialen Lifecycle-Stände sind:

- `Erste Liga`: `READY`
- `Zweite Liga`: `FIXTURE_GENERATED`
- `Pokal`: `DRAW_REQUIRED`
- `Europapokal`: `PARTICIPANTS_REQUIRED`
- `Supercup`: `READY`

Wenn keine MongoDB-Verbindungszeichenfolge über `DATABASE_URL` oder `MONGODB_URI`
konfiguriert ist, beendet sich der Seed mit einer klaren Meldung. Der
Fixture-Fallback bleibt unverändert.

Nach erfolgreichem Seed liest `/admin/season` über
`SeasonOperationsService → CompetitionRepository → Prisma` die aktive Saison,
die Wettbewerbe und ihre `CompetitionLifecycle`-Snapshots. Die Quelle im Hero
zeigt dann `🟢 Datenbank`. Wenn die Datenbank leer oder nicht erreichbar ist,
verwendet der Service weiterhin Fixture-Daten und zeigt `🟡 Fixture`.
