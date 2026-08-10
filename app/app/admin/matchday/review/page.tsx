import Link from "next/link";

import {
  addManualMatchdayAdjustment,
  loadManualAdjustmentReview,
  markInvalidTeamOverride,
  voidManualMatchdayAdjustment,
} from "@/application/manual-matchday-adjustments-service";
import type { ManualAdjustmentType } from "@/application/manual-matchday-adjustments-service";
import { loadMatchdayLineupPreflight } from "@/application/matchday-lineup-preflight-service";
import { parseMatchdayParam } from "@/application/matchday-workflow-service";
import { MatchdayOfficeTabs } from "@/components/matchday-office/matchday-office-tabs";

export const dynamic = "force-dynamic";

type ReviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const adjustmentTypeLabels: Record<ManualAdjustmentType, string> = {
  INVALID_TEAM: "Team ungültig",
  TEAM_PENALTY: "Teamstrafe",
  POINT_ADJUSTMENT: "Punktanpassung",
  BONUS: "Bonus",
  OTHER: "Sonstiges",
};
const pointAdjustmentTypes: ManualAdjustmentType[] = [
  "TEAM_PENALTY",
  "POINT_ADJUSTMENT",
  "BONUS",
  "OTHER",
];

export default async function MatchdayReviewCenterPage({
  searchParams,
}: ReviewPageProps) {
  const params = await searchParams;
  const selectedMatchday = parseMatchdayParam(params?.matchday);
  const [snapshot, lineupPreflight] = await Promise.all([
    loadManualAdjustmentReview(selectedMatchday),
    loadMatchdayLineupPreflight(selectedMatchday),
  ]);
  const incompleteTeamTasks = lineupPreflight.managersWithMissingSlots;
  const activeAdjustments = snapshot.adjustments.filter(
    (adjustment) => adjustment.status === "ACTIVE",
  );
  const totalAdjustment = activeAdjustments.reduce(
    (total, adjustment) => total + adjustment.points,
    0,
  );

  return (
    <main className="matchday-review">
      <header className="matchday-ops-title">
        <span>Administration / Spieltag / Review</span>
        <h1>Spieltag überprüfen</h1>
      </header>

      <MatchdayOfficeTabs active="review" matchday={snapshot.matchday} />

      <section className="matchday-review-hero" aria-labelledby="review-hero">
        <div>
          <span className="matchday-ops-eyebrow">Manual Adjustments</span>
          <h2 id="review-hero">Manuelle Anpassungen / Malus-Rechner</h2>
          <p>
            Engine-Scores bleiben unverändert. Aktive Anpassungen werden als
            auditable Admin-Korrekturen auf die veröffentlichten Finalwerte
            addiert.
          </p>
        </div>
        <div className="matchday-review-meta">
          <article>
            <span>Saison</span>
            <strong>{snapshot.seasonName}</strong>
          </article>
          <article>
            <span>Wettbewerb</span>
            <strong>{snapshot.competitionName}</strong>
          </article>
          <article>
            <span>Spieltag</span>
            <strong>{snapshot.matchday}</strong>
          </article>
          <article>
            <span>Aktive Anpassungen</span>
            <strong>{activeAdjustments.length}</strong>
          </article>
          <article>
            <span>Saldo</span>
            <strong>{formatSigned(totalAdjustment)}</strong>
          </article>
        </div>
      </section>

      <div className="matchday-review-workspace manual-adjustment-workspace">
        <section className="matchday-review-card manual-adjustment-panel manual-review-task-panel">
          <header className="matchday-section-heading compact">
            <div>
              <span>Review Tasks</span>
              <h2>Offene Entscheidungen</h2>
            </div>
            <b>
              {incompleteTeamTasks.length} offen
            </b>
          </header>

          {incompleteTeamTasks.length > 0 ? (
            <div className="manual-review-task-list">
              {incompleteTeamTasks.map((task) => (
                <article className="manual-review-task-row" key={task.managerSeasonId}>
                  <div className="manual-review-task-main">
                    <span>INCOMPLETE_TEAM</span>
                    <h3>{task.managerName}</h3>
                    <p>
                      WARNING · Berechnung ist erlaubt.{" "}
                      Fehlende Slots:{" "}
                      {task.missingSlots
                        .map((slot) => `${slot.slotId} (${positionLabel(slot.expectedPosition)})`)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="manual-review-task-actions" aria-label="Vorgeschlagene Aktionen">
                    <form action={markInvalidTeamAction} className="manual-review-task-invalid">
                      <input name="matchday" type="hidden" value={snapshot.matchday} />
                      <input
                        name="managerSeasonId"
                        type="hidden"
                        value={task.managerSeasonId}
                      />
                      <input
                        name="reason"
                        placeholder="Grund für Team ungültig"
                        required
                        type="text"
                      />
                      <input name="createdBy" placeholder="Spielleitung" type="text" />
                      <button className="primary" type="submit">
                        Team ungültig setzen
                      </button>
                    </form>
                    <a href="#manual-adjustment-form">Punktabzug hinzufügen</a>
                    <form action={acknowledgeIncompleteTeamAction}>
                      <button type="submit">Ignorieren / zur Kenntnis genommen</button>
                    </form>
                    <Link href={`/admin/matchday/data-entry?matchday=${snapshot.matchday}`}>
                      Eingabefehler korrigieren
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="manual-empty-state">
              Keine offenen INCOMPLETE_TEAM-Entscheidungen für diesen Spieltag.
            </div>
          )}
        </section>

        <section className="matchday-review-card manual-adjustment-panel manual-team-status-panel">
          <header className="matchday-section-heading compact">
            <div>
              <span>Teamstatus</span>
              <h2>Gültigkeit der Teamabgabe</h2>
            </div>
            <b>{snapshot.teamStatuses.filter((team) => team.status === "INVALID").length} ungültig</b>
          </header>

          <div className="manual-team-status-list">
            {snapshot.teamStatuses.map((team) => (
              <article
                className={`manual-team-status-row ${team.status.toLowerCase()}`}
                key={team.managerSeasonId}
              >
                <div>
                  <strong>{team.managerName}</strong>
                  {team.status === "INVALID" ? (
                    <p>
                      {team.reason}
                      <small>
                        {team.createdAt ? new Date(team.createdAt).toLocaleString("de-DE") : ""}
                        {team.createdBy ? ` · ${team.createdBy}` : ""}
                      </small>
                    </p>
                  ) : (
                    <p>Teamabgabe wird normal berechnet.</p>
                  )}
                </div>
                <span
                  className={
                    team.status === "INVALID"
                      ? "manual-status-pill active"
                      : "manual-status-pill neutral"
                  }
                >
                  {team.status === "INVALID" ? "Ungültig" : "Gültig"}
                </span>
                {team.activeInvalidAdjustmentId ? (
                  <form action={voidAdjustmentAction}>
                    <input name="matchday" type="hidden" value={snapshot.matchday} />
                    <input
                      name="adjustmentId"
                      type="hidden"
                      value={team.activeInvalidAdjustmentId}
                    />
                    <button type="submit">Team wieder gültig setzen</button>
                  </form>
                ) : (
                  <form action={markInvalidTeamAction} className="manual-team-invalid-form">
                    <input name="matchday" type="hidden" value={snapshot.matchday} />
                    <input
                      name="managerSeasonId"
                      type="hidden"
                      value={team.managerSeasonId}
                    />
                    <input
                      name="reason"
                      placeholder="Grund erforderlich"
                      required
                      type="text"
                    />
                    <input name="createdBy" placeholder="Spielleitung" type="text" />
                    <button className="primary" type="submit">
                      Team ungültig setzen
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </section>

        <section
          className="matchday-review-card manual-adjustment-panel manual-adjustment-form-card"
          id="manual-adjustment-form"
        >
          <header className="matchday-section-heading compact">
            <div>
              <span>Manuelle Anpassungen</span>
              <h2>Adjustment erfassen</h2>
            </div>
            <b>Post Engine</b>
          </header>

          <form action={addAdjustmentAction} className="manual-adjustment-form">
            <input name="matchday" type="hidden" value={snapshot.matchday} />
            <label>
              <span>Manager</span>
              <select name="managerSeasonId" required>
                {snapshot.managers.map((manager) => (
                  <option
                    key={manager.managerSeasonId}
                    value={manager.managerSeasonId}
                  >
                    {manager.managerName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Typ</span>
              <select name="type" required>
                {pointAdjustmentTypes.map((value) => (
                  <option key={value} value={value}>
                    {adjustmentTypeLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Punkte</span>
              <input
                name="points"
                placeholder="-3"
                required
                step="1"
                type="number"
              />
            </label>
            <label className="wide">
              <span>Grund</span>
              <input
                name="reason"
                placeholder="Verspätete Abgabe"
                required
                type="text"
              />
            </label>
            <label>
              <span>Erfasst von</span>
              <input name="createdBy" placeholder="Admin" type="text" />
            </label>
            <button className="primary" type="submit">
              Speichern
            </button>
          </form>
        </section>

        <section className="matchday-review-card manual-adjustment-panel manual-score-panel">
          <header className="matchday-section-heading compact">
            <div>
              <span>Finalwerte</span>
              <h2>Engine + manuelle Anpassungen</h2>
            </div>
            <b>{snapshot.scores.length} Manager</b>
          </header>

          <div className="manual-score-table">
            <div className="manual-score-row manual-score-head">
              <span>Manager</span>
              <span>Engine</span>
              <span>Manuell</span>
              <span>Final</span>
              <span>Status</span>
            </div>
            {snapshot.scores.map((score) => (
              <article
                className={
                  score.manualAdjustment === 0
                    ? "manual-score-row"
                    : "manual-score-row adjusted"
                }
                key={score.managerSeasonId}
              >
                <strong>{score.managerName}</strong>
                <b>{score.engineScore}</b>
                <b className={score.manualAdjustment < 0 ? "negative" : "positive"}>
                  {formatSigned(score.manualAdjustment)}
                </b>
                <b>{score.finalScore}</b>
                <span
                  className={
                    score.teamStatus === "INVALID"
                      ? "manual-status-pill active"
                      : score.manualAdjustment === 0
                      ? "manual-status-pill neutral"
                      : "manual-status-pill active"
                  }
                >
                  {score.teamStatus === "INVALID"
                    ? "Team ungültig"
                    : score.manualAdjustment === 0
                      ? "Engine"
                      : "Angepasst"}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="matchday-review-card manual-adjustment-panel manual-audit-panel">
          <header className="matchday-section-heading compact">
            <div>
              <span>Audit</span>
              <h2>Bestehende Anpassungen</h2>
            </div>
            <b>{snapshot.adjustments.length} Einträge</b>
          </header>

          <div className="manual-adjustment-list">
            {snapshot.adjustments.length > 0 ? (
              <>
                <div className="manual-audit-row manual-audit-head">
                  <span>Manager</span>
                  <span>Typ</span>
                  <span>Punkte</span>
                  <span>Grund</span>
                  <span>Status</span>
                  <span>Aktion</span>
                </div>
                {snapshot.adjustments.map((adjustment) => (
                <article
                  className={`manual-audit-row ${adjustment.status.toLowerCase()}`}
                  key={adjustment.id}
                >
                  <strong>{adjustment.managerName}</strong>
                  <span>{adjustmentTypeLabels[adjustment.type]}</span>
                  <b className={adjustment.points < 0 ? "negative" : "positive"}>
                    {adjustment.type === "INVALID_TEAM"
                      ? "–"
                      : formatSigned(adjustment.points)}
                  </b>
                  <p>
                    {adjustment.reason}
                    <small>
                      {new Date(adjustment.createdAt).toLocaleString("de-DE")}
                      {adjustment.createdBy ? ` · ${adjustment.createdBy}` : ""}
                    </small>
                  </p>
                  <span
                    className={
                      adjustment.status === "ACTIVE"
                        ? "manual-status-pill active"
                        : "manual-status-pill neutral"
                    }
                  >
                    {adjustment.status}
                  </span>
                  {adjustment.status === "ACTIVE" ? (
                    <form action={voidAdjustmentAction}>
                      <input name="matchday" type="hidden" value={snapshot.matchday} />
                      <input
                        name="adjustmentId"
                        type="hidden"
                        value={adjustment.id}
                      />
                      <button type="submit">Voiden</button>
                    </form>
                  ) : null}
                </article>
                ))}
              </>
            ) : (
              <div className="manual-empty-state">
                Keine manuellen Anpassungen für diesen Spieltag.
              </div>
            )}
          </div>
        </section>

        <section className="matchday-review-card manual-adjustment-panel">
          <header className="matchday-section-heading compact">
            <div>
              <span>Fixtures</span>
              <h2>Veröffentlichte Ergebnisse</h2>
            </div>
            <b>{snapshot.fixtures.length} Spiele</b>
          </header>

          <div className="manual-fixture-grid">
            {snapshot.fixtures.map((fixture) => (
              <article key={fixture.fixtureId}>
                <span>{fixture.status}</span>
                <strong>
                  {fixture.homeManager} vs {fixture.awayManager}
                </strong>
                <div>
                  <small>Engine</small>
                  <b>{fixture.engineScore}</b>
                </div>
                <div>
                  <small>Final</small>
                  <b>{fixture.finalScore}</b>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="matchday-review-actions" aria-label="Review Aktionen">
        <Link href={`/admin/matchday?matchday=${snapshot.matchday}`}>
          Zurück zum Leitstand
        </Link>
        <Link className="primary" href={`/admin/matchday/release?matchday=${snapshot.matchday}`}>
          Release öffnen
        </Link>
        <Link href="/competitions/erste-liga">
          Liga prüfen
        </Link>
      </footer>
    </main>
  );
}

async function addAdjustmentAction(formData: FormData) {
  "use server";

  await addManualMatchdayAdjustment(formData);
}

async function markInvalidTeamAction(formData: FormData) {
  "use server";

  await markInvalidTeamOverride(formData);
}

async function voidAdjustmentAction(formData: FormData) {
  "use server";

  await voidManualMatchdayAdjustment(formData);
}

async function acknowledgeIncompleteTeamAction() {
  "use server";
}

function formatSigned(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function positionLabel(position: string) {
  if (position === "goalkeeper") {
    return "TW";
  }

  if (position === "defender") {
    return "AB";
  }

  if (position === "midfielder") {
    return "MF";
  }

  if (position === "forward") {
    return "ST";
  }

  return position;
}
