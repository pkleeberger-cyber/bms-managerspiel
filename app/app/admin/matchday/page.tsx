import Link from "next/link";
import { redirect } from "next/navigation";

import {
  loadMatchdayWorkflow,
  parseMatchdayParam,
  parseWorkflowRoleParam,
  transitionMatchdayWorkflow,
} from "@/application/matchday-workflow-service";
import { MatchdayOfficeTabs } from "@/components/matchday-office/matchday-office-tabs";

export const dynamic = "force-dynamic";

type MatchdayPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function workflowAction(formData: FormData) {
  "use server";

  const matchday = readActionMatchday(formData);
  const role = readActionRole(formData);
  const baseUrl = `/admin/matchday?matchday=${matchday}&role=${role}`;

  try {
    await transitionMatchdayWorkflow(formData);
  } catch (error) {
    redirect(
      `${baseUrl}&workflowError=${encodeURIComponent(
        workflowErrorMessage(error),
      )}`,
    );
  }

  redirect(
    `${baseUrl}&workflowMessage=${encodeURIComponent(
      "Workflow-Status gespeichert.",
    )}`,
  );
}

export default async function MatchdayOperationsCenterPage({
  searchParams,
}: MatchdayPageProps) {
  const params = await searchParams;
  const selectedMatchday = parseMatchdayParam(params?.matchday);
  const selectedRole = parseWorkflowRoleParam(params?.role);
  const workflowMessage = readStringParam(params?.workflowMessage);
  const workflowError = readStringParam(params?.workflowError);
  const snapshot = await loadMatchdayWorkflow(selectedMatchday, selectedRole);
  const activeTab: "history" | "leitstand" =
    readStringParam(params?.tab) === "history" ? "history" : "leitstand";
  const currentTask = resolveCurrentTask(snapshot.steps);
  const selectedSelectorItem =
    snapshot.selector.find((item) => item.isSelected) ?? snapshot.selector[0];

  return (
    <main className="matchday-ops">
      <header className="matchday-ops-title">
        <span>Administration / Spieltag</span>
        <h1>Spieltagsleitstand</h1>
      </header>

      <MatchdayOfficeTabs
        active={activeTab}
        matchday={snapshot.selectedMatchday}
        role={snapshot.currentUserRole}
      />

      <section className="matchday-office-hero" aria-labelledby="matchday-hero">
        <div>
          <span>Aktueller Spieltag</span>
          <strong id="matchday-hero">ST {snapshot.selectedMatchday}</strong>
          <small>{snapshot.competitionName}</small>
        </div>
        <div>
          <span>Lifecycle</span>
          <strong>{snapshot.selectedStatusLabel}</strong>
          <small>Saisonstatus</small>
        </div>
        <div>
          <span>Verantwortlich</span>
          <strong>{currentTask.responsibleRoleLabel}</strong>
          <small>Aktueller Schritt</small>
        </div>
        <div>
          <span>Status</span>
          <strong>{workflowStatusLabel(currentTask.status)}</strong>
          <small>{snapshot.currentUserRoleLabel}</small>
        </div>
      </section>

      {workflowMessage || workflowError ? (
        <section
          className={`matchday-feedback ${workflowError ? "error" : "success"}`}
        >
          <strong>{workflowError ? "Aktion nicht gespeichert" : "Gespeichert"}</strong>
          <span>{workflowError ?? workflowMessage}</span>
        </section>
      ) : null}

      {snapshot.warnings.length > 0 ? (
        <section className="matchday-feedback warning">
          <strong>Lifecycle-Warnung</strong>
          {snapshot.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="matchday-ops-card matchday-history-card">
          <header className="matchday-section-heading compact">
            <div>
              <span>Historie</span>
              <h2>Lifecycle-Protokoll</h2>
            </div>
            <b>ST {snapshot.selectedMatchday}</b>
          </header>

          <div className="matchday-history-timeline">
            {snapshot.steps.some((step) => step.completedAt) ? (
              snapshot.steps
                .filter((step) => step.completedAt)
                .map((step) => (
                  <article key={step.id}>
                    <time>{step.completedAt}</time>
                    <strong>{step.title}</strong>
                    <span>{workflowStatusLabel(step.status)}</span>
                  </article>
                ))
            ) : (
              <div className="matchday-empty-state">
                Für diesen Spieltag gibt es noch keine abgeschlossenen
                Lifecycle-Einträge.
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="matchday-office-toolbar">
            <form className="matchday-office-selector" method="get">
              <label>
                <span>Spieltag</span>
                <select
                  aria-label="Spieltag auswählen"
                  defaultValue={String(snapshot.selectedMatchday)}
                  name="matchday"
                >
                  {snapshot.selector.map((item) => (
                    <option key={item.matchday} value={item.matchday}>
                      {item.label} · {item.statusLabel}
                    </option>
                  ))}
                </select>
              </label>
              <input name="role" type="hidden" value={snapshot.currentUserRole} />
              <button type="submit">Öffnen</button>
              {selectedSelectorItem ? (
                <small>
                  {selectedSelectorItem.resultCount}/{selectedSelectorItem.fixtureCount || 9} Ergebnisse
                  {selectedSelectorItem.isOperative ? " · operativ" : ""}
                </small>
              ) : null}
            </form>

            <nav aria-label="Workflow-Rolle auswählen">
              <Link
                className={snapshot.currentUserRole === "GAME_DIRECTOR" ? "active" : ""}
                href={`/admin/matchday?matchday=${snapshot.selectedMatchday}&role=GAME_DIRECTOR`}
              >
                Spielleitung
              </Link>
              <Link
                className={snapshot.currentUserRole === "DATA_MAINTAINER" ? "active" : ""}
                href={`/admin/matchday?matchday=${snapshot.selectedMatchday}&role=DATA_MAINTAINER`}
              >
                Datenpflege
              </Link>
            </nav>
          </section>

          <section className="matchday-current-action-card" aria-labelledby="current-task-title">
            <div>
              <span>Aktuelle Aufgabe</span>
              <h2 id="current-task-title">Was ist jetzt zu tun?</h2>
              <strong>{currentTask.title}</strong>
              <p>{currentTask.actionReason}</p>
            </div>
            <div className="matchday-current-action-meta">
              <span className={`matchday-status-chip ${currentTask.status.toLowerCase()}`}>
                {workflowStatusLabel(currentTask.status)}
              </span>
              {renderCurrentTaskAction(currentTask, snapshot.selectedMatchday, snapshot.currentUserRole)}
            </div>
          </section>

          <section className="matchday-office-status-row" aria-label="Datenlage">
            <article>
              <span>Fixtures</span>
              <strong>{snapshot.metrics.fixtureCount}/9</strong>
            </article>
            <article>
              <span>PlayerMatchData</span>
              <strong>
                {snapshot.metrics.playerMatchDataCount}/
                {snapshot.metrics.relevantPlayerCount}
              </strong>
            </article>
            <article>
              <span>Ergebnisse</span>
              <strong>{snapshot.metrics.resultCount}/9</strong>
            </article>
            <article>
              <span>Adjustments</span>
              <strong>{snapshot.metrics.activeAdjustments}</strong>
            </article>
          </section>

          <section className="matchday-ops-card matchday-workflow-card">
            <header className="matchday-section-heading compact">
              <div>
                <span>Workflow</span>
                <h2>Operativer Ablauf</h2>
              </div>
              <b>{snapshot.selectedStatusLabel}</b>
            </header>

            <div className="matchday-workflow">
              {snapshot.steps.map((step) => (
                <article
                  className={`matchday-workflow-step ${step.status.toLowerCase()}`}
                  key={step.id}
                >
                  <div className="matchday-workflow-step-top">
                    <span>{step.number}</span>
                    <b>{workflowStatusLabel(step.status)}</b>
                  </div>
                  <h3>{step.title}</h3>
                  <small>
                    {step.status === "DONE"
                      ? step.completedAt ?? "Abgeschlossen"
                      : step.responsibleRoleLabel}
                  </small>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
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

function workflowErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.startsWith("Workflow: ")) {
    return error.message.replace("Workflow: ", "");
  }

  return "Die Workflow-Aktion konnte nicht gespeichert werden. Bitte Prisma-Schema und Datenbankstatus prüfen.";
}

function workflowLinkLabel(step: {
  id: string;
  status: string;
  actionLabel: string;
}) {
  if (step.status === "DONE") {
    return "Öffnen";
  }

  switch (step.id) {
    case "data-entry":
      return "Datenerfassung öffnen";
    case "calculation":
      return "Berechnung öffnen";
    case "manual-review":
      return "Review öffnen";
    default:
      return step.actionLabel;
  }
}

function resolveCurrentTask<
  Step extends {
    action?: string | null;
    actionEnabled: boolean;
    actionLabel: string;
    actionReason: string;
    href?: string | null;
    id: string;
    responsibleRoleLabel: string;
    status: string;
  },
>(steps: readonly Step[]) {
  return (
    steps.find((step) => step.status === "OPEN") ??
    steps.find((step) => step.status === "BLOCKED") ??
    steps.find((step) => step.status === "WAITING") ??
    steps[steps.length - 1]
  );
}

function workflowStatusLabel(status: string) {
  switch (status) {
    case "DONE":
      return "Abgeschlossen";
    case "OPEN":
      return "Offen";
    case "WAITING":
      return "Wartet";
    case "BLOCKED":
      return "Blockiert";
    default:
      return status;
  }
}

function renderCurrentTaskAction(
  step: {
    action?: string | null;
    actionEnabled: boolean;
    actionLabel: string;
    href?: string | null;
    id: string;
    status: string;
  },
  matchday: number,
  role: string,
) {
  if (step.action && step.status !== "DONE") {
    return (
      <form action={workflowAction}>
        <input name="matchday" type="hidden" value={matchday} />
        <input name="role" type="hidden" value={role} />
        <input name="action" type="hidden" value={step.action} />
        <button className="primary" disabled={!step.actionEnabled} type="submit">
          {step.actionLabel}
        </button>
      </form>
    );
  }

  if (step.href) {
    const disabled = step.status === "WAITING" || step.status === "BLOCKED";

    return (
      <Link
        aria-disabled={disabled}
        className={`primary ${disabled ? "disabled" : ""}`}
        href={step.href}
      >
        {workflowLinkLabel(step)}
      </Link>
    );
  }

  return (
    <button className="primary" disabled type="button">
      {step.actionLabel}
    </button>
  );
}
