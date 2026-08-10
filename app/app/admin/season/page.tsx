import Link from "next/link";

import { loadCurrentSeasonOperations } from "@/application/season-operations-service";
import type { SeasonManagerStats } from "@/application/season-operations-service";
import {
  closeTransferPeriod,
  loadTransferPeriodAdminSnapshot,
  openTransferPeriod,
} from "@/application/transfer-period-service";
import type {
  CompetitionLifecycleAction,
  CompetitionLifecycleSnapshot,
  CompetitionLifecycleStatus,
  CompetitionType,
} from "../../../domain/competition-lifecycle";

type SeasonTab = "overview" | "competitions" | "transfer" | "imports" | "history";
type TaskTone = "ok" | "open";

type CompetitionRowView = {
  actions: readonly {
    href: string;
    label: string;
    primary?: boolean;
  }[];
  details: readonly {
    label: string;
    value: string;
  }[];
  href: string;
  name: string;
  snapshot: CompetitionLifecycleSnapshot;
  statusLabel: string;
};

export const dynamic = "force-dynamic";

const competitionMeta = {
  LEAGUE_1: {
    href: "/competitions/erste-liga",
    name: "Erste Liga",
  },
  LEAGUE_2: {
    href: "/competitions/zweite-liga",
    name: "Zweite Liga",
  },
  CUP: {
    href: "/competitions/pokal",
    name: "Pokal",
  },
  EUROPE: {
    href: "/competitions/europe",
    name: "Europapokal",
  },
  SUPERCUP: {
    href: "/competitions/supercup",
    name: "Supercup",
  },
} as const satisfies Record<CompetitionType, { href: string; name: string }>;

const actionLabels = {
  CONFIRM_PARTICIPANTS: "Teilnehmer bestätigen",
  GENERATE_FIXTURE: "Spielplan erzeugen",
  MARK_READY: "Bereit markieren",
  ACTIVATE_LEAGUE: "Liga aktivieren",
  RUN_DRAW: "Auslosen",
  GENERATE_NEXT_ROUND: "Nächste Runde erzeugen",
  ACTIVATE_CUP: "Pokal aktivieren",
  GENERATE_EUROPE_PARTICIPANTS: "Teilnehmer erzeugen",
  START_LEAGUE_PHASE: "Ligaphase starten",
  PREPARE_KNOCKOUT: "K.-o.-Phase vorbereiten",
  GENERATE_SUPERCUP_FIXTURE: "Spiel erzeugen",
  COMPLETE_COMPETITION: "Abschließen",
} as const satisfies Record<CompetitionLifecycleAction, string>;

const statusLabels = {
  CREATED: "Angelegt",
  PARTICIPANTS_CONFIRMED: "Spielplan fehlt",
  FIXTURE_GENERATED: "Spielplan erzeugt",
  READY: "Bereit",
  ACTIVE: "Bereit",
  COMPLETED: "Abgeschlossen",
  DRAW_REQUIRED: "Auslosung fehlt",
  ROUND_READY: "Ausgelost",
  PARTICIPANTS_REQUIRED: "Teilnehmer offen",
  LEAGUE_PHASE_READY: "Ligaphase bereit",
  KNOCKOUT_READY: "K.-o.-Phase bereit",
  FIXTURE_READY: "Spiel bereit",
} as const satisfies Record<CompetitionLifecycleStatus, string>;

const seasonTabs = [
  { id: "overview", label: "Übersicht" },
  { id: "competitions", label: "Wettbewerbe" },
  { id: "transfer", label: "Transferphase" },
  { id: "imports", label: "Importe" },
  { id: "history", label: "Historie" },
] as const satisfies readonly { id: SeasonTab; label: string }[];

function createCompetitionRow(
  snapshot: CompetitionLifecycleSnapshot,
  managerStats: SeasonManagerStats,
): CompetitionRowView {
  const meta = competitionMeta[snapshot.competitionType];
  const lifecycleActions = snapshot.availableActions.map((action) => ({
    href: "/admin/season",
    label: actionLabels[action],
  }));

  return {
    actions: [
      {
        href: meta.href,
        label: "Öffnen",
        primary: lifecycleActions.length === 0,
      },
      ...lifecycleActions.map((action, index) => ({
        ...action,
        primary: index === 0 && snapshot.competitionType === "EUROPE",
      })),
    ],
    details: createCompetitionDetails(snapshot.competitionType, managerStats),
    href: meta.href,
    name: meta.name,
    snapshot,
    statusLabel: statusLabels[snapshot.status],
  };
}

function readSeasonTab(value: string | undefined): SeasonTab {
  return seasonTabs.some((tab) => tab.id === value)
    ? (value as SeasonTab)
    : "overview";
}

function getSeasonTabHref(tab: SeasonTab) {
  return tab === "overview" ? "/admin/season" : `/admin/season?tab=${tab}`;
}

function getDetailValue(
  competition: CompetitionRowView,
  labels: readonly string[],
  fallback = "—",
) {
  return (
    competition.details.find((detail) => labels.includes(detail.label))?.value ??
    fallback
  );
}

function getNextAction(competition: CompetitionRowView) {
  return (
    competition.actions.find((action) => action.label !== "Öffnen")?.label ??
    "Öffnen"
  );
}

function createCompetitionDetails(
  competitionType: CompetitionType,
  managerStats: SeasonManagerStats,
): readonly { label: string; value: string }[] {
  switch (competitionType) {
    case "LEAGUE_1":
      return [
        { label: "Spielplan", value: "34 Spieltage" },
        { label: "Teilnehmer", value: `${managerStats.firstLeagueManagers} Manager` },
        { label: "Current Matchday", value: "18" },
      ];
    case "LEAGUE_2":
      return [
        { label: "Spielplan", value: "Noch nicht erzeugt" },
        { label: "Teilnehmer", value: `${managerStats.secondLeagueManagers} Manager` },
        { label: "Current Matchday", value: "Setup" },
      ];
    case "CUP":
      return [
        { label: "Auslosung", value: "Runde 1 steht" },
        { label: "Teilnehmer", value: `${managerStats.activeParticipants} Manager` },
        { label: "Current Round", value: "1. Runde" },
      ];
    case "EUROPE":
      return [
        { label: "Teilnehmer", value: "Noch nicht erzeugt" },
        { label: "Ligaphase", value: "Nicht vorbereitet" },
        { label: "Current Round", value: "Setup" },
      ];
    case "SUPERCUP":
      return [
        { label: "Teilnehmer", value: "Meister vs Pokalsieger" },
        { label: "Spiel", value: "Angelegt" },
        { label: "Current Round", value: "Finale" },
      ];
  }
}

function getOpenTasks(snapshots: readonly CompetitionLifecycleSnapshot[]) {
  return snapshots.filter(
    (snapshot) =>
      snapshot.status === "PARTICIPANTS_CONFIRMED" ||
      snapshot.status === "PARTICIPANTS_REQUIRED" ||
      snapshot.status === "DRAW_REQUIRED" ||
      snapshot.status === "CREATED",
  );
}

function createKpis(
  snapshots: readonly CompetitionLifecycleSnapshot[],
  managerStats: SeasonManagerStats,
  transferStatus: string,
  activeSeasonName: string,
) {
  const openTasks = getOpenTasks(snapshots);

  return [
    {
      label: "Saison",
      value: activeSeasonName,
      detail: `${managerStats.activeParticipants} aktive Manager`,
    },
    {
      label: "Transferfenster",
      value: transferStatus,
      detail: "Sommer / Winter",
    },
    {
      label: "Phase",
      value: openTasks.length > 0 ? "Setup" : "Bereit",
      detail: `${snapshots.length} Wettbewerbe`,
    },
    {
      label: "Aufgaben",
      value: String(openTasks.length),
      detail: openTasks.length === 1 ? "offen" : "offen",
    },
  ] as const;
}

function createCurrentTasks(
  snapshots: readonly CompetitionLifecycleSnapshot[],
): readonly {
  label: string;
  tone: TaskTone;
}[] {
  return [
    ...snapshots
      .filter((snapshot) =>
        snapshot.availableActions.includes("GENERATE_FIXTURE"),
      )
      .map((snapshot) => ({
        label: `${competitionMeta[snapshot.competitionType].name} Spielplan fehlt`,
        tone: "open" as const,
      })),
    ...snapshots
      .filter((snapshot) =>
        snapshot.availableActions.includes("GENERATE_EUROPE_PARTICIPANTS"),
      )
      .map(() => ({
        label: "Europapokal Teilnehmer erzeugen",
        tone: "open" as const,
      })),
    ...snapshots
      .filter((snapshot) => snapshot.competitionType === "LEAGUE_1")
      .map(() => ({ label: "Liga 1 bereit", tone: "ok" as const })),
    ...snapshots
      .filter(
        (snapshot) =>
          snapshot.competitionType === "CUP" &&
          snapshot.completedActions.includes("RUN_DRAW"),
      )
      .map(() => ({ label: "Pokal ausgelost", tone: "ok" as const })),
    ...snapshots
      .filter((snapshot) => snapshot.competitionType === "SUPERCUP")
      .map(() => ({ label: "Supercup angelegt", tone: "ok" as const })),
  ];
}

function createTimeline(snapshots: readonly CompetitionLifecycleSnapshot[]) {
  return [
    { time: "08:20", event: "Neue Saison angelegt" },
    { time: "08:34", event: "Transferphase geöffnet" },
    ...snapshots
      .flatMap((snapshot) => snapshot.timelineEntries)
      .map((entry) => ({
        time: entry.time,
        event: entry.description,
      })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 8);
}

function formatTransferPhase(phase: "SUMMER" | "WINTER" | null) {
  if (phase === "SUMMER") {
    return "Sommer";
  }

  if (phase === "WINTER") {
    return "Winter";
  }

  return "Geschlossen";
}

export default async function SeasonOperationsCenterPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const [params, seasonOperations, transferPeriod] = await Promise.all([
    searchParams,
    loadCurrentSeasonOperations(),
    loadTransferPeriodAdminSnapshot(),
  ]);
  const { dataSource, snapshot } = seasonOperations;
  const activeTab = readSeasonTab(params?.tab);
  const competitions = snapshot.competitions.map((competition) =>
    createCompetitionRow(competition, snapshot.managerStats),
  );
  const transferStatus = transferPeriod.activePhase
    ? `${formatTransferPhase(transferPeriod.activePhase)} offen`
    : "Geschlossen";
  const kpis = createKpis(
    snapshot.competitions,
    snapshot.managerStats,
    transferStatus,
    snapshot.activeSeason.name,
  );
  const currentTasks = createCurrentTasks(snapshot.competitions);
  const timeline = createTimeline(snapshot.competitions);

  return (
    <main className="season-ops">
      <section className="season-ops-hero" aria-labelledby="season-hero">
        <div>
          <span className="matchday-ops-eyebrow">Season Operations</span>
          <h1 id="season-hero">{snapshot.activeSeason.name}</h1>
        </div>
        <div className="season-ops-hero-meta">
          <article>
            <span>Phase</span>
            <strong>{transferStatus}</strong>
          </article>
          <article>
            <span>Lifecycle</span>
            <strong>{snapshot.activeSeason.status}</strong>
          </article>
          <article
            className={`matchday-source-badge ${dataSource.toLowerCase()}`}
            aria-label={`Quelle ${
              dataSource === "DATABASE" ? "Datenbank" : "Fixture"
            }`}
          >
            <span>Quelle</span>
            <strong>{dataSource === "DATABASE" ? "Datenbank" : "Fixture"}</strong>
          </article>
        </div>
      </section>

      <nav className="season-office-tabs" aria-label="Saisonbereiche">
        {seasonTabs.map((tab) => (
          <Link
            aria-current={tab.id === activeTab ? "page" : undefined}
            className={tab.id === activeTab ? "active" : undefined}
            href={getSeasonTabHref(tab.id)}
            key={tab.id}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="season-office-panel">
          <div className="season-ops-kpis" aria-label="Saison KPIs">
            {kpis.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
          <section className="season-current-tasks" aria-labelledby="season-tasks">
            <header className="matchday-section-heading compact">
              <div>
                <span>Aktuell</span>
                <h2 id="season-tasks">Current Tasks</h2>
              </div>
              <b>{currentTasks.filter((task) => task.tone === "open").length} offen</b>
            </header>
            <div className="season-task-list compact">
              {currentTasks.map((task) => (
                <div className={task.tone} key={task.label}>
                  <span aria-hidden="true">{task.tone === "ok" ? "✓" : "○"}</span>
                  <strong>{task.label}</strong>
                </div>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === "competitions" ? (
        <section className="season-office-panel" aria-label="Wettbewerbe">
          <div className="season-competition-table">
            <div className="season-competition-table-head">
              <span>Competition</span>
              <span>Status</span>
              <span>Current Matchday</span>
              <span>Participants</span>
              <span>Next action</span>
              <span>Open</span>
            </div>
            {competitions.map((competition) => (
              <article
                className="season-competition-row"
                key={competition.snapshot.competitionId}
              >
                <strong>{competition.name}</strong>
                <span>{competition.statusLabel}</span>
                <span>{getDetailValue(competition, ["Current Matchday", "Current Round"])}</span>
                <span>{getDetailValue(competition, ["Teilnehmer"])}</span>
                <span>{getNextAction(competition)}</span>
                <Link href={competition.href}>Öffnen</Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "transfer" ? (
        <section className="season-office-panel" aria-labelledby="season-transfer">
          <header className="matchday-section-heading compact">
            <div>
              <span>Transferphase</span>
              <h2 id="season-transfer">{transferStatus}</h2>
            </div>
          </header>
          <div className="season-transfer-grid">
            {transferPeriod.phases.map((phase) => (
              <article className="season-transfer-phase" key={phase.phase}>
                <span>{formatTransferPhase(phase.phase)}</span>
                <strong>{phase.status}</strong>
                <small>
                  {phase.status === "OPEN"
                    ? `Geöffnet ${phase.openedAt ? new Date(phase.openedAt).toLocaleDateString("de-DE") : "ohne Datum"}`
                    : phase.closedAt
                      ? `Geschlossen ${new Date(phase.closedAt).toLocaleDateString("de-DE")}`
                      : "Nicht geöffnet"}
                </small>
              </article>
            ))}
            <div className="season-transfer-actions">
              <form action={openTransferPeriodAction}>
                <input name="phase" type="hidden" value="SUMMER" />
                <button
                  className={transferPeriod.activePhase === "SUMMER" ? "primary" : undefined}
                  disabled={transferPeriod.activePhase === "SUMMER"}
                  type="submit"
                >
                  Sommer öffnen
                </button>
              </form>
              <form action={openTransferPeriodAction}>
                <input name="phase" type="hidden" value="WINTER" />
                <button
                  className={transferPeriod.activePhase === "WINTER" ? "primary" : undefined}
                  disabled={transferPeriod.activePhase === "WINTER"}
                  type="submit"
                >
                  Winter öffnen
                </button>
              </form>
              <form action={closeTransferPeriodAction}>
                <button disabled={transferPeriod.status !== "OPEN"} type="submit">
                  Schließen
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "imports" ? (
        <section className="season-office-panel" aria-label="Importe">
          <div className="season-import-list">
            <article>
              <strong>Player Master</strong>
              <span>{snapshot.activeSeason.name}</span>
              <span>Aktuelle Saison</span>
              <Link href="/admin/players">Öffnen</Link>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section
          className="season-office-panel season-ops-timeline"
          aria-labelledby="season-timeline"
        >
          <header className="matchday-section-heading compact">
            <div>
              <span>Historie</span>
              <h2 id="season-timeline">Newest first</h2>
            </div>
          </header>
          <div className="season-history-list">
            {timeline.map((entry) => (
              <details key={`${entry.time}-${entry.event}`}>
                <summary>
                  <time>{entry.time}</time>
                  <strong>{entry.event}</strong>
                </summary>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

async function openTransferPeriodAction(formData: FormData) {
  "use server";

  await openTransferPeriod(formData);
}

async function closeTransferPeriodAction() {
  "use server";

  await closeTransferPeriod();
}
