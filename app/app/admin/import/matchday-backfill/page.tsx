import Link from "next/link";

import { MatchdayBackfillService } from "@/application/matchday-backfill-service";

export const dynamic = "force-dynamic";

export default async function MatchdayBackfillPage() {
  let report: Awaited<ReturnType<MatchdayBackfillService["run"]>> | null = null;
  let error: string | null = null;

  try {
    report = await new MatchdayBackfillService().run({
      workbookPath: "/Users/patrickk/Downloads/Spieltag1_17.xlsx",
      mode: "DRY_RUN",
    });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Dry-run konnte nicht ausgefuehrt werden.";
  }

  return (
    <main className="matchday-ops">
      <header className="matchday-ops-title">
        <span>Administration / Import / Dev Migration</span>
        <h1>Matchday 1-17 Backfill</h1>
        <p>
          Dry-run fuer historische Kader- und PlayerMatchData-Quellen. Ergebnisse
          und Tabellen werden nicht importiert.
        </p>
      </header>

      <section className="matchday-ops-card">
        <header className="matchday-section-heading compact">
          <span className="matchday-ops-eyebrow">Dry-run</span>
          <h2>Simulation Backfill Report</h2>
        </header>

        {error ? (
          <div className="matchday-empty-state">
            <strong>Dry-run nicht verfuegbar.</strong>
            <span>{error}</span>
          </div>
        ) : report ? (
          <div className="matchday-ops-hero-grid">
            <article>
              <span>Spieltage</span>
              <strong>{report.summary.parsedMatchdays.join(", ")}</strong>
              <small>Aus Workbook geparst</small>
            </article>
            <article>
              <span>PlayerMatchData</span>
              <strong>{report.summary.playerMatchDataCount}</strong>
              <small>Deduped pro Spieler und Spieltag</small>
            </article>
            <article>
              <span>Slotwechsel</span>
              <strong>{report.summary.squadChangeCount}</strong>
              <small>Abgeleitete SquadAssignment-Historie</small>
            </article>
            <article>
              <span>Issues</span>
              <strong>{report.summary.unknownPlayers + report.summary.unknownManagers + report.summary.conflicts}</strong>
              <small>Unknowns und Konflikte</small>
            </article>
          </div>
        ) : null}
      </section>

      <section className="matchday-ops-card">
        <header className="matchday-section-heading compact">
          <span className="matchday-ops-eyebrow">Operator Command</span>
          <h2>Apply bleibt CLI-gesteuert</h2>
        </header>
        <p>
          Apply und Berechnung laufen bewusst als Admin/Dev-Migration:
          <code> npm run backfill:matchdays -- --workbook /Users/patrickk/Downloads/Spieltag1_17.xlsx --apply --calculate</code>
        </p>
        <div className="matchday-ops-actions">
          <Link href="/admin/import">Zurueck zum Import Center</Link>
          <Link className="primary" href="/admin/matchday">Zum Spieltagsleitstand</Link>
        </div>
      </section>
    </main>
  );
}
