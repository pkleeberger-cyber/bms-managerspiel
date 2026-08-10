import Link from "next/link";

import type {
  AnalysisPlayer,
  AnalysisWinner,
  MatchAnalysis,
  PositionDuel,
} from "@/domain/match-analysis-engine";
import type { BmsRule } from "@/domain/rules-engine";

const positionLabels = {
  goalkeeper: "Torwart",
  defender: "Abwehr",
  midfielder: "Mittelfeld",
  forward: "Sturm",
} as const;

const summaryPositionLabels = {
  forward: "Angriff",
  midfielder: "Mittelfeld",
  defender: "Abwehr",
  goalkeeper: "Torwart",
} as const;

const summaryPositionIcons = {
  forward: "⚽",
  midfielder: "🎯",
  defender: "🛡",
  goalkeeper: "🧤",
} as const;

const positionGroupLabels = {
  goalkeeper: "Torwart",
  defender: "Abwehr",
  midfielder: "Mittelfeld",
  forward: "Sturm",
} as const;

const ruleLabels: Record<BmsRule["type"], string> = {
  TEAM_INVALID: "Ungültiges Team",
  TEAM_PENALTY: "Teamstrafe",
  POINT_ADJUSTMENT: "Punkteanpassung",
  MATCH_OVERRIDE: "Ergebnisanpassung",
  ADMIN_NOTE: "Administrativer Hinweis",
};

type MatchSide = "HOME" | "AWAY";
type Tone = "positive" | "negative" | "neutral";

type RuleImpact = {
  label: string;
  detail: string;
  points: number;
  tone: Tone;
  alwaysShow?: boolean;
};

type TimelineEvent = {
  affectedManagers: string[];
  icon: string;
  label: string;
  subject: string;
  points: number;
  tone: Tone;
};

function getWinnerLabel(winner: AnalysisWinner | null, analysis: MatchAnalysis): string {
  if (winner === "HOME") {
    return analysis.homeTeam.teamName;
  }

  if (winner === "AWAY") {
    return analysis.awayTeam.teamName;
  }

  return "Unentschieden";
}

function getMatchResultLabel(analysis: MatchAnalysis): string {
  if (analysis.winner === "HOME") {
    return `${analysis.homeTeam.teamName} gewinnt`;
  }

  if (analysis.winner === "AWAY") {
    return `${analysis.awayTeam.teamName} gewinnt`;
  }

  return "Unentschieden";
}

function getSideName(analysis: MatchAnalysis, side: MatchSide) {
  return side === "HOME" ? analysis.homeTeam.teamName : analysis.awayTeam.teamName;
}

function getSideManagerName(analysis: MatchAnalysis, side: MatchSide) {
  return side === "HOME" ? analysis.homeTeam.managerName : analysis.awayTeam.managerName;
}

function getSideTeam(analysis: MatchAnalysis, side: MatchSide) {
  return side === "HOME" ? analysis.homeTeam : analysis.awayTeam;
}

function getSideTone(side: MatchSide, analysis: MatchAnalysis): Tone {
  if (!analysis.winner) {
    return "neutral";
  }

  return analysis.winner === side ? "positive" : "negative";
}

function getPointTone(points: number): Tone {
  if (points > 0) {
    return "positive";
  }

  if (points < 0) {
    return "negative";
  }

  return "neutral";
}

function getTeamScoreLabel(analysis: MatchAnalysis, side: MatchSide) {
  const team = getSideTeam(analysis, side);
  return team.teamStatus === "INVALID"
    ? "Ungültig"
    : `${team.totalPoints} Punkte`;
}

function getPlayersForSide(analysis: MatchAnalysis, side: MatchSide) {
  return side === "HOME" ? analysis.players.home : analysis.players.away;
}

function ResultHero({
  analysis,
  competitionName,
}: {
  analysis: MatchAnalysis;
  competitionName: string;
}) {
  return (
    <section className="analysis-feature-hero" aria-labelledby="analysis-title">
      <div className={`analysis-hero-manager ${getSideTone("HOME", analysis)}`}>
        <span>Heim</span>
        <strong>{analysis.homeTeam.teamName}</strong>
        <small>{analysis.homeTeam.managerName}</small>
        {analysis.homeTeam.teamStatus === "INVALID" ? (
          <small>Team ungültig</small>
        ) : null}
      </div>

      <div className="analysis-hero-score">
        <span className="analysis-winner-badge">{getMatchResultLabel(analysis)}</span>
        <h1 id="analysis-title">
          {analysis.officialScore.home}
          <span>:</span>
          {analysis.officialScore.away}
        </h1>
        <div className="analysis-hero-meta">
          <div>
            <span>Wettbewerb</span>
            <strong>{competitionName}</strong>
          </div>
          <div>
            <span>Spieltag</span>
            <strong>Spieltag {analysis.matchday}</strong>
          </div>
          <div>
            <span>Gewinner</span>
            <strong>{getWinnerLabel(analysis.winner, analysis)}</strong>
          </div>
        </div>
        <div className="analysis-hero-actions">
          <Link href="/team/spiele">Zurück</Link>
        </div>
      </div>

      <div className={`analysis-hero-manager ${getSideTone("AWAY", analysis)}`}>
        <span>Auswärts</span>
        <strong>{analysis.awayTeam.teamName}</strong>
        <small>{analysis.awayTeam.managerName}</small>
        {analysis.awayTeam.teamStatus === "INVALID" ? (
          <small>Team ungültig</small>
        ) : null}
      </div>
    </section>
  );
}

function SummaryCard({
  analysis,
  duel,
}: {
  analysis: MatchAnalysis;
  duel: PositionDuel;
}) {
  const difference = duel.homePoints - duel.awayPoints;
  const tone = getPointTone(difference);

  return (
    <article className={`analysis-summary-card ${tone}`}>
      <span>
        {summaryPositionIcons[duel.position]} {summaryPositionLabels[duel.position]}
      </span>
      <div>
        <small>{analysis.homeTeam.teamName}</small>
        <strong>{duel.homePoints}</strong>
      </div>
      <div>
        <small>{analysis.awayTeam.teamName}</small>
        <strong>{duel.awayPoints}</strong>
      </div>
      <b>{formatDifference(difference)}</b>
      <em>{getWinnerLabel(duel.winner, analysis)}</em>
    </article>
  );
}

function MatchStory({
  analysis,
  decidingDuel,
}: {
  analysis: MatchAnalysis;
  decidingDuel: PositionDuel | null;
}) {
  return (
    <section className="analysis-story-card" aria-labelledby="analysis-story">
      <span>Warum hat der Manager gewonnen?</span>
      <h2 id="analysis-story">{buildMatchStory(analysis, decidingDuel)}</h2>
      <p>{buildMatchStoryDetail(analysis, decidingDuel)}</p>
    </section>
  );
}

function TopPerformerCard({
  badge,
  player,
  side,
  tone,
}: {
  badge: string;
  player: AnalysisPlayer | null;
  side: string;
  tone: Tone;
}) {
  return (
    <article className={`analysis-performer-card ${tone}`}>
      <div className="analysis-performer-copy">
        <span>{badge}</span>
        <h3>{player?.playerName ?? "Kein Spieler"}</h3>
        <small>{side}</small>
      </div>
      <div className="analysis-performer-stats">
        <strong>{player?.totalPoints ?? 0}</strong>
        <span>Punkte</span>
      </div>
      <div className="analysis-player-tags">
        <span>{player?.goals ?? 0} Tore</span>
        {player && hasCard(player) ? <span>{formatCards(player)}</span> : null}
        {player?.teamOfTheWeek ? <span>Elf des Tages</span> : null}
      </div>
    </article>
  );
}

function PlayerPerformanceRow({
  player,
}: {
  player: AnalysisPlayer;
}) {
  const tone = getPointTone(player.totalPoints);

  return (
    <div className={`analysis-player-row ${tone}`}>
      <strong>{player.playerName}</strong>
      <span>{formatRating(player.rating)}</span>
      <span>{player.goals}</span>
      <span>{hasCard(player) ? formatCards(player) : "—"}</span>
      <span>{formatSignedPoints(player.appearancePoints)}</span>
      <b>{formatSignedPoints(player.totalPoints)}</b>
    </div>
  );
}

function PlayerPerformanceHeader() {
  return (
    <div className="analysis-player-row head">
      <strong>Spieler</strong>
      <span>Note</span>
      <span>Tore</span>
      <span>Karten</span>
      <span>Einsatz</span>
      <span>Punkte</span>
    </div>
  );
}

function EmptyPlayerRow() {
  return (
    <div className="analysis-player-row neutral empty">
      <strong>Keine gewerteten Spieler</strong>
      <span>—</span>
      <span>0</span>
      <span>—</span>
      <span>0</span>
      <span>0</span>
    </div>
  );
}

function TeamPositionColumn({
  players,
  teamName,
}: {
  players: readonly AnalysisPlayer[];
  teamName: string;
}) {
  return (
    <div className="analysis-team-position-column">
      <header>{teamName}</header>
      <PlayerPerformanceHeader />
      {players.length > 0 ? (
        players.map((player) => (
          <PlayerPerformanceRow
            key={`${teamName}-${player.slotId}-${player.playerId}`}
            player={player}
          />
        ))
      ) : (
        <EmptyPlayerRow />
      )}
    </div>
  );
}

function TeamComparison({ analysis }: { analysis: MatchAnalysis }) {
  const homePlayers = getPlayersForSide(analysis, "HOME");
  const awayPlayers = getPlayersForSide(analysis, "AWAY");
  const homeTeam = getSideTeam(analysis, "HOME");
  const awayTeam = getSideTeam(analysis, "AWAY");

  return (
    <div className="analysis-team-comparison">
      <div className="analysis-team-comparison-header">
        <div>
          <span>HOME TEAM</span>
          <strong>{homeTeam.teamName}</strong>
          <small>{homeTeam.managerName}</small>
        </div>
        <b>vs</b>
        <div>
          <span>AWAY TEAM</span>
          <strong>{awayTeam.teamName}</strong>
          <small>{awayTeam.managerName}</small>
        </div>
      </div>
      <div className="analysis-team-comparison-score">
        <strong>{getTeamScoreLabel(analysis, "HOME")}</strong>
        <strong>{getTeamScoreLabel(analysis, "AWAY")}</strong>
      </div>
      {homeTeam.teamStatus === "INVALID" && homePlayers.length === 0 ? (
        <InvalidTeamPerformanceNotice
          reason={homeTeam.invalidReason}
          teamName={homeTeam.teamName}
        />
      ) : null}
      {awayTeam.teamStatus === "INVALID" && awayPlayers.length === 0 ? (
        <InvalidTeamPerformanceNotice
          reason={awayTeam.invalidReason}
          teamName={awayTeam.teamName}
        />
      ) : null}
      {(["goalkeeper", "defender", "midfielder", "forward"] as const).map(
        (position) => (
          <section className="analysis-position-versus" key={position}>
            <h3>{positionGroupLabels[position]}</h3>
            <div className="analysis-position-versus-grid">
              <TeamPositionColumn
                players={homePlayers.filter((player) => player.position === position)}
                teamName={homeTeam.teamName}
              />
              <TeamPositionColumn
                players={awayPlayers.filter((player) => player.position === position)}
                teamName={awayTeam.teamName}
              />
            </div>
          </section>
        ),
      )}
    </div>
  );
}

function InvalidTeamPerformanceNotice({
  teamName,
  reason,
}: {
  teamName: string;
  reason?: string;
}) {
  return (
    <article className="analysis-invalid-team-card">
      <span>Team ungültig</span>
      <strong>{teamName}</strong>
      <p>
        {reason ??
          "Diese Teamabgabe wurde administrativ als ungültig markiert."}
      </p>
    </article>
  );
}

function DebugScoringCard({
  managerName,
  players,
}: {
  managerName: string;
  players: readonly AnalysisPlayer[];
}) {
  return (
    <article className="analysis-debug-card">
      <header>
        <span>Debug</span>
        <h3>{managerName}</h3>
      </header>
      <div className="analysis-debug-list">
        {players.map((player) => (
          <div key={`${managerName}-debug-${player.sourceSlotId}-${player.playerId}`}>
            <strong>{player.playerName}</strong>
            <span>
              RawPlayerMatchData: Note {formatRating(player.rating)}, Tore {player.goals},
              GR {player.yellowRedCard ? "1" : "0"}, Rot {player.redCard ? "1" : "0"},
              Elf {player.teamOfTheWeek ? "1" : "0"}
            </span>
            <span>
              SquadAssignment: Quelle Slot {player.sourceSlotId}, gewertet für Slot{" "}
              {player.slotId}, {positionLabels[player.position]}
            </span>
            <span>
              ScoreContribution: Note {player.ratingPoints}; Einsatz{" "}
              {player.appearancePoints}; Tore {player.goalPoints}; Karten{" "}
              {player.cardPoints}; Elf {player.teamOfWeekPoints}; Total{" "}
              {player.totalPoints}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

export function MatchdayAnalysisDetail({
  analysis,
  competitionName,
}: {
  analysis: MatchAnalysis;
  competitionName: string;
}) {
  const ruleImpacts = buildRuleImpacts(analysis);
  const decidingDuel = getDecidingDuel(analysis);
  const timeline = buildSpecialEvents(analysis);
  const positionOrder = ["forward", "midfielder", "defender", "goalkeeper"] as const;

  return (
    <div className="cockpit matchday-analysis analysis-experience">
      <ResultHero analysis={analysis} competitionName={competitionName} />

      <section className="analysis-report-section" aria-labelledby="analysis-summary">
        <header className="analysis-report-heading">
          <span>Warum ging das Spiel so aus?</span>
          <h2 id="analysis-summary">Die vier Mannschaftsteile</h2>
        </header>
        <div className="analysis-summary-grid">
          {positionOrder.map((position) => {
            const duel = analysis.positionAnalysis.find(
              (item) => item.position === position,
            );

            return duel ? (
              <SummaryCard analysis={analysis} duel={duel} key={position} />
            ) : null;
          })}
        </div>
      </section>

      <section className="analysis-report-section" aria-labelledby="analysis-teams">
        <header className="analysis-report-heading">
          <span>Teamvergleich</span>
          <h2 id="analysis-teams">Direkter Vergleich</h2>
        </header>
        <TeamComparison analysis={analysis} />
      </section>

      <section className="analysis-report-section" aria-labelledby="analysis-top-players">
        <header className="analysis-report-heading">
          <span>Topspieler</span>
          <h2 id="analysis-top-players">Wer den Unterschied machte</h2>
        </header>
        <div className="analysis-performer-grid">
          <TopPerformerCard
            badge="Spieler des Spiels"
            player={analysis.matchWinners.overallMatchwinner?.player ?? null}
            side={
              analysis.matchWinners.overallMatchwinner
                ? getSideName(analysis, analysis.matchWinners.overallMatchwinner.side)
                : "Unentschieden"
            }
            tone="positive"
          />
          <TopPerformerCard
            badge="Bester Heimspieler"
            player={analysis.matchWinners.bestPlayerHome}
            side={analysis.homeTeam.teamName}
            tone="neutral"
          />
          <TopPerformerCard
            badge="Bester Auswärtsspieler"
            player={analysis.matchWinners.bestPlayerAway}
            side={analysis.awayTeam.teamName}
            tone="neutral"
          />
          <TopPerformerCard
            badge="Schwachster Einfluss"
            player={
              getWorstPlayer(analysis.matchWinners.worstPlayerHome, analysis.matchWinners.worstPlayerAway)
            }
            side="Schwächster Spieler"
            tone="negative"
          />
        </div>
      </section>

      {timeline.length > 0 ? (
        <section className="analysis-report-section" aria-labelledby="analysis-timeline">
          <header className="analysis-report-heading">
            <span>Besondere Ereignisse</span>
            <h2 id="analysis-timeline">Was zusätzlich auffiel</h2>
          </header>
          <div className="analysis-event-list">
            {timeline.map((event) => (
              <article
                className={event.tone}
                key={`${event.label}-${event.subject}-${event.points}`}
              >
                <span>{event.icon}</span>
                <strong>{event.subject}</strong>
                <small>{event.label}</small>
                <small className="analysis-event-managers">
                  {event.affectedManagers.join(" / ")}
                </small>
                <b>{formatSignedPoints(event.points)}</b>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <MatchStory analysis={analysis} decidingDuel={decidingDuel} />

      <section className="analysis-report-section" aria-labelledby="analysis-debug">
        <details className="analysis-debug-details">
          <summary id="analysis-debug">Debug</summary>
          <div className="analysis-debug-grid">
            <DebugScoringCard
              managerName={analysis.homeTeam.managerName}
              players={analysis.players.home}
            />
            <DebugScoringCard
              managerName={analysis.awayTeam.managerName}
              players={analysis.players.away}
            />
            {ruleImpacts.length > 0 ? (
              <article className="analysis-debug-card">
                <header>
                  <span>Debug</span>
                  <h3>Regeln und Entscheidungen</h3>
                </header>
                <div className="analysis-debug-list">
                  {ruleImpacts.map((impact) => (
                    <div key={`${impact.label}-${impact.detail}-${impact.points}`}>
                      <strong>{impact.label}</strong>
                      <span>{impact.detail}</span>
                      <span>ScoreContribution: {formatSignedPoints(impact.points)}</span>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </details>
      </section>
    </div>
  );
}

function buildMatchStory(
  analysis: MatchAnalysis,
  decidingDuel: PositionDuel | null,
) {
  if (analysis.homeTeam.teamStatus === "INVALID") {
    return `${analysis.homeTeam.teamName} verlor durch einen ungültigen Kader.`;
  }

  if (analysis.awayTeam.teamStatus === "INVALID") {
    return `${analysis.awayTeam.teamName} verlor durch einen ungültigen Kader.`;
  }

  if (analysis.matchFactors.manualPenalties.length > 0) {
    return "Die manuelle Strafe machte den Unterschied.";
  }

  if (decidingDuel) {
    const label = summaryPositionLabels[decidingDuel.position];
    const winner = getWinnerLabel(decidingDuel.winner, analysis);

    return `${label} entschied das Spiel für ${winner}.`;
  }

  const overall = analysis.matchWinners.overallMatchwinner;

  if (overall) {
    return `${overall.player.playerName} war der entscheidende Spieler dieser Partie.`;
  }

  return "Die Partie wurde durch das Gesamtbild der gewerteten Spieler entschieden.";
}

function buildMatchStoryDetail(
  analysis: MatchAnalysis,
  decidingDuel: PositionDuel | null,
) {
  if (analysis.homeTeam.teamStatus === "INVALID" || analysis.awayTeam.teamStatus === "INVALID") {
    return "Die Sonderwertung steht klar vor den normalen Spielerpunkten.";
  }

  if (analysis.matchFactors.manualPenalties.length > 0) {
    return "Ohne die administrative Entscheidung wäre die Partie anders zu lesen.";
  }

  if (decidingDuel) {
    const difference = Math.abs(decidingDuel.difference);

    if (difference === 0) {
      return `${summaryPositionLabels[decidingDuel.position]} war ausgeglichen.`;
    }

    return `In diesem Mannschaftsteil lag der größte Vorsprung bei ${difference} Punkten.`;
  }

  return "Kein einzelner Mannschaftsteil stach klar heraus.";
}

function buildRuleImpacts(analysis: MatchAnalysis): RuleImpact[] {
  const players = [
    ...analysis.players.home.map((player) => ({
      player,
      managerName: analysis.homeTeam.managerName,
    })),
    ...analysis.players.away.map((player) => ({
      player,
      managerName: analysis.awayTeam.managerName,
    })),
  ];

  const playerImpacts = players.flatMap(({ player, managerName }) => {
    const impacts: RuleImpact[] = [];

    if (player.goals > 0) {
      impacts.push({
        label: `${player.goals} ${player.goals === 1 ? "Tor" : "Tore"}`,
        detail: `${player.playerName} für ${managerName}`,
        points: player.goalPoints,
        tone: getPointTone(player.goalPoints),
      });
    }

    if (player.teamOfTheWeek) {
      impacts.push({
        label: "Elf des Tages",
        detail: `${player.playerName} erhält den Bonus.`,
        points: player.teamOfWeekPoints,
        tone: getPointTone(player.teamOfWeekPoints),
      });
    }

    if (player.redCard || player.yellowRedCard) {
      impacts.push({
        label: player.redCard ? "Rote Karte" : "Gelb-Rote Karte",
        detail: `${player.playerName} belastet ${managerName}.`,
        points: player.cardPoints,
        tone: getPointTone(player.cardPoints),
      });
    }

    return impacts;
  });

  const manualPenalties: RuleImpact[] = analysis.matchFactors.manualPenalties.map(({ side, penalty }) => ({
    label: "Manuelle Strafe",
    detail: `${getSideManagerName(analysis, side)}: ${penalty.reason}`,
    points: penalty.points,
    tone: getPointTone(penalty.points),
  }));

  const lineupWarnings: RuleImpact[] = (analysis.matchFactors.lineupWarnings ?? []).map((warning) => ({
    label: "Lineup-Hinweis",
    detail: `${getSideManagerName(analysis, warning.side)}: ${warning.message}`,
    points: 0,
    tone: "neutral",
    alwaysShow: true,
  }));

  const officialRules: RuleImpact[] = analysis.matchFactors.appliedRules.map(({ rule }) => ({
    label: ruleLabels[rule.type],
    detail: rule.reason,
    points: "points" in rule ? rule.points : 0,
    tone: getPointTone("points" in rule ? rule.points : 0),
    alwaysShow: true,
  }));

  return [...lineupWarnings, ...playerImpacts, ...manualPenalties, ...officialRules]
    .filter((impact) => impact.alwaysShow || impact.points !== 0 || impact.tone !== "neutral")
    .sort((first, second) => Math.abs(second.points) - Math.abs(first.points));
}

function getDecidingDuel(analysis: MatchAnalysis) {
  if (!analysis.winner) {
    return null;
  }

  const winningDuels = analysis.positionAnalysis.filter(
    (duel) => duel.winner === analysis.winner,
  );

  return winningDuels.sort(
    (first, second) => Math.abs(second.difference) - Math.abs(first.difference),
  )[0] ?? null;
}

function hasCard(player: AnalysisPlayer) {
  return player.redCard || player.yellowRedCard;
}

function buildSpecialEvents(analysis: MatchAnalysis): TimelineEvent[] {
  const administrativeEvents: TimelineEvent[] = [
    ...(analysis.homeTeam.teamStatus === "INVALID"
      ? [{
          affectedManagers: [analysis.homeTeam.managerName],
          icon: "🚫",
          label: "Team ungültig",
          points: 0,
          subject: analysis.homeTeam.teamName,
          tone: "negative" as const,
        }]
      : []),
    ...(analysis.awayTeam.teamStatus === "INVALID"
      ? [{
          affectedManagers: [analysis.awayTeam.managerName],
          icon: "🚫",
          label: "Team ungültig",
          points: 0,
          subject: analysis.awayTeam.teamName,
          tone: "negative" as const,
        }]
      : []),
    ...analysis.matchFactors.manualPenalties.map(({ side, penalty }) => ({
      affectedManagers: [getSideManagerName(analysis, side)],
      icon: "⚠",
      label: "Manuelle Strafe",
      points: penalty.points,
      subject: "Manuelle Strafe",
      tone: getPointTone(penalty.points),
    })),
  ];

  const playerEvents = [
    ...analysis.players.home.map((player) => ({
      managerName: analysis.homeTeam.managerName,
      player,
    })),
    ...analysis.players.away.map((player) => ({
      managerName: analysis.awayTeam.managerName,
      player,
    })),
  ]
    .flatMap(({ managerName, player }) => {
      const events: TimelineEvent[] = [];

      if (player.goals > 0) {
        events.push({
          affectedManagers: [managerName],
          icon: "⚽",
          label: `${player.goals} ${player.goals === 1 ? "Tor" : "Tore"}`,
          subject: player.playerName,
          points: player.goalPoints,
          tone: getPointTone(player.goalPoints),
        });
      }

      if (player.redCard || player.yellowRedCard) {
        events.push({
          affectedManagers: [managerName],
          icon: "🟥",
          label: player.redCard ? "Rote Karte" : "Gelb-Rot",
          subject: player.playerName,
          points: player.cardPoints,
          tone: getPointTone(player.cardPoints),
        });
      }

      if (player.teamOfTheWeek) {
        events.push({
          affectedManagers: [managerName],
          icon: "⭐",
          label: "Team of the Day",
          subject: player.playerName,
          points: player.teamOfWeekPoints,
          tone: getPointTone(player.teamOfWeekPoints),
        });
      }

      return events;
    })
    .sort((first, second) => Math.abs(second.points) - Math.abs(first.points));

  return deduplicateTimelineEvents([...administrativeEvents, ...playerEvents])
    .slice(0, 12);
}

function deduplicateTimelineEvents(events: readonly TimelineEvent[]) {
  const deduplicated = new Map<string, TimelineEvent>();

  for (const event of events) {
    const key = `${event.icon}|${event.label}|${event.subject}`;
    const existing = deduplicated.get(key);

    if (!existing) {
      deduplicated.set(key, { ...event });
      continue;
    }

    existing.affectedManagers = Array.from(
      new Set([...existing.affectedManagers, ...event.affectedManagers]),
    );
  }

  return Array.from(deduplicated.values());
}

function getWorstPlayer(
  first: AnalysisPlayer | null,
  second: AnalysisPlayer | null,
) {
  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return first.totalPoints <= second.totalPoints ? first : second;
}

function formatRating(value: number) {
  return value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
}

function formatCards(player: AnalysisPlayer) {
  if (player.redCard) {
    return "Rot";
  }

  if (player.yellowRedCard) {
    return "Gelb-Rot";
  }

  return "—";
}

function formatSignedPoints(points: number) {
  return points > 0 ? `+${points}` : String(points);
}

function formatDifference(points: number) {
  if (points === 0) {
    return "0";
  }

  return points > 0 ? `+${points}` : `-${Math.abs(points)}`;
}
