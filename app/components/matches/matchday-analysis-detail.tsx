import Link from "next/link";

import { CockpitSection } from "@/components/cockpit/cockpit-section";
import type {
  AnalysisPlayer,
  AnalysisWinner,
  MatchAnalysis,
} from "@/domain/match-analysis-engine";
import type { BmsRule } from "@/domain/rules-engine";

const positionLabels = {
  goalkeeper: "Torwart",
  defender: "Abwehr",
  midfielder: "Mittelfeld",
  forward: "Sturm",
} as const;

const ruleLabels: Record<BmsRule["type"], string> = {
  TEAM_INVALID: "Ungültiges Team",
  TEAM_PENALTY: "Manuelle Strafe",
  POINT_ADJUSTMENT: "Administrative Anpassung",
  MATCH_OVERRIDE: "Ergebnisanpassung",
  ADMIN_NOTE: "Administrativer Hinweis",
};

function getWinnerLabel(winner: AnalysisWinner, analysis: MatchAnalysis): string {
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

function PlayerCard({
  label,
  player,
  side,
}: {
  label: string;
  player: AnalysisPlayer | null;
  side: string;
}) {
  return (
    <article className="analysis-player-card neutral">
      <header>
        <span>{label}</span>
        <b>{side}</b>
      </header>
      <div className="analysis-player-identity">
        <span className="decision-avatar neutral">{player?.slotId ?? "–"}</span>
        <strong>{player?.playerName ?? "Kein gewerteter Spieler"}</strong>
      </div>
      <div className="analysis-player-points">
        <b>{player?.totalPoints ?? 0}</b>
        <small>Punkte</small>
      </div>
      <p>{player ? positionLabels[player.position] : "Nicht besetzte Position"}</p>
    </article>
  );
}

export function MatchdayAnalysisDetail({
  analysis,
}: {
  analysis: MatchAnalysis;
}) {
  const hasOfficialAdjustments = analysis.matchFactors.appliedRules.length > 0;

  return (
    <div className="cockpit cockpit-terminal matchday-analysis">
      <CockpitSection index="01" title="Spielergebnis">
        <section className="analysis-hero" aria-labelledby="analysis-title">
          <div className="analysis-result-panel">
            <div className="analysis-result-label">
              <h1 id="analysis-title">{getMatchResultLabel(analysis)}</h1>
              {hasOfficialAdjustments ? (
                <span className="analysis-status-badge">Offizielles Ergebnis angepasst</span>
              ) : null}
            </div>
            <div className="analysis-scoreboard">
              <div className="analysis-team">
                <span>{analysis.homeTeam.teamName}</span>
                <strong>{analysis.officialScore.home}</strong>
              </div>
              <span className="analysis-score-divider">:</span>
              <div className="analysis-team opponent">
                <strong>{analysis.officialScore.away}</strong>
                <span>{analysis.awayTeam.teamName}</span>
              </div>
            </div>
            <div className="analysis-hero-meta">
              <div>
                <span>Wettbewerb</span>
                <strong>{analysis.competitionId}</strong>
              </div>
              <div>
                <span>Spieltag</span>
                <strong>Spieltag {analysis.matchday}</strong>
              </div>
              <div>
                <span>Gewinner</span>
                <strong>{getMatchResultLabel(analysis)}</strong>
              </div>
            </div>
          </div>
          <Link
            className="analysis-full-button"
            href={`/team/spiele/${analysis.matchday}/analyse/auswertung`}
          >
            Vollständige Auswertung
          </Link>
        </section>
      </CockpitSection>

      {hasOfficialAdjustments ? (
        <CockpitSection index="02" title="Offizielle Anpassungen">
          <div className="analysis-adjustments">
            <div className="analysis-adjustment-score">
              <span>Berechnetes Ergebnis</span>
              <strong>
                {analysis.calculatedScore.home} : {analysis.calculatedScore.away}
              </strong>
              <span>Offizielles Ergebnis</span>
              <strong>
                {analysis.officialScore.home} : {analysis.officialScore.away}
              </strong>
            </div>
            <div className="analysis-adjustment-list">
              {analysis.matchFactors.appliedRules.map(({ rule }) => (
                <span key={rule.id}>{ruleLabels[rule.type]}</span>
              ))}
            </div>
          </div>
        </CockpitSection>
      ) : null}

      <CockpitSection index="03" title="Mannschaftsteile">
        <div className="analysis-comparison-grid">
          {analysis.positionAnalysis.map((duel) => (
            <article
              className={`analysis-comparison-card ${
                duel.winner === "HOME"
                  ? "positive"
                  : duel.winner === "AWAY"
                    ? "negative"
                    : "neutral"
              }`}
              key={duel.position}
            >
              <header>
                <span>{positionLabels[duel.position]}</span>
                <b>{getWinnerLabel(duel.winner, analysis)}</b>
              </header>
              <div className="analysis-comparison-values">
                <div>
                  <span>Heim</span>
                  <strong>{duel.homePoints}</strong>
                </div>
                <div>
                  <span>Auswärts</span>
                  <strong>{duel.awayPoints}</strong>
                </div>
                <div>
                  <span>Differenz</span>
                  <strong>{duel.difference}</strong>
                </div>
              </div>
              <p>Gewinner: {getWinnerLabel(duel.winner, analysis)}</p>
            </article>
          ))}
        </div>
      </CockpitSection>

      <CockpitSection index="04" title="Spieler des Spiels">
        <div className="analysis-player-grid">
          <PlayerCard
            label="Bester Heimspieler"
            player={analysis.matchWinners.bestPlayerHome}
            side={analysis.homeTeam.teamName}
          />
          <PlayerCard
            label="Bester Auswärtsspieler"
            player={analysis.matchWinners.bestPlayerAway}
            side={analysis.awayTeam.teamName}
          />
          <PlayerCard
            label="Spieler des Spiels"
            player={analysis.matchWinners.overallMatchwinner?.player ?? null}
            side={
              analysis.matchWinners.overallMatchwinner?.side === "HOME"
                ? analysis.homeTeam.teamName
                : analysis.matchWinners.overallMatchwinner?.side === "AWAY"
                  ? analysis.awayTeam.teamName
                  : "Unentschieden"
            }
          />
        </div>
      </CockpitSection>

      <CockpitSection index="05" title="Spielentscheidende Faktoren">
        <div className="analysis-consequence-strip">
          <span>
            Ersatzspieler: {analysis.matchFactors.replacementPlayerCount}
          </span>
          <span>
            Nicht besetzte Positionen: {analysis.matchFactors.missingPositions.length}
          </span>
          <span>
            Größtes Duell: Slot{" "}
            {analysis.matchWinners.biggestIndividualDuel?.comparison.slotId ?? "–"}
          </span>
          <span>
            Manuelle Strafen: {analysis.matchFactors.manualPenalties.length}
          </span>
        </div>
      </CockpitSection>

      <CockpitSection index="06" title="Vollständige Spieltagsauswertung">
        <div className="analysis-placeholder-card">
          <div className="analysis-placeholder-illustration" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <h2>Alle gewerteten Spieler</h2>
            <p>
              Öffne den offiziellen Slotvergleich, um jede gespeicherte
              Wertungskategorie und Punktzahl zu prüfen.
            </p>
          </div>
        </div>
      </CockpitSection>
    </div>
  );
}
