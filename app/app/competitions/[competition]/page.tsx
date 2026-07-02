import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import type { ReactNode } from "react";

import {
  officialCompetitionExcelFixture,
  secondLeagueCompetitionFixture,
} from "@/domain/competition-overview/fixture";
import type { OfficialCompetitionOverview } from "@/domain/competition-overview";
import type { BmsEvent } from "@/types/events";

const competitions = {
  "erste-liga": "Erste Liga",
  "zweite-liga": "Zweite Liga",
  pokal: "Pokal",
  europapokal: "Europapokal",
  supercup: "Supercup",
} as const;

type CompetitionKey = keyof typeof competitions;
type FormResult = "W" | "D" | "L";

type Fixture = {
  home: string;
  homeManager: string;
  homeTeamId?: string;
  away: string;
  awayManager: string;
  awayTeamId?: string;
  result: string;
  status: string;
  href?: string;
};

type MatchdayEventBadge = {
  fixtureKey: string;
  label: string;
};

type Standing = {
  teamId?: string;
  rank: number;
  club: string;
  manager: string;
  played: number;
  goals: string;
  points: number;
  form: FormResult[];
  zone: "leader" | "international" | "relegation" | "bottom" | "neutral" | "qualified" | "chasing";
};

type StoryTeam = Pick<Standing, "rank" | "club" | "manager" | "points">;

type StoryOfTheWeek =
  | { type: "leader-changed"; headline: string; leader: StoryTeam; previousLeader?: StoryTeam }
  | { type: "title-race"; headline: string; leader: StoryTeam; challenger: StoryTeam; gap: number }
  | { type: "international"; headline: string; teams: StoryTeam[] }
  | { type: "relegation"; headline: string; teams: StoryTeam[]; gap: number }
  | { type: "leader-pullaway"; headline: string; leader: StoryTeam; lead: number }
  | { type: "upset"; headline: string; winner: StoryTeam; loser: StoryTeam; result: string }
  | { type: "streak"; headline: string; team: StoryTeam; streak: number }
  | { type: "default"; headline: string };

type EditorialStory = {
  summary: string;
  analysisHref: string;
};

type TensionZone = {
  label: string;
  story: string;
  context: string;
};

const europeanFixtures: Fixture[] = [
  { home: "Adler Europa", homeManager: "Adler Manager", away: "Bochum Europe", awayManager: "Bochum Manager", result: "9 : 8", status: "Ausgewertet" },
  { home: "Borussia Europe", homeManager: "Borussia Manager", away: "Freiburg Europe", awayManager: "Freiburg Manager", result: "10 : 10", status: "Ausgewertet" },
  { home: "München Europe", homeManager: "Bayern Manager", away: "BMS United", awayManager: "Patrick", result: "12 : 11", status: "Ausgewertet" },
  { home: "Köln Europe", homeManager: "Köln Manager", away: "Mainz Europe", awayManager: "Mainz Manager", result: "7 : 8", status: "Ausgewertet" },
];

const europeanTable: Standing[] = [
  { rank: 1, club: "Adler Europa", manager: "Adler Manager", played: 5, goals: "312:281", points: 13, form: ["W", "W", "D", "W", "W"], zone: "qualified" },
  { rank: 2, club: "München Europe", manager: "Bayern Manager", played: 5, goals: "299:276", points: 11, form: ["W", "D", "W", "L", "W"], zone: "qualified" },
  { rank: 3, club: "BMS United", manager: "Patrick", played: 5, goals: "291:280", points: 9, form: ["W", "W", "L", "D", "L"], zone: "qualified" },
  { rank: 4, club: "Borussia Europe", manager: "Borussia Manager", played: 5, goals: "286:279", points: 8, form: ["L", "W", "D", "W", "D"], zone: "qualified" },
  { rank: 5, club: "Bochum Europe", manager: "Bochum Manager", played: 5, goals: "281:288", points: 7, form: ["W", "L", "W", "D", "L"], zone: "chasing" },
  { rank: 6, club: "Freiburg Europe", manager: "Freiburg Manager", played: 5, goals: "270:292", points: 5, form: ["D", "L", "W", "L", "D"], zone: "neutral" },
];

const cupFixtures: Fixture[] = [
  { home: "FC Adler", homeManager: "Adler Manager", away: "Mainz", awayManager: "Mainz Manager", result: "–", status: "Ausgelost" },
  { home: "Borussia", homeManager: "Borussia Manager", away: "Bochum", awayManager: "Bochum Manager", result: "–", status: "Ausgelost" },
  { home: "München", homeManager: "Bayern Manager", away: "Köln", awayManager: "Köln Manager", result: "–", status: "Ausgelost" },
  { home: "Bremen", homeManager: "Bremen Manager", away: "Hamburg", awayManager: "Hamburg Manager", result: "–", status: "Ausgelost" },
];

const bracketRounds = [
  { round: "Achtelfinale", teams: ["FC Adler", "Borussia", "München", "Bochum", "Mainz", "Bremen", "Hamburg", "Köln"] },
  { round: "Viertelfinale", teams: ["FC Adler", "Mainz", "Borussia", "Bochum", "München", "Köln", "Bremen", "Hamburg"] },
  { round: "Halbfinale", teams: ["Sieger VF 1", "Sieger VF 2", "Sieger VF 3", "Sieger VF 4"] },
  { round: "Finale", teams: ["Sieger HF 1", "Sieger HF 2"] },
] as const;

function Section({ index, title, children, id }: { index: string; title: string; children: ReactNode; id?: string }) {
  return (
    <section className="league-section" id={id}>
      <div className="league-section-heading">
        <span>{index}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function getStoryTeam(team: Standing): StoryTeam {
  return {
    rank: team.rank,
    club: team.club,
    manager: team.manager,
    points: team.points,
  };
}

function getTeamId(club: string): string {
  return club
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getStandingByTeamId(standings: Standing[], teamId: string): Standing | undefined {
  return standings.find((team) => (team.teamId ?? getTeamId(team.club)) === teamId);
}

function getPayloadString(event: BmsEvent, key: string): string | undefined {
  const value = event.payload[key];

  return typeof value === "string" ? value : undefined;
}

function getPayloadNumber(event: BmsEvent, key: string): number | undefined {
  const value = event.payload[key];

  return typeof value === "number" ? value : undefined;
}

function getFixtureKey(fixture: Fixture): string {
  return `${fixture.home}|${fixture.away}`;
}

function formatResult(result: string): string {
  return result.replace(/\s+/g, "");
}

function parseFixtureResult(result: string) {
  const [home, away] = result.split(":").map((value) => Number(value.trim()));

  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) {
    return null;
  }

  return { home, away };
}

function getFixtureWinner(fixture: Fixture): string | null {
  const result = parseFixtureResult(fixture.result);

  if (!result) {
    return null;
  }

  return result.home > result.away ? fixture.home : fixture.away;
}

function getEuropeanStory(): StoryOfTheWeek {
  const qualificationBattle = europeanTable.filter((team) => team.rank >= 3 && team.rank <= 6);

  return {
    type: "international",
    headline: "⭐ Kampf um die Top 4",
    teams: qualificationBattle.map(getStoryTeam),
  };
}

function getFixtureForTeam(fixtures: Fixture[], teamId: string): Fixture | undefined {
  return fixtures.find((fixture) => (
    (fixture.homeTeamId ?? getTeamId(fixture.home)) === teamId
    || (fixture.awayTeamId ?? getTeamId(fixture.away)) === teamId
  ));
}

function getHeroWhy(event: BmsEvent | null, standings: Standing[], fixtures: Fixture[]): string {
  if (!event) {
    return "Aktuelle Ligadaten bleiben ohne dominantes Ereignis.";
  }

  if (event.type === "LEADER_CHANGED") {
    const newLeaderTeamId = getPayloadString(event, "newLeaderTeamId");
    const previousLeaderTeamId = getPayloadString(event, "previousLeaderTeamId");
    const fixture = newLeaderTeamId ? getFixtureForTeam(fixtures, newLeaderTeamId) : undefined;
    const winner = fixture ? getFixtureWinner(fixture) : null;
    const newLeader = newLeaderTeamId ? getStandingByTeamId(standings, newLeaderTeamId) : undefined;
    const previousLeader = previousLeaderTeamId ? getStandingByTeamId(standings, previousLeaderTeamId) : undefined;

    if (fixture && winner) {
      const loser = winner === fixture.home ? fixture.away : fixture.home;
      const leadershipChange = newLeader && previousLeader
        ? ` und verdrängt ${previousLeader.club} von der Tabellenspitze`
        : "";

      return `${winner} schlägt ${loser} ${formatResult(fixture.result)}${leadershipChange}.`;
    }

    return newLeader ? `${newLeader.club} übernimmt Platz 1.` : "Die Spitze der Tabelle wechselt.";
  }

  if (event.type === "TITLE_RACE_CLOSE") {
    const gap = getPayloadNumber(event, "gap") ?? 0;

    return `Platz 1 und Platz 2 trennen ${gap} Punkt${gap === 1 ? "" : "e"}.`;
  }

  if (event.type === "RELEGATION_BATTLE_CLOSE" || event.type === "EUROPE_BATTLE_CLOSE") {
    const spread = getPayloadNumber(event, "pointSpread") ?? 0;

    return `${event.relatedTeamIds.length} Teams liegen innerhalb von ${spread} Punkt${spread === 1 ? "" : "en"}.`;
  }

  if (event.type === "LEADER_PULLS_AWAY" || event.type === "CHAMPIONSHIP_DECIDED") {
    const gap = getPayloadNumber(event, "gap") ?? 0;

    return `Der Tabellenführer liegt ${gap} Punkt${gap === 1 ? "" : "e"} vorne.`;
  }

  if (event.type === "MATCHDAY_SURPRISE") {
    const winnerTeamId = getPayloadString(event, "winnerTeamId");
    const loserTeamId = getPayloadString(event, "loserTeamId");
    const winner = winnerTeamId ? getStandingByTeamId(standings, winnerTeamId) : undefined;
    const loser = loserTeamId ? getStandingByTeamId(standings, loserTeamId) : undefined;
    const result = getPayloadString(event, "result") ?? "–";

    return winner && loser ? `${winner.club} schlägt ${loser.club} ${result}.` : "Ein Außenseiter gewinnt gegen ein Topteam.";
  }

  return "Das Ereignis wird aus den aktuellen Wettbewerbsdaten berechnet.";
}

function getEditorialStory(event: BmsEvent | null, standings: Standing[], fixtures: Fixture[]): EditorialStory {
  return {
    summary: getHeroWhy(event, standings, fixtures),
    analysisHref: fixtures.find((fixture) => fixture.href)?.href ?? "/team/spiele",
  };
}

function getTeamsFromEvent(event: BmsEvent, standings: Standing[]): StoryTeam[] {
  return event.relatedTeamIds.flatMap((teamId) => {
    const team = getStandingByTeamId(standings, teamId);

    return team ? [getStoryTeam(team)] : [];
  });
}

function getStoryFromHeroEvent(event: BmsEvent | null, standings: Standing[]): StoryOfTheWeek {
  if (!event) {
    return { type: "default", headline: "Standard League Header" };
  }

  if (event.type === "LEADER_CHANGED") {
    const newLeaderTeamId = getPayloadString(event, "newLeaderTeamId");
    const previousLeaderTeamId = getPayloadString(event, "previousLeaderTeamId");
    const leader = newLeaderTeamId ? getStandingByTeamId(standings, newLeaderTeamId) : undefined;
    const previousLeader = previousLeaderTeamId ? getStandingByTeamId(standings, previousLeaderTeamId) : undefined;

    if (leader) {
      return {
        type: "leader-changed",
        headline: event.title,
        leader: getStoryTeam(leader),
        previousLeader: previousLeader ? getStoryTeam(previousLeader) : undefined,
      };
    }
  }

  if (event.type === "TITLE_RACE_CLOSE") {
    const leaderTeamId = getPayloadString(event, "leaderTeamId");
    const challengerTeamId = getPayloadString(event, "challengerTeamId");
    const gap = getPayloadNumber(event, "gap") ?? 0;
    const leader = leaderTeamId ? getStandingByTeamId(standings, leaderTeamId) : undefined;
    const challenger = challengerTeamId ? getStandingByTeamId(standings, challengerTeamId) : undefined;

    if (leader && challenger) {
      return {
        type: "title-race",
        headline: event.title,
        leader: getStoryTeam(leader),
        challenger: getStoryTeam(challenger),
        gap,
      };
    }
  }

  if (event.type === "EUROPE_BATTLE_CLOSE") {
    return {
      type: "international",
      headline: event.title,
      teams: getTeamsFromEvent(event, standings),
    };
  }

  if (event.type === "RELEGATION_BATTLE_CLOSE") {
    return {
      type: "relegation",
      headline: event.title,
      teams: getTeamsFromEvent(event, standings),
      gap: getPayloadNumber(event, "pointSpread") ?? 0,
    };
  }

  if (event.type === "LEADER_PULLS_AWAY" || event.type === "CHAMPIONSHIP_DECIDED") {
    const leaderTeamId = getPayloadString(event, "leaderTeamId");
    const leader = leaderTeamId ? getStandingByTeamId(standings, leaderTeamId) : undefined;

    if (leader) {
      return {
        type: "leader-pullaway",
        headline: event.title,
        leader: getStoryTeam(leader),
        lead: getPayloadNumber(event, "gap") ?? 0,
      };
    }
  }

  if (event.type === "MATCHDAY_SURPRISE") {
    const winnerTeamId = getPayloadString(event, "winnerTeamId");
    const loserTeamId = getPayloadString(event, "loserTeamId");
    const winner = winnerTeamId ? getStandingByTeamId(standings, winnerTeamId) : undefined;
    const loser = loserTeamId ? getStandingByTeamId(standings, loserTeamId) : undefined;
    const result = getPayloadString(event, "result") ?? "–";

    if (winner && loser) {
      return {
        type: "upset",
        headline: event.title,
        winner: getStoryTeam(winner),
        loser: getStoryTeam(loser),
        result,
      };
    }
  }

  return { type: "default", headline: event.title };
}

function getHighlightedTeamIds(event: BmsEvent | null): string[] {
  return event?.relatedTeamIds ?? [];
}

function CrestWithTeam({ team }: { team: StoryTeam }) {
  return (
    <div className="story-team-card">
      <span className="league-crest-placeholder" aria-hidden="true" />
      <div>
        <small>Platz {team.rank}</small>
        <strong>{team.club}</strong>
        <p>{team.manager}</p>
      </div>
      <b>{team.points} Pkt</b>
    </div>
  );
}

function StoryVisualization({ story, title, meta }: { story: StoryOfTheWeek; title: string; meta: string }) {
  if (story.type === "leader-changed") {
    return (
      <div className="story-race-grid">
        {story.previousLeader ? <CrestWithTeam team={story.previousLeader} /> : <div className="story-team-card"><strong>Vorherige Spitze</strong></div>}
        <span className="story-vs">→</span>
        <CrestWithTeam team={story.leader} />
        <span className="story-gap">Neue Tabellenführung</span>
      </div>
    );
  }

  if (story.type === "title-race") {
    return (
      <div className="story-race-grid">
        <CrestWithTeam team={story.leader} />
        <span className="story-vs">vs</span>
        <CrestWithTeam team={story.challenger} />
        <span className="story-gap">Abstand {story.gap} Punkt{story.gap === 1 ? "" : "e"}</span>
      </div>
    );
  }

  if (story.type === "international") {
    return (
      <div className="story-table-excerpt">
        {story.teams.map((team) => (
          <Fragment key={team.club}>
            <div className="story-table-row">
              <span>{team.rank}</span>
              <span className="league-crest-placeholder small" aria-hidden="true" />
              <strong>{team.club}</strong>
              <b>{team.points}</b>
            </div>
            {team.rank === 4 ? <div className="story-qualification-line">Qualifikationslinie</div> : null}
          </Fragment>
        ))}
      </div>
    );
  }

  if (story.type === "relegation") {
    return (
      <div className="story-table-excerpt relegation">
        {story.teams.map((team) => (
          <div className="story-table-row" key={team.club}>
            <span>{team.rank}</span>
            <span className="league-crest-placeholder small" aria-hidden="true" />
            <strong>{team.club}</strong>
            <b>{team.points}</b>
          </div>
        ))}
        <div className="story-qualification-line">Abstand {story.gap} Punkte</div>
      </div>
    );
  }

  if (story.type === "leader-pullaway") {
    return (
      <div className="story-leader-panel">
        <CrestWithTeam team={story.leader} />
        <div>
          <span>{story.lead}</span>
          <p>Punkte Vorsprung</p>
        </div>
      </div>
    );
  }

  if (story.type === "upset") {
    return (
      <div className="story-upset-grid">
        <CrestWithTeam team={story.winner} />
        <strong>{story.result}</strong>
        <CrestWithTeam team={story.loser} />
      </div>
    );
  }

  if (story.type === "streak") {
    return (
      <div className="story-streak-card">
        <CrestWithTeam team={story.team} />
        <div>
          <span>{story.streak}</span>
          <p>Siege in Serie</p>
        </div>
      </div>
    );
  }

  return (
    <div className="story-default-card">
      <span className="story-default-crest" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{meta}</p>
      </div>
    </div>
  );
}

function CompetitionHero({
  title,
  meta,
  badge,
  story,
  editorialStory,
}: {
  title: string;
  meta: string;
  badge: string;
  story: StoryOfTheWeek;
  editorialStory?: EditorialStory;
}) {
  return (
    <header className="league-header">
      <div>
        <span>Wettbewerbe</span>
        <h1>{title.toUpperCase()}</h1>
        <p>{meta}</p>
      </div>
      <div className="league-badge">
        <span>Wettbewerb</span>
        <strong>{badge}</strong>
      </div>
      <article className={`story-week-card story-${story.type}${editorialStory ? " story-editorial" : ""}`}>
        <div className="story-week-copy">
          <span>Geschichte der Woche</span>
          <strong>{story.headline}</strong>
          {editorialStory ? (
            <>
              <p>{editorialStory.summary}</p>
              <div className="story-week-actions">
                <Link className="story-primary-action" href={editorialStory.analysisHref}>Analyse Spiel →</Link>
                <Link className="story-secondary-action" href="#tabellenstand">Tabelle ansehen</Link>
              </div>
            </>
          ) : (
            <p>{title} · {meta}</p>
          )}
        </div>
        <StoryVisualization story={story} title={title} meta={meta} />
      </article>
    </header>
  );
}

function MatchdayResults({ fixtures, eventBadges = [] }: { fixtures: Fixture[]; eventBadges?: MatchdayEventBadge[] }) {
  return (
    <div className="league-fixtures-card">
      {fixtures.map((fixture) => {
        const eventBadge = eventBadges.find((badge) => badge.fixtureKey === getFixtureKey(fixture));
        const content = (
          <>
            <div className="league-fixture-team">
              <span className="league-crest-placeholder" aria-hidden="true" />
              <div>
                <strong>{fixture.home}</strong>
                <small>{fixture.homeManager}</small>
              </div>
            </div>
            <div className="league-fixture-score">
              <strong className="league-fixture-result">{fixture.result}</strong>
              {eventBadge && fixture.href ? <span className="league-analysis-link">Analyse →</span> : null}
            </div>
            <div className="league-fixture-team away">
              <span className="league-crest-placeholder" aria-hidden="true" />
              <div>
                <strong>{fixture.away}</strong>
                <small>{fixture.awayManager}</small>
              </div>
            </div>
            <span className="league-status">{fixture.status}</span>
            <div className="league-fixture-event">
              {eventBadge ? <span className="league-event-badge">{eventBadge.label}</span> : null}
            </div>
          </>
        );

        return fixture.href ? (
          <Link className="league-fixture-row" href={fixture.href} key={`${fixture.home}-${fixture.away}`}>
            {content}
          </Link>
        ) : (
          <div className="league-fixture-row" key={`${fixture.home}-${fixture.away}`}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function LeagueTable({ rows, highlightedTeamIds = [], showQualificationLine = false }: { rows: Standing[]; highlightedTeamIds?: string[]; showQualificationLine?: boolean }) {
  const highlightedTeams = new Set(highlightedTeamIds);

  return (
    <div className="league-table-card">
      <table className="league-table">
        <thead>
          <tr>
            <th>Platz</th>
            <th>Wappen</th>
            <th>Verein</th>
            <th>Manager</th>
            <th>Spiele</th>
            <th>Tore</th>
            <th>Punkte</th>
            <th>Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((team) => (
            <Fragment key={team.club}>
              <tr className={`league-zone-${team.zone}${highlightedTeams.has(team.teamId ?? getTeamId(team.club)) ? " league-story-highlight" : ""}`}>
                <td>{team.rank}</td>
                <td><span className="league-crest-placeholder small" aria-hidden="true" /></td>
                <td><strong>{team.club}</strong></td>
                <td>{team.manager}</td>
                <td>{team.played}</td>
                <td>{team.goals}</td>
                <td><strong>{team.points}</strong></td>
                <td>
                  <div className="league-form">
                    {team.form.map((result, index) => (
                      <span className={result.toLowerCase()} key={`${team.club}-${result}-${index}`}>{result}</span>
                    ))}
                  </div>
                </td>
              </tr>
              {showQualificationLine && team.rank === 4 ? (
                <tr className="qualification-line-row">
                  <td colSpan={8}>Top 4 qualifizieren sich für das Halbfinale.</td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TensionZones({ zones }: { zones: readonly TensionZone[] }) {
  return (
    <div className="league-tension-grid">
      {zones.map((zone) => (
        <article className="league-tension-card" key={zone.label}>
          <span>{zone.label}</span>
          <strong>{zone.story}</strong>
          <p>{zone.context}</p>
        </article>
      ))}
    </div>
  );
}

function LeaderboardCards({
  items,
}: {
  items: readonly { label: string; value: string; detail: string }[];
}) {
  return (
    <div className="league-leaderboard-grid">
      {items.map((item) => (
        <article className="league-leaderboard-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </article>
      ))}
    </div>
  );
}

function KnockoutBracket() {
  return (
    <div className="knockout-bracket">
      {bracketRounds.map((round) => (
        <article className="knockout-round" key={round.round}>
          <span>{round.round}</span>
          <div>
            {round.teams.map((team) => (
              <p key={`${round.round}-${team}`}>
                <span className="league-crest-placeholder small" aria-hidden="true" />
                {team}
              </p>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function DrawStatusCard() {
  return (
    <article className="draw-status-card">
      <span>Auslosung</span>
      <strong>Nächste Auslosung nach Abschluss des Viertelfinals.</strong>
      <p>Halbfinale wird im Anschluss automatisch gezogen.</p>
    </article>
  );
}

function PlayoffPreview() {
  return (
    <div className="playoff-preview-grid">
      <article><span>Halbfinale 1</span><strong>1 vs 4</strong><p>Platz 1 gegen Platz 4</p></article>
      <article><span>Halbfinale 2</span><strong>2 vs 3</strong><p>Platz 2 gegen Platz 3</p></article>
    </div>
  );
}

function OfficialLeagueCompetitionView({
  data,
  title,
}: {
  data: OfficialCompetitionOverview;
  title: string;
}) {
  const fixtures: Fixture[] = data.fixtures;
  const table: Standing[] = data.standings;
  const story = getStoryFromHeroEvent(data.heroEvent, table);
  const editorialStory = getEditorialStory(data.heroEvent, table, fixtures);

  return (
    <div className="league-center">
      <CompetitionHero
        badge={title}
        editorialStory={editorialStory}
        meta={`Spieltag ${data.matchday}`}
        story={story}
        title={title}
      />
      <Section index="01" title="Spannungszonen">
        <TensionZones zones={data.tensionZones} />
      </Section>
      <Section index="02" title="Spieltagsergebnisse">
        <MatchdayResults fixtures={fixtures} eventBadges={data.eventBadges} />
      </Section>
      <Section index="03" title="Tabelle" id="tabellenstand">
        <LeagueTable
          highlightedTeamIds={getHighlightedTeamIds(data.heroEvent)}
          rows={table}
        />
      </Section>
      <Section index="04" title="Liga-Leaderboards">
        <LeaderboardCards items={data.leaderboards} />
      </Section>
    </div>
  );
}

function CupCompetitionView() {
  return (
    <div className="league-center">
      <CompetitionHero title="Pokal" meta="Viertelfinale · 8 Teams verbleiben" badge="Knockout" story={{ type: "default", headline: "Viertelfinale ausgelost." }} />
      <Section index="01" title="Aktuelle Runde"><MatchdayResults fixtures={cupFixtures} /></Section>
      <Section index="02" title="Turnierbaum"><KnockoutBracket /></Section>
      <Section index="03" title="Draw Status"><DrawStatusCard /></Section>
    </div>
  );
}

function EuropeanCompetitionView() {
  return (
    <div className="league-center">
      <CompetitionHero title="Europapokal" meta="League Phase · Spieltag 5 von 8" badge="Top 4" story={getEuropeanStory()} />
      <Section index="01" title="Der Spieltag"><MatchdayResults fixtures={europeanFixtures} /></Section>
      <Section index="02" title="Europapokal-Tabelle"><LeagueTable rows={europeanTable} showQualificationLine /></Section>
      <Section index="03" title="Qualification Line"><article className="qualification-card"><strong>Top 4 qualifizieren sich für das Halbfinale.</strong><p>Aktuell trennt Platz 4 und 5 nur ein Punkt.</p></article></Section>
      <Section index="04" title="Playoff Preview"><PlayoffPreview /></Section>
    </div>
  );
}

function SupercupCompetitionView() {
  return (
    <div className="league-center">
      <CompetitionHero title="Supercup" meta="Final · Saison 2026/27" badge="One Match" story={{ type: "default", headline: "Meister trifft Pokalsieger." }} />
      <Section index="01" title="Match Card">
        <MatchdayResults fixtures={[{ home: "FC Adler", homeManager: "Meister", away: "Borussia", awayManager: "Pokalsieger", result: "–", status: "Geplant" }]} />
      </Section>
      <Section index="02" title="Status"><article className="draw-status-card"><span>Status</span><strong>Supercup terminiert.</strong><p>Finale wird nach Abschluss der Saison ausgespielt.</p></article></Section>
    </div>
  );
}

export function generateStaticParams() {
  return Object.keys(competitions).map((competition) => ({ competition }));
}

export default async function CompetitionPage({ params }: { params: Promise<{ competition: string }> }) {
  const { competition } = await params;
  const title = competitions[competition as CompetitionKey];

  if (!title) {
    notFound();
  }

  if (competition === "erste-liga") {
    return (
      <OfficialLeagueCompetitionView
        data={officialCompetitionExcelFixture}
        title={title}
      />
    );
  }

  if (competition === "zweite-liga") {
    return (
      <OfficialLeagueCompetitionView
        data={secondLeagueCompetitionFixture}
        title={title}
      />
    );
  }

  if (competition === "pokal") {
    return <CupCompetitionView />;
  }

  if (competition === "europapokal") {
    return <EuropeanCompetitionView />;
  }

  return <SupercupCompetitionView />;
}
