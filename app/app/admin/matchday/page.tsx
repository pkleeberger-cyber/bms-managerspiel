import Link from "next/link";

import { loadCurrentMatchdayLifecycle } from "@/application/matchday-operations-service";
import { getAllowedMatchdayTransitions } from "@/domain/matchday-lifecycle";
import type { MatchdayLifecycleStatus } from "@/domain/matchday-lifecycle";

export const dynamic = "force-dynamic";

type WorkflowState = "completed" | "active" | "waiting" | "locked";

type WorkflowStep = {
  step: string;
  title: string;
  state: WorkflowState;
  status: string;
  lastExecution: string;
  action: string;
  href?: string;
};

const lifecycleStatusLabels: Record<MatchdayLifecycleStatus, string> = {
  DRAFT: "Entwurf",
  DATA_ENTRY_OPEN: "Datenerfassung geöffnet",
  DATA_ENTRY_COMPLETE: "Datenerfassung abgeschlossen",
  CALCULATED: "Berechnet",
  PUBLISHED_PRELIMINARY: "Vorläufig veröffentlicht",
  REOPENED: "Erneut geöffnet",
  PUBLISHED_OFFICIAL: "Offiziell abgeschlossen",
  ARCHIVED: "Archiviert",
};

export default async function MatchdayOperationsCenterPage() {
  const {
    dataSource,
    lifecycle: currentMatchday,
  } = await loadCurrentMatchdayLifecycle();
  const allowedTransitions = getAllowedMatchdayTransitions(
    currentMatchday.currentStatus,
  );
  const nextAction = getCurrentAction(currentMatchday.currentStatus);
  const workflowSteps = createWorkflowSteps(currentMatchday.currentStatus);
  const systemStatus = [
    {
      label: "Lifecycle",
      value: lifecycleStatusLabels[currentMatchday.currentStatus],
    },
    {
      label: "Version",
      value: `Version ${currentMatchday.currentVersion.versionNumber}`,
    },
    {
      label: "Letzte Veröffentlichung",
      value: formatDateTime(currentMatchday.lastPublishedAt),
    },
    {
      label: "Letzte Berechnung",
      value: formatDateTime(currentMatchday.lastCalculationAt),
    },
    {
      label: "Aktueller Status",
      value: currentMatchday.correctionPending
        ? "Korrektur offen"
        : "Keine Korrektur offen",
    },
  ] as const;

  return (
    <main className="matchday-ops">
      <header className="matchday-ops-title">
        <span>Administration / Spieltag</span>
        <h1>Spieltagsleitstand</h1>
        <p>
          Verwalte den aktuellen Spieltag von der Datenerfassung bis zur
          Veröffentlichung.
        </p>
      </header>

      <section className="matchday-ops-hero" aria-labelledby="matchday-hero">
        <div
          className={`matchday-source-badge ${dataSource.toLowerCase()}`}
          aria-label={`Quelle ${
            dataSource === "DATABASE" ? "Datenbank" : "Fixture"
          }`}
        >
          <span>Quelle</span>
          <strong>
            {dataSource === "DATABASE" ? "🟢 Datenbank" : "🟡 Fixture"}
          </strong>
        </div>
        <div>
          <span className="matchday-ops-eyebrow">Operativer Spieltag</span>
          <h2 id="matchday-hero">
            {lifecycleStatusLabels[currentMatchday.currentStatus]}
          </h2>
          <p>
            Der Leitstand zeigt den aktuellen Lifecycle-Zustand, die sichtbare
            Version und den nächsten zulässigen Arbeitsschritt.
          </p>
        </div>
        <div className="matchday-ops-hero-grid">
          <article>
            <span>Saison</span>
            <strong>{currentMatchday.seasonName}</strong>
            <small>Aktive Saison</small>
          </article>
          <article>
            <span>Wettbewerb</span>
            <strong>{currentMatchday.competitionName}</strong>
            <small>Aktueller Wettbewerb</small>
          </article>
          <article>
            <span>Spieltag</span>
            <strong>{currentMatchday.matchday}</strong>
            <small>Operativer Spieltag</small>
          </article>
          <article>
            <span>Version</span>
            <strong>{currentMatchday.currentVersion.versionNumber}</strong>
            <small>{lifecycleStatusLabels[currentMatchday.currentStatus]}</small>
          </article>
        </div>
      </section>

      {currentMatchday.currentStatus === "REOPENED" ? (
        <section className="matchday-correction-card" aria-labelledby="correction-mode">
          <div>
            <span>Correction Mode</span>
            <h2 id="correction-mode">Spieltag erneut geöffnet</h2>
            <p>
              All following matchdays will be recalculated after publication.
            </p>
          </div>
          <div>
            <strong>
              ST {currentMatchday.correctionPropagationPlan?.correctionStartMatchday}
              –{currentMatchday.correctionPropagationPlan?.affectedMatchdays.at(-1)}
            </strong>
            <span>{currentMatchday.correctionReason}</span>
          </div>
        </section>
      ) : null}

      <div className="matchday-ops-layout">
        <div className="matchday-ops-main-stack">
          <section
            className="matchday-ops-card matchday-current-action-card"
            aria-labelledby="current-action"
          >
            <header className="matchday-section-heading">
              <div>
                <span>Nächster Schritt</span>
                <h2 id="current-action">{nextAction.label}</h2>
              </div>
              <b>{allowedTransitions.length} Übergang möglich</b>
            </header>
            <p>{nextAction.description}</p>
            <div className="matchday-current-action-buttons">
              {nextAction.href ? (
                <Link className="primary" href={nextAction.href}>
                  {nextAction.primaryLabel}
                </Link>
              ) : (
                <button className="primary" type="button">
                  {nextAction.primaryLabel}
                </button>
              )}
              {nextAction.secondaryLabel ? (
                <button type="button">{nextAction.secondaryLabel}</button>
              ) : null}
            </div>
          </section>

          <section
            className="matchday-ops-card matchday-workflow-card"
            aria-labelledby="matchday-workflow"
          >
            <header className="matchday-section-heading">
              <div>
                <span>Workflow</span>
                <h2 id="matchday-workflow">
                  Spieltag veröffentlichungsreif machen
                </h2>
              </div>
              <b>Lifecycle-getrieben</b>
            </header>

            <div className="matchday-workflow">
              {workflowSteps.map((item) => (
                <article
                  className={`matchday-workflow-step ${item.state}`}
                  key={item.title}
                >
                  <div className="matchday-workflow-step-top">
                    <span>{item.step}</span>
                    <b>{item.status}</b>
                  </div>
                  <h3>{item.title}</h3>
                  <small>{item.lastExecution}</small>
                  {item.href && item.state !== "locked" ? (
                    <Link href={item.href}>{item.action}</Link>
                  ) : (
                    <button disabled={item.state === "locked"} type="button">
                      {item.action}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="matchday-ops-sidebar" aria-label="Spieltagsstatus">
          <section className="matchday-ops-card">
            <header className="matchday-section-heading compact">
              <div>
                <span>Status</span>
                <h2>Lifecycle</h2>
              </div>
            </header>
            <div className="matchday-status-list">
              {systemStatus.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="matchday-ops-card">
            <header className="matchday-section-heading compact">
              <div>
                <span>Historie</span>
                <h2>Versionen</h2>
              </div>
            </header>
            <div className="matchday-version-timeline">
              {currentMatchday.versionHistory.map((entry) => (
                <article key={`${entry.versionNumber}-${entry.title}`}>
                  <span>Version {entry.versionNumber}</span>
                  <strong>{entry.title}</strong>
                  <small>{entry.reason}</small>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function createWorkflowSteps(status: MatchdayLifecycleStatus): WorkflowStep[] {
  const dataEntryState = getStepState(status, [
    "DATA_ENTRY_OPEN",
    "DATA_ENTRY_COMPLETE",
    "CALCULATED",
    "PUBLISHED_PRELIMINARY",
    "REOPENED",
    "PUBLISHED_OFFICIAL",
    "ARCHIVED",
  ]);
  const calculationState = getStepState(status, [
    "CALCULATED",
    "PUBLISHED_PRELIMINARY",
    "PUBLISHED_OFFICIAL",
    "ARCHIVED",
  ]);
  const rulesState = getStepState(status, [
    "CALCULATED",
    "PUBLISHED_PRELIMINARY",
    "PUBLISHED_OFFICIAL",
    "ARCHIVED",
  ]);
  const approvalState = getStepState(status, [
    "PUBLISHED_PRELIMINARY",
    "PUBLISHED_OFFICIAL",
    "ARCHIVED",
  ]);
  const publicationState = getStepState(status, [
    "PUBLISHED_PRELIMINARY",
    "PUBLISHED_OFFICIAL",
    "ARCHIVED",
  ]);

  return [
    {
      step: "01",
      title: "Datenerfassung",
      state: status === "DATA_ENTRY_OPEN" ? "active" : dataEntryState,
      status:
        status === "DRAFT"
          ? "Wartet"
          : status === "DATA_ENTRY_OPEN"
            ? "Aktiv"
            : "Abgeschlossen",
      lastExecution: "Zuletzt 09:12",
      action:
        status === "DRAFT" ? "Datenerfassung öffnen" : "Datenerfassung ansehen",
      href: "/admin/matchday/data-entry",
    },
    {
      step: "02",
      title: "Berechnung",
      state:
        status === "DATA_ENTRY_COMPLETE" || status === "REOPENED"
          ? "active"
          : calculationState,
      status:
        status === "REOPENED"
          ? "Neu erforderlich"
          : status === "DATA_ENTRY_COMPLETE"
            ? "Bereit"
            : calculationState === "completed"
              ? "Berechnet"
              : "Wartet",
      lastExecution: "Zuletzt 12:44",
      action: status === "REOPENED" ? "Erneut berechnen" : "Berechnung starten",
      href: "/admin/matchday/calculate",
    },
    {
      step: "03",
      title: "Regelprüfung",
      state: status === "CALCULATED" ? "active" : rulesState,
      status: status === "CALCULATED" ? "Offen" : "2 Kandidaten bestätigt",
      lastExecution: "Zuletzt 12:50",
      action: "Regeln prüfen",
    },
    {
      step: "04",
      title: "Freigabe",
      state:
        status === "CALCULATED" || status === "PUBLISHED_PRELIMINARY"
          ? "active"
          : approvalState,
      status:
        status === "PUBLISHED_OFFICIAL" || status === "ARCHIVED"
          ? "Freigegeben"
          : "Ausstehend",
      lastExecution: "Zuletzt 12:54",
      action: "Freigeben",
    },
    {
      step: "05",
      title: "Veröffentlichung",
      state:
        status === "PUBLISHED_PRELIMINARY" || status === "PUBLISHED_OFFICIAL"
          ? "active"
          : publicationState,
      status:
        status === "PUBLISHED_OFFICIAL"
          ? "Offiziell"
          : status === "PUBLISHED_PRELIMINARY"
            ? "Vorläufig"
            : status === "REOPENED"
              ? "Korrektur offen"
              : "Wartet",
      lastExecution: "Zuletzt 12:55",
      action:
        status === "PUBLISHED_PRELIMINARY"
          ? "Offiziell abschließen"
          : "Spieltag veröffentlichen",
    },
  ];
}

function getStepState(
  status: MatchdayLifecycleStatus,
  completedStatuses: readonly MatchdayLifecycleStatus[],
): WorkflowState {
  if (completedStatuses.includes(status)) {
    return "completed";
  }

  if (status === "ARCHIVED") {
    return "locked";
  }

  return "waiting";
}

function getCurrentAction(status: MatchdayLifecycleStatus) {
  switch (status) {
    case "DRAFT":
      return {
        label: "Datenerfassung öffnen",
        description:
          "Der Spieltag ist angelegt. Als nächstes wird die zentrale Spieler-Datenerfassung geöffnet.",
        primaryLabel: "Datenerfassung öffnen",
        href: "/admin/matchday/data-entry",
      };
    case "DATA_ENTRY_OPEN":
      return {
        label: "Datenerfassung abschließen",
        description:
          "Die Datenpflege ist geöffnet. Nach Abschluss kann die offizielle Berechnung gestartet werden.",
        primaryLabel: "Datenerfassung abschließen",
        href: "/admin/matchday/data-entry",
      };
    case "DATA_ENTRY_COMPLETE":
      return {
        label: "Berechnung starten",
        description:
          "Die Datenerfassung ist abgeschlossen. Der Spieltag kann jetzt durch die BMS-Engine verarbeitet werden.",
        primaryLabel: "Spieltag berechnen",
        href: "/admin/matchday/calculate",
      };
    case "CALCULATED":
      return {
        label: "Regeln prüfen",
        description:
          "Die Engine hat Ergebnisse berechnet. Regelkandidaten müssen vor der Veröffentlichung geprüft werden.",
        primaryLabel: "Regeln prüfen",
      };
    case "PUBLISHED_PRELIMINARY":
      return {
        label: "Spieltag offiziell abschließen",
        description:
          "Der Spieltag ist vorläufig sichtbar. Er kann offiziell geschlossen oder zur Korrektur geöffnet werden.",
        primaryLabel: "Spieltag offiziell abschließen",
        secondaryLabel: "Zur Korrektur öffnen",
      };
    case "REOPENED":
      return {
        label: "Erneut berechnen",
        description:
          "Der Spieltag ist zur Korrektur geöffnet. Nach der Korrektur wird ab diesem Spieltag neu gerechnet.",
        primaryLabel: "Erneut berechnen",
        href: "/admin/matchday/calculate",
      };
    case "PUBLISHED_OFFICIAL":
      return {
        label: "Offiziell abgeschlossen",
        description:
          "Der Spieltag ist offiziell geschlossen. Späte Korrekturen benötigen eine bewusste Wiederöffnung.",
        primaryLabel: "Zur Korrektur öffnen",
      };
    case "ARCHIVED":
      return {
        label: "Archiviert",
        description:
          "Der Spieltag ist historisch archiviert. Reguläre Korrekturen sind nicht mehr vorgesehen.",
        primaryLabel: "Archiv anzeigen",
      };
  }
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
