import Link from "next/link";

import { Icon } from "@/components/icons";
import type { TeamOverviewData } from "@/domain/team-overview";

const resultLabels: Record<TeamOverviewData["lastMatch"]["result"], string> = {
  WIN: "Sieg",
  DRAW: "Unentschieden",
  LOSS: "Niederlage",
};

export function LastMatchCard({
  competitionId,
  lastMatch,
  matchday,
}: Pick<TeamOverviewData, "competitionId" | "lastMatch" | "matchday">) {
  return (
    <article className="cockpit-match-card">
      <div className="match-score-panel">
        <div className="match-story-meta">
          <strong className="result-state">{resultLabels[lastMatch.result]}</strong>
          <span>{competitionId} · {matchday}. Spieltag</span>
          {lastMatch.officialResultAdjusted ? (
            <span className="analysis-status-badge">Offizielles Ergebnis angepasst</span>
          ) : null}
        </div>

        <div className="cockpit-score">
          <div className="score-team">
            <div>
              <strong>{lastMatch.homeTeamName}</strong>
            </div>
          </div>
          <div className="score-result">
            <strong>{lastMatch.homeScore}</strong>
            <span>:</span>
            <strong>{lastMatch.awayScore}</strong>
          </div>
          <div className="score-team away">
            <div>
              <strong>{lastMatch.awayTeamName}</strong>
            </div>
          </div>
        </div>

      </div>
      <Link className="analyse-button" href={lastMatch.href}>
        Match analysieren
        <Icon name="arrow" />
      </Link>
    </article>
  );
}
