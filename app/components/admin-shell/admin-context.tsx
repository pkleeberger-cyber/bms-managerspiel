"use client";

import { usePathname } from "next/navigation";

const currentTasks = [
  { label: "Saisonleitstand prüfen", tone: "ok" },
  { label: "Spieltag 1 PlayerMatchData erfassen", tone: "open" },
  { label: "Pokal-Auslosung ausstehend", tone: "open" },
] as const;

const recentActivity = [
  "Living Fixtures importiert",
  "Matchday Zero vorbereitet",
  "PlayerMatchData wartet auf Eingabe",
] as const;

const systemStatus = [
  { label: "Repository", value: "Aktiv" },
  { label: "Fallback", value: "Bereit" },
  { label: "Engines", value: "Unverändert" },
] as const;

const importTasks = [
  { label: "Spieltag 1 Bewertungen prüfen", tone: "open" },
  { label: "Golden Reference bereit", tone: "ok" },
  { label: "Pokal-Paarungen warten", tone: "open" },
] as const;

const importActivity = [
  "Bundesliga-Spielerpool importiert",
  "Golden Reference verglichen",
  "Spieltag 17 Bewertungen übernommen",
] as const;

const importStatus = [
  { label: "CSV", value: "Placeholder" },
  { label: "Excel", value: "Placeholder" },
  { label: "API", value: "Placeholder" },
] as const;

const playerTasks = [
  { label: "Spielerpool aus Prisma prüfen", tone: "ok" },
  { label: "Fehlende Imports beobachten", tone: "open" },
  { label: "Transferstatus später anbinden", tone: "open" },
] as const;

const playerActivity = [
  "Player Master geöffnet",
  "Prisma als einzige Quelle aktiv",
  "Fixture-Fallback bewusst deaktiviert",
] as const;

const playerStatus = [
  { label: "Player Count", value: "Prisma" },
  { label: "Last Import", value: "Master Data" },
  { label: "Missing Imports", value: "Prüfen" },
] as const;

export function AdminContext() {
  const pathname = usePathname();
  const isImportCenter = pathname === "/admin/import";
  const isPlayerMaster = pathname === "/admin/players";
  const visibleTasks = isImportCenter
    ? importTasks
    : isPlayerMaster
      ? playerTasks
      : currentTasks;
  const visibleActivity = isImportCenter
    ? importActivity
    : isPlayerMaster
      ? playerActivity
      : recentActivity;
  const visibleStatus = isImportCenter
    ? importStatus
    : isPlayerMaster
      ? playerStatus
      : systemStatus;

  return (
    <aside className="admin-context" aria-label="Operativer Kontext">
      <section className="admin-context-card">
        <header>
          <span>
            {isImportCenter ? "Importe" : isPlayerMaster ? "Spieler" : "Aufgaben"}
          </span>
          <h2>
            {isImportCenter
              ? "Current Imports"
              : isPlayerMaster
                ? "Current Tasks"
                : "Current Tasks"}
          </h2>
        </header>
        <div className="admin-context-task-list">
          {visibleTasks.map((task) => (
            <div className={task.tone} key={task.label}>
              <span aria-hidden="true">{task.tone === "ok" ? "✓" : "○"}</span>
              <strong>{task.label}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-context-card">
        <header>
          <span>Aktivität</span>
          <h2>
            {isImportCenter
              ? "Recent Imports"
              : isPlayerMaster
                ? "Last Import"
                : "Recent Activity"}
          </h2>
        </header>
        <div className="admin-context-activity">
          {visibleActivity.map((activity) => (
            <article key={activity}>
              <span aria-hidden="true" />
              <strong>{activity}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-context-card">
        <header>
          <span>Status</span>
          <h2>System Status</h2>
        </header>
        <div className="admin-context-status">
          {visibleStatus.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
