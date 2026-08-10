import Link from "next/link";
import { redirect } from "next/navigation";

import {
  calculateMatchdayZero,
  loadMatchdayZeroDataEntry,
} from "@/application/matchday-zero-service";
import { loadMatchdayLineupPreflight } from "@/application/matchday-lineup-preflight-service";
import {
  loadMatchdayWorkflow,
  parseMatchdayParam,
  parseWorkflowRoleParam,
} from "@/application/matchday-workflow-service";
import { MatchdayOfficeTabs } from "@/components/matchday-office/matchday-office-tabs";

export const dynamic = "force-dynamic";

type CalculationPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function calculateAction(formData: FormData) {
  "use server";

  const matchday = readActionMatchday(formData);
  const role = readActionRole(formData);
  const baseUrl = `/admin/matchday/calculate?matchday=${matchday}&role=${role}`;
  let redirectUrl = baseUrl;

  try {
    const result = await calculateMatchdayZero(matchday);

    if (result.status === "BLOCKED") {
      redirectUrl = `${baseUrl}&calcError=${encodeURIComponent(result.message)}`;
    } else {
      redirectUrl = `${baseUrl}&calcMessage=${encodeURIComponent(result.message)}`;
    }
  } catch {
    redirectUrl = `${baseUrl}&calcError=${encodeURIComponent(
      "Die Berechnung konnte nicht gestartet werden. Bitte Datenlage und Prisma-Verbindung prüfen.",
    )}`;
  }

  redirect(redirectUrl);
}

export default async function MatchdayCalculationCenterPage({
  searchParams,
}: CalculationPageProps) {
  const params = await searchParams;
  const selectedMatchday = parseMatchdayParam(params?.matchday) ?? 1;
  const selectedRole = parseWorkflowRoleParam(params?.role);
  const calcMessage = readStringParam(params?.calcMessage);
  const calcError = readStringParam(params?.calcError);
  const [snapshot, workflow, lineupPreflight] = await Promise.all([
    loadMatchdayZeroDataEntry(selectedMatchday),
    loadMatchdayWorkflow(selectedMatchday, selectedRole),
    loadMatchdayLineupPreflight(selectedMatchday),
  ]);
  const canCalculate =
    workflow.metrics.fixtureCount === 9 &&
    workflow.metrics.managerSeasonCount === 18 &&
    workflow.metrics.squadAssignmentCount > 0 &&
    workflow.metrics.relevantPlayerCount > 0 &&
    workflow.metrics.playerMatchDataCount >= workflow.metrics.relevantPlayerCount;
  const openLineupDecisionCount =
    lineupPreflight.managersWithMissingSlots.length;
  const pipelineSteps = createPipelineSteps(
    workflow,
    canCalculate,
    lineupPreflight.missingSlotCount,
    openLineupDecisionCount,
  );
  const query = `matchday=${workflow.selectedMatchday}&role=${workflow.currentUserRole}`;

  return (
    <main className="matchday-calculation">
      <header className="matchday-ops-title">
        <span>Administration / Spieltag / Berechnung</span>
        <h1>Living Matchday Pipeline</h1>
      </header>

      <MatchdayOfficeTabs
        active="calculation"
        matchday={workflow.selectedMatchday}
        role={workflow.currentUserRole}
      />

      <section className="matchday-calculation-hero" aria-labelledby="calculation-hero">
        <div>
          <span className="matchday-ops-eyebrow">
            {snapshot.competitionName} · Spieltag {workflow.selectedMatchday}
          </span>
          <h2 id="calculation-hero">
            {canCalculate
              ? openLineupDecisionCount > 0
                ? "Berechnung mit Hinweisen möglich"
                : "Berechnung möglich"
              : "Berechnung blockiert"}
          </h2>
          <p>
            Aktueller Workflowstatus: {workflow.selectedStatusLabel}. Die
            Berechnung verändert keine manuellen Adjustments.
          </p>
        </div>
        <div className="matchday-calculation-meta">
          <article>
            <span>Fixtures</span>
            <strong>{workflow.metrics.fixtureCount}/9</strong>
          </article>
          <article>
            <span>PlayerMatchData</span>
            <strong>
              {workflow.metrics.playerMatchDataCount}/
              {workflow.metrics.relevantPlayerCount}
            </strong>
          </article>
          <article>
            <span>MatchResults</span>
            <strong>{workflow.metrics.resultCount}/9</strong>
          </article>
          <article>
            <span>Lineup</span>
            <strong>
              {openLineupDecisionCount === 0
                ? "OK"
                : `${openLineupDecisionCount} Review`}
            </strong>
          </article>
        </div>
      </section>

      {calcMessage || calcError ? (
        <section className={`matchday-feedback ${calcError ? "error" : "success"}`}>
          <strong>{calcError ? "Berechnung nicht gestartet" : "Berechnung abgeschlossen"}</strong>
          <span>{calcError ?? calcMessage}</span>
        </section>
      ) : null}

      <section className="matchday-calculation-card">
        <header className="matchday-section-heading">
          <div>
            <span>Pipeline</span>
            <h2>Living Datenlage</h2>
          </div>
          <b>{canCalculate ? "Bereit" : "Blockiert"}</b>
        </header>

        <div className="matchday-pipeline-grid">
          {pipelineSteps.map((step) => (
            <article className={`matchday-pipeline-step ${step.tone}`} key={step.title}>
              <div className="matchday-pipeline-icon" aria-hidden="true">
                {step.icon}
              </div>
              <div>
                <h3>{step.title}</h3>
                <span>{step.status}</span>
                <p>{step.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {snapshot.openCount > 0 ? (
        <section className="matchday-calculation-card">
          <header className="matchday-section-heading">
            <div>
              <span>Blocker</span>
              <h2>Fehlende PlayerMatchData</h2>
            </div>
            <b>{snapshot.openCount} offen</b>
          </header>
          <div className="matchday-activity-timeline">
            {snapshot.relevantPlayers
              .filter((player) => player.status === "OPEN")
              .slice(0, 25)
              .map((player) => (
                <article key={player.playerId}>
                  <time>{player.position}</time>
                  <span aria-hidden="true" />
                  <strong>
                    {player.displayName} · {player.club}
                  </strong>
                </article>
              ))}
          </div>
        </section>
      ) : null}

      {openLineupDecisionCount > 0 ? (
        <section className="matchday-calculation-card">
          <header className="matchday-section-heading">
            <div>
              <span>Review</span>
              <h2>Offene Hinweise</h2>
            </div>
            <b>
              {openLineupDecisionCount} Hinweis
              {openLineupDecisionCount === 1 ? "" : "e"}
            </b>
          </header>
          <p className="matchday-review-note">
            Der Preflight hat unvollständige Teamabgaben erkannt. Die
            Berechnung darf fortgesetzt werden. Fehlende oder nicht wertbare
            Slots zählen 0; Team ungültig, Punktabzug oder spätere Korrektur
            bleiben Spielleiterentscheidungen im Review.
          </p>
          <div className="matchday-lineup-diagnostics">
            {lineupPreflight.managersWithMissingSlots.map((manager) => (
              <article key={manager.managerSeasonId}>
                <header>
                  <div>
                    <span>Manager</span>
                    <h3>{manager.managerName}</h3>
                  </div>
                  <b>{manager.missingSlots.length} offen</b>
                </header>
                <div className="matchday-lineup-slot-list">
                  {manager.missingSlots.map((slot) => (
                    <section key={`${manager.managerSeasonId}:${slot.slotId}`}>
                      <div>
                        <strong>
                          INCOMPLETE_TEAM · WARNING · Slot {slot.slotId} fehlt / nicht gewertet.
                        </strong>
                        <p>
                          Spieltag {slot.matchday} · Erwartete Position:{" "}
                          {positionLabel(slot.expectedPosition)} · Matchday-1-Zuordnung:{" "}
                          {slot.existsOnMatchday1 ? "vorhanden" : "nicht vorhanden"}
                        </p>
                      </div>
                      {slot.matchday1Assignment ? (
                        <small>
                          ST1: {slot.matchday1Assignment.playerName} · gültig{" "}
                          {slot.matchday1Assignment.validFromMatchday}–
                          {slot.matchday1Assignment.validToMatchday ?? "offen"} ·{" "}
                          {slot.matchday1Assignment.playerStatus}
                        </small>
                      ) : null}
                      {slot.relatedAssignments.length > 0 ? (
                        <ul>
                          {slot.relatedAssignments.map((assignment) => (
                            <li key={assignment.assignmentId}>
                              {assignment.playerName}: {assignment.validFromMatchday}–
                              {assignment.validToMatchday ?? "offen"} ·{" "}
                              {assignment.reason} · {assignment.playerStatus}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <small>Keine verwandten Assignment-Zeiträume gefunden.</small>
                      )}
                    </section>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="matchday-calculation-actions" aria-label="Aktionen">
        <Link href={`/admin/matchday/data-entry?${query}`}>Datenerfassung öffnen</Link>
        <form action={calculateAction}>
          <input name="matchday" type="hidden" value={workflow.selectedMatchday} />
          <input name="role" type="hidden" value={workflow.currentUserRole} />
          <button className="primary" disabled={!canCalculate} type="submit">
            Spieltag berechnen
          </button>
        </form>
        <Link href={`/admin/matchday/review?${query}`}>Zur Malusprüfung</Link>
        <Link href={`/admin/matchday?${query}`}>Zurück zum Leitstand</Link>
      </footer>
    </main>
  );
}

function createPipelineSteps(
  workflow: Awaited<ReturnType<typeof loadMatchdayWorkflow>>,
  canCalculate: boolean,
  missingLineupSlots: number,
  openLineupDecisionCount: number,
) {
  return [
    {
      title: "Fixtures vorhanden",
      status: workflow.metrics.fixtureCount === 9 ? "OK" : "Blockiert",
      detail: `${workflow.metrics.fixtureCount}/9 Liga-1-Fixtures für ST ${workflow.selectedMatchday}.`,
      tone: workflow.metrics.fixtureCount === 9 ? "completed" : "error",
      icon: workflow.metrics.fixtureCount === 9 ? "✓" : "!",
    },
    {
      title: "ManagerSeason vorhanden",
      status: workflow.metrics.managerSeasonCount === 18 ? "OK" : "Blockiert",
      detail: `${workflow.metrics.managerSeasonCount}/18 aktive Liga-1-Manager.`,
      tone: workflow.metrics.managerSeasonCount === 18 ? "completed" : "error",
      icon: workflow.metrics.managerSeasonCount === 18 ? "✓" : "!",
    },
    {
      title: "SquadAssignments vorhanden",
      status:
        workflow.metrics.squadAssignmentCount > 0
          ? "OK"
          : "Blockiert",
      detail:
        missingLineupSlots === 0
          ? `${workflow.metrics.squadAssignmentCount} Living SquadAssignments, alle 18 Slots je Manager gültig.`
          : `${openLineupDecisionCount} INCOMPLETE_TEAM-Warnung${
              openLineupDecisionCount === 1 ? "" : "en"
            } für ST ${workflow.selectedMatchday}; Berechnung bleibt möglich.`,
      tone:
        workflow.metrics.squadAssignmentCount > 0 && missingLineupSlots === 0
          ? "completed"
          : workflow.metrics.squadAssignmentCount > 0
            ? "waiting"
            : "error",
      icon:
        workflow.metrics.squadAssignmentCount > 0 && missingLineupSlots === 0
          ? "✓"
          : workflow.metrics.squadAssignmentCount > 0
            ? "!"
            : "!",
    },
    {
      title: "PlayerMatchData vorhanden",
      status: workflow.metrics.playerMatchDataCount >= workflow.metrics.relevantPlayerCount ? "OK" : "Offen",
      detail: `${workflow.metrics.playerMatchDataCount}/${workflow.metrics.relevantPlayerCount} relevante Spieler gespeichert.`,
      tone: workflow.metrics.playerMatchDataCount >= workflow.metrics.relevantPlayerCount ? "completed" : "error",
      icon: workflow.metrics.playerMatchDataCount >= workflow.metrics.relevantPlayerCount ? "✓" : "!",
    },
    {
      title: "Berechnung möglich",
      status: canCalculate
        ? "Bereit"
        : "Blockiert",
      detail: canCalculate
        ? openLineupDecisionCount > 0
          ? "Mindestquellen sind vollständig; offene Lineup-Hinweise blockieren nicht."
          : "Alle Mindestquellen sind vollständig."
        : "Mindestens eine blockierende Living-Datenquelle fehlt.",
      tone: canCalculate ? "waiting" : "locked",
      icon: canCalculate ? "○" : "!",
    },
    {
      title: "Veröffentlichung / Review",
      status: workflow.selectedStatusLabel,
      detail: `${workflow.metrics.resultCount}/9 MatchResults, ${workflow.metrics.activeAdjustments} aktive Adjustments.`,
      tone: workflow.metrics.resultCount === 9 ? "completed" : "waiting",
      icon: workflow.metrics.resultCount === 9 ? "✓" : "○",
    },
  ] as const;
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

function readActionMatchday(formData: FormData) {
  const parsed = Number(formData.get("matchday") ?? 1);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 34 ? parsed : 1;
}

function readActionRole(formData: FormData) {
  const raw = String(formData.get("role") ?? "GAME_DIRECTOR");

  return raw === "DATA_MAINTAINER" ? "DATA_MAINTAINER" : "GAME_DIRECTOR";
}

function readStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
