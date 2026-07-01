import Link from "next/link";

import { Icon } from "@/components/icons";

export function LastMatchCard() {
  return (
    <article className="cockpit-match-card">
      <div className="match-score-panel">
        <div className="match-story-meta">
          <strong className="result-state">Niederlage</strong>
          <span>Erste Liga · 14. Spieltag</span>
        </div>

        <div className="cockpit-score">
          <div className="score-team">
            <span className="score-logo home">BU</span>
            <div>
              <strong>BMS United</strong>
            </div>
          </div>
          <div className="score-result">
            <strong>8</strong>
            <span>:</span>
            <strong>10</strong>
          </div>
          <div className="score-team away">
            <span className="score-logo opponent">FA</span>
            <div>
              <strong>FC Adler</strong>
            </div>
          </div>
        </div>

      </div>
      <Link className="analyse-button" href="/team/spiele/14/analyse">
        Analyse Match
        <Icon name="arrow" />
      </Link>
    </article>
  );
}
