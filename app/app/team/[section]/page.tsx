import Link from "next/link";
import { notFound } from "next/navigation";

import { CockpitSection } from "@/components/cockpit/cockpit-section";
import { PlaceholderPage } from "@/components/placeholder-page";
import { loadCurrentTeamOverview } from "@/application/team-service";
import type { TeamOverviewSnapshot } from "@/application/team-service";

const sections = {
  squad: {
    title: "Kader",
    description: "Die Kaderübersicht wird in einem zukünftigen Sprint ergänzt.",
    icon: "team",
  },
  kader: {
    title: "Kader",
    description: "Die Kaderübersicht wird in einem zukünftigen Sprint ergänzt.",
    icon: "team",
  },
  matches: {
    title: "Spiele",
    description: "Spielplan und Begegnungen werden in einem zukünftigen Sprint ergänzt.",
    icon: "calendar",
  },
  spiele: {
    title: "Spiele",
    description: "Spielplan und Begegnungen werden in einem zukünftigen Sprint ergänzt.",
    icon: "calendar",
  },
  history: {
    title: "Historie",
    description: "Die Managerhistorie wird in einem zukünftigen Sprint ergänzt.",
    icon: "chart",
  },
  historie: {
    title: "Historie",
    description: "Die Managerhistorie wird in einem zukünftigen Sprint ergänzt.",
    icon: "chart",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function TeamSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams?: Promise<{ managerSeasonId?: string }>;
}) {
  const { section } = await params;
  const query = await searchParams;
  const page = sections[section as keyof typeof sections];

  if (!page) {
    notFound();
  }

  if (section === "squad" || section === "kader") {
    const snapshot = await loadCurrentTeamOverview({
      managerSeasonId: query?.managerSeasonId,
    });

    return <SquadOverviewPage snapshot={snapshot} />;
  }

  if (section === "matches" || section === "spiele") {
    const snapshot = await loadCurrentTeamOverview({
      managerSeasonId: query?.managerSeasonId,
    });

    return <SpieleOverviewPage snapshot={snapshot} />;
  }

  return (
    <PlaceholderPage
      eyebrow="Mein Team"
      title={page.title}
      description={page.description}
      icon={page.icon}
    />
  );
}

function SpieleOverviewPage({
  snapshot,
}: {
  snapshot: TeamOverviewSnapshot;
}) {
  const hasLivingFixtures = snapshot.fixtures.all.length > 0;
  const nextFixture = snapshot.fixtures.next;
  const scheduleRows = snapshot.fixtures.all.map((fixture) => ({
        matchday: `ST ${fixture.matchday}`,
        opponent: fixture.opponent,
        venue: fixture.venue === "HOME" ? "Heim" : "Auswärts",
        result: fixture.result?.label ?? "–",
        resultTone: getResultTone(fixture.result),
        status: getFixtureStatusLabel(fixture),
        action: fixture.result ? "Analyse" : null,
        href: fixture.result
          ? createAnalysisHref(fixture.matchday, fixture.id, snapshot.manager.managerSeasonId)
          : null,
      }));
  const calculatedFixtures = snapshot.fixtures.all.filter((fixture) => fixture.result);
  const wins = calculatedFixtures.filter(
    (fixture) =>
      fixture.result && fixture.result.goalsFor > fixture.result.goalsAgainst,
  ).length;
  const draws = calculatedFixtures.filter(
    (fixture) =>
      fixture.result && fixture.result.goalsFor === fixture.result.goalsAgainst,
  ).length;
  const losses = calculatedFixtures.filter(
    (fixture) =>
      fixture.result && fixture.result.goalsFor < fixture.result.goalsAgainst,
  ).length;
  const seasonRecord = [
    { label: "Geplant", value: String(snapshot.fixtures.all.length), icon: "•", tone: "neutral" },
    { label: "Berechnet", value: String(calculatedFixtures.length), icon: "=", tone: "neutral" },
    { label: "Siege", value: String(wins), icon: "✓", tone: "positive" },
    { label: "Unentschieden", value: String(draws), icon: "=", tone: "neutral" },
    { label: "Niederlagen", value: String(losses), icon: "×", tone: "negative" },
  ] as const;

  return (
    <div className="cockpit cockpit-terminal matches-overview">
        <div className="squad-page-header">
          <div>
            <span>Mein Team / Spiele</span>
            <h1>Spiele</h1>
            <p>
              {hasLivingFixtures
                ? "Dein echter Liga-1-Spielplan aus Prisma. Ergebnisse werden noch nicht berechnet."
                : "Kein Living-Spielplan für den ausgewählten Manager verfügbar."}
            </p>
          </div>
          <div className="squad-season-badge">
            <span>Saison {snapshot.season.name}</span>
            <strong>{nextFixture ? `ST ${nextFixture.matchday}` : "—"}</strong>
          </div>
        </div>

        <CockpitSection index="01" title="Top Area">
          <div className="matches-top-grid">
            <article className="next-match-card">
              <div className="next-match-main">
                <div className="opponent-visuals" aria-hidden="true">
                  <span className="opponent-crest-placeholder" />
                </div>
                <div className="next-match-copy">
                  <span>Nächstes Spiel</span>
                  <h2>{nextFixture?.opponent ?? "Noch nicht verfügbar"}</h2>
                  <small>
                    {nextFixture ? getFixtureStatusLabel(nextFixture) : "Keine Berechnung vorhanden"}
                  </small>
                  <div className="next-match-meta">
                    <b>{nextFixture ? `ST ${nextFixture.matchday}` : "—"}</b>
                    <b>
                      {nextFixture
                        ? nextFixture.venue === "HOME"
                          ? "Heim"
                          : "Auswärts"
                        : "—"}
                    </b>
                    <span className="match-status ausstehend">
                      {nextFixture ? getFixtureStatusLabel(nextFixture) : "Noch nicht berechnet"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="next-match-side">
                <span className="opponent-manager-placeholder" aria-hidden="true" />
                <button type="button">Vorschau →</button>
              </div>
            </article>

            <article className="season-balance-card">
              <header>
                <span>Saisonbilanz</span>
              </header>
              <div className="season-record-grid">
                {seasonRecord.map((item) => (
                  <div className={`season-record-card ${item.tone}`} key={item.label}>
                    <span aria-hidden="true">{item.icon}</span>
                    <strong>{item.value}</strong>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </CockpitSection>

        <CockpitSection index="02" title="Spielplan">
          <div className="match-schedule-card">
            <header className="match-schedule-header">
              <span>Spielplan</span>
            </header>
            <table className="match-schedule-table">
              <thead>
                <tr>
                  <th>ST</th>
                  <th>Gegner</th>
                  <th>Heim/Auswärts</th>
                  <th>Ergebnis</th>
                  <th>Status</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {scheduleRows.map((match) => (
                  <tr key={match.matchday}>
                    <td>{match.matchday}</td>
                    <td>
                      <div className="schedule-opponent-cell">
                        <span className="schedule-crest-placeholder" aria-hidden="true" />
                        <strong>{match.opponent}</strong>
                      </div>
                    </td>
                    <td>{match.venue}</td>
                    <td>
                      <span className={`match-result ${match.resultTone}`}>
                        {match.result}
                      </span>
                    </td>
                    <td>
                      <span className={`match-status ${match.status.toLowerCase()}`}>
                        {match.status}
                      </span>
                    </td>
                    <td>
                      {match.href ? (
                        <Link href={match.href}>{match.action} →</Link>
                      ) : match.action ? (
                        <button type="button">{match.action} →</button>
                      ) : (
                        <span className="disabled-action">–</span>
                      )}
                    </td>
                  </tr>
                ))}
                {scheduleRows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>Keine Living Fixtures vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CockpitSection>
    </div>
  );
}
function SquadOverviewPage({ snapshot }: { snapshot: TeamOverviewSnapshot }) {
  const squadRows = snapshot.squad.map((slot) => ({
    initials: getInitials(slot.displayName),
    name: slot.displayName,
    position: slot.positionGroup,
    positionLabel: positionLabels[slot.positionGroup],
    club: slot.bundesligaClub,
    slotId: slot.slotId,
    marketValue: formatMarketValue(slot.marketValue),
    status: formatPlayerStatus(slot.status),
    stats: slot.stats,
  }));
  const totalMarketValue = snapshot.squad.reduce(
    (sum, slot) => sum + slot.marketValue,
    0,
  );
  const unavailableCards = createUnavailableDecisionCards();

  return (
    <div className="squad-overview figma-kader-page">
      <div className="squad-page-header">
        <div>
          <span>Mein Team › Kader</span>
          <h1>Kader</h1>
          <p>
            Wie gut ist dein aktueller Kader aufgestellt?
          </p>
        </div>
        <div className="squad-season-badge">
          <span>Saison angezeigt</span>
          <strong>{snapshot.season.name}</strong>
        </div>
      </div>

      <section className="figma-kader-section">
        <SectionLabel number="01" label="Kaderstatus" />
        <div className="squad-status-grid">
          {createSquadStatus(snapshot, totalMarketValue).map((item) => (
            <article className={`squad-status-card ${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.support}</p>
              <b>{item.badge}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="figma-kader-section">
        <SectionLabel number="02" label="Deine Entscheidungen" />
        <div className="decision-review-grid">
          {unavailableCards.map((item) => (
            <article className="decision-card" key={item.label}>
              <header>
                <span>{item.label}</span>
                <b className={item.tone}>{item.badge}</b>
              </header>
              <div className="decision-player">
                <span className={`decision-avatar ${item.tone}`}>
                  {item.initials}
                </span>
                <strong>{item.title}</strong>
                <span className="decision-insight">{item.insight}</span>
              </div>
              <div className="decision-metrics">
                <strong>{item.keyNumber}</strong>
                <span>{item.metric}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="figma-kader-section">
        <SectionLabel number="03" label="Mannschaftsteile" />
        <div className="position-unit-grid">
          {snapshot.liveSummary.positions.map((unit) => (
            <article className="position-unit-card" key={unit.position}>
              <header>
                <span>{positionLabels[unit.position]}</span>
                <b className={unit.count === unit.expectedCount ? "positive" : "negative"}>
                  {unit.count}/{unit.expectedCount} Spieler
                </b>
              </header>
              <strong>{formatMarketValue(unit.marketValue)}</strong>
              <span className="unit-sparkline">{unit.count} aktive Slots</span>
              <div>
                <span>{formatMarketValue(unit.marketValue)} Kaderwert</span>
                <b>
                  {unit.count === unit.expectedCount
                    ? "Struktur vollständig"
                    : "Struktur prüfen"}
                </b>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="figma-kader-section">
        <SectionLabel number="04" label="Spielerkader" />
        <div className="squad-table-card">
          <div className="squad-table-wrap">
            <table className="squad-player-table">
              <thead>
                <tr>
                  <th>Spieler</th>
                  <th>Pos.</th>
                  <th>Trend</th>
                  <th>Status</th>
                  <th>Einsätze</th>
                  <th>Ø Note</th>
                  <th>Pkt./Spiel</th>
                  <th>Tore</th>
                  <th>Karten</th>
                  <th>Elf d. Tages</th>
                  <th>Gesamtpunkte</th>
                  <th>Marktwert</th>
                </tr>
              </thead>
              <tbody>
                {squadRows.map((player) => (
                  <tr key={`${player.slotId}-${player.name}`}>
                    <td>
                      <div className="squad-player-cell">
                        <span className="squad-player-avatar" aria-hidden="true">
                          {player.initials}
                        </span>
                        <div>
                          <strong>{player.name}</strong>
                          <span>Slot {player.slotId} · {player.club}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="squad-position-badge">
                        {player.positionLabel}
                      </span>
                    </td>
                    <td>
                      <span className="player-sparkline">—</span>
                    </td>
                    <td>
                      <span className={`player-status ${player.status.tone}`}>
                        {player.status.label}
                      </span>
                    </td>
                    <td>{formatOptionalNumber(player.stats?.appearances)}</td>
                    <td>{formatOptionalRating(player.stats?.averageRating)}</td>
                    <td>—</td>
                    <td>{formatOptionalNumber(player.stats?.goals)}</td>
                    <td>{formatCardSummary(player.stats)}</td>
                    <td>
                      {player.stats?.teamOfTheWeek ? (
                        <span className="team-of-week-badge">
                          ★ {player.stats.teamOfTheWeek}×
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <strong>{formatOptionalNumber(player.stats?.totalPoints)}</strong>
                    </td>
                    <td>{player.marketValue}</td>
                  </tr>
                ))}
                {squadRows.length === 0 ? (
                  <tr>
                    <td colSpan={12}>Keine realen Kaderdaten verfügbar.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="figma-section-label">
      <span>{number}</span>
      <strong>{label}</strong>
    </div>
  );
}

const positionLabels: Record<
  TeamOverviewSnapshot["liveSummary"]["positions"][number]["position"],
  string
> = {
  AB: "Abwehr",
  MF: "Mittelfeld",
  ST: "Sturm",
  TW: "Torwart",
};

function createUnavailableDecisionCards() {
  return [
    {
      label: "Best Value",
      title: "Noch nicht berechenbar",
      initials: "—",
      keyNumber: "—",
      metric: "Keine Live-Punktequelle",
      insight: "Player Master liefert Marktwerte, aber noch keine Saisonpunkte.",
      badge: "Keine Quelle",
      tone: "negative",
    },
    {
      label: "Enttäuschung",
      title: "Noch nicht berechenbar",
      initials: "—",
      keyNumber: "—",
      metric: "Keine Erwartungswerte",
      insight: "Bewertungen werden erst mit offizieller Performancequelle aktiv.",
      badge: "Keine Quelle",
      tone: "negative",
    },
    {
      label: "Wichtigster Spieler",
      title: "Noch nicht berechenbar",
      initials: "—",
      keyNumber: "—",
      metric: "Keine Teampunkte",
      insight: "Keine Dummywerte, bis offizielle Punkte im Team-Service vorliegen.",
      badge: "Keine Quelle",
      tone: "negative",
    },
  ] as const;
}

function createSquadStatus(
  snapshot: TeamOverviewSnapshot,
  totalMarketValue: number,
) {
  const completePositions = snapshot.liveSummary.positions.filter(
    (unit) => unit.count === unit.expectedCount,
  ).length;
  const nextFixture = snapshot.fixtures.next;

  return [
    {
      label: "Kaderwert",
      value: formatMarketValue(totalMarketValue),
      support: "Summe offizieller Marktwerte",
      badge: snapshot.dataSource === "DATABASE" ? "Living DB" : "Fixture",
      tone: "positive",
    },
    {
      label: "Restbudget",
      value: snapshot.manager.budget === null
        ? "—"
        : formatMarketValue(snapshot.manager.budget),
      support: "Aktuelles ManagerSeason-Budget",
      badge: snapshot.manager.budget === null ? "Keine Quelle" : "Aktiv",
      tone: snapshot.manager.budget === null ? "negative" : "positive",
    },
    {
      label: "Spieler",
      value: String(snapshot.squad.length),
      support: "Aktuelle SquadAssignments",
      badge: snapshot.squad.length === 18 ? "Vollständig" : "Prüfen",
      tone: snapshot.squad.length === 18 ? "positive" : "negative",
    },
    {
      label: "Struktur",
      value: `${completePositions}/4`,
      support: "Vollständige Mannschaftsteile",
      badge: completePositions === 4 ? "OK" : "Prüfen",
      tone: completePositions === 4 ? "positive" : "negative",
    },
    {
      label: "Quelle",
      value: snapshot.dataSource === "DATABASE" ? "Live" : "Fixture",
      support: "Datenherkunft dieses Kaders",
      badge: snapshot.dataSource === "DATABASE" ? "Real" : "Fallback",
      tone: snapshot.dataSource === "DATABASE" ? "positive" : "negative",
    },
    {
      label: "Nächstes Spiel",
      value: nextFixture ? `ST ${nextFixture.matchday}` : "—",
      support: nextFixture ? `vs ${nextFixture.opponent}` : "Keine Fixture",
      badge: nextFixture ? "Geplant" : "Offen",
      tone: nextFixture ? "positive" : "negative",
    },
  ] as const;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.at(0)?.toUpperCase() ?? "")
    .join("");
}

function formatPlayerStatus(status: TeamOverviewSnapshot["squad"][number]["status"]) {
  if (status === "ACTIVE") {
    return { label: "Aktiv", tone: "active" };
  }

  if (status === "LEFT_BUNDESLIGA") {
    return { label: "Bundesliga verlassen", tone: "warning" };
  }

  return { label: "Inaktiv", tone: "inactive" };
}

function formatOptionalNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}

function formatOptionalRating(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

function formatCardSummary(
  stats: TeamOverviewSnapshot["squad"][number]["stats"] | null | undefined,
): string {
  if (!stats) {
    return "—";
  }

  if (stats.yellowRedCards === 0 && stats.redCards === 0) {
    return "0";
  }

  return `${stats.yellowRedCards}/${stats.redCards}`;
}

function formatMarketValue(value: number): string {
  return `${value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} Mio. €`;
}

function getResultTone(result: TeamOverviewSnapshot["fixtures"]["all"][number]["result"]) {
  if (!result) {
    return "neutral";
  }

  if (result.goalsFor > result.goalsAgainst) {
    return "win";
  }

  if (result.goalsFor < result.goalsAgainst) {
    return "loss";
  }

  return "draw";
}

function getFixtureStatusLabel(
  fixture: TeamOverviewSnapshot["fixtures"]["all"][number],
) {
  if (fixture.result?.invalidTeam === "SELF") {
    return "Team ungültig";
  }

  if (fixture.result?.invalidTeam === "OPPONENT") {
    return "Gegner ungültig";
  }

  if (fixture.visibilityStatus === "PUBLISHED_OFFICIAL") {
    return "Offiziell";
  }

  if (fixture.visibilityStatus === "PUBLISHED_PRELIMINARY") {
    return "Korrekturen vorbehalten";
  }

  if (fixture.visibilityStatus === "CALCULATED_UNPUBLISHED") {
    return "Noch nicht veröffentlicht";
  }

  return "Noch nicht berechnet";
}

function createAnalysisHref(
  matchday: number,
  fixtureId: string,
  managerSeasonId: string | null,
) {
  const params = new URLSearchParams({ fixtureId });

  if (managerSeasonId) {
    params.set("managerSeasonId", managerSeasonId);
  }

  return `/team/spiele/${matchday}/analyse?${params.toString()}`;
}
