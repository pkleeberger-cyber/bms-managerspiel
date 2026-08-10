import Link from "next/link";

const importModules = [
  {
    title: "Bundesliga-Spielerpool",
    description: "Neue Saison",
    status: "Importiert",
    tone: "ready",
    details: ["612 Spieler", "18 Clubs", "Marktwerte vorbereitet"],
    actions: ["Import starten", "Historie"],
    primaryHref: "/admin/import/player-master",
  },
  {
    title: "Manager-Kader",
    description: "Transferstände",
    status: "Nicht importiert",
    tone: "attention",
    details: ["24 Manager", "Sommerfenster", "Kaderstände offen"],
    actions: ["Importieren", "Historie"],
    primaryHref: "/admin/import/managers",
  },
  {
    title: "Historische Kader",
    description: "Manager · Slots · Spieler",
    status: "Nicht importiert",
    tone: "attention",
    details: ["18 Slots", "ManagerSeason", "Historie"],
    actions: ["Importieren", "Historie"],
    primaryHref: "/admin/import/squads",
  },
  {
    title: "Spieltagsbewertungen",
    description: "Noten · Tore · Karten · Elf des Tages",
    status: "Aktion erforderlich",
    tone: "attention",
    details: ["Noten", "Tore", "Karten", "Elf des Tages"],
    actions: ["Importieren", "Historie"],
    primaryHref: "/admin/import/matchday-backfill",
  },
  {
    title: "Paarungen",
    description: "Spielplan und Ergebnisse",
    status: "Teilweise importiert",
    tone: "waiting",
    details: ["Spielplan", "Ergebnisse", "Pokalrunden"],
    actions: ["Importieren", "Historie"],
  },
  {
    title: "Golden Reference",
    description: "Referenzdaten",
    status: "Importiert",
    tone: "ready",
    details: ["Excel", "Vergleich", "Abweichungen dokumentiert"],
    actions: ["Importieren", "Vergleichen"],
  },
] as const;

const importHistory = [
  {
    time: "12.07.",
    title: "Bundesliga-Spieler",
    detail: "Importiert",
    status: "Importiert",
  },
  {
    time: "14.07.",
    title: "Golden Reference",
    detail: "Referenzdaten",
    status: "Importiert",
  },
  {
    time: "18.01.",
    title: "Spieltag 17",
    detail: "Bewertungen",
    status: "Importiert",
  },
] as const;

const importChannels = ["CSV", "Excel", "API", "Manual"] as const;

export default function ImportCenterPage() {
  return (
    <main className="import-center">
      <header className="import-center-title">
        <span>Administration / Import</span>
        <h1>Import Center</h1>
        <p>Importiere externe Daten in das BMS.</p>
      </header>

      <section className="import-center-hero" aria-labelledby="import-hero">
        <div>
          <span className="matchday-ops-eyebrow">Operational Gateway</span>
          <h2 id="import-hero">Externe Daten kontrolliert ins BMS übernehmen.</h2>
          <p>
            Jeder Import bleibt nachvollziehbar: Quelle, Zweck, erwartete
            Änderungen und Sicherheitsstatus sind vor der Ausführung sichtbar.
          </p>
        </div>
        <div className="import-center-hero-grid">
          <article>
            <span>Aktive Saison</span>
            <strong>2026/27</strong>
            <small>Operations Season</small>
          </article>
          <article>
            <span>Letzter Import</span>
            <strong>14.07.</strong>
            <small>Golden Reference</small>
          </article>
          <article>
            <span>Importstatus</span>
            <strong>Prüfung offen</strong>
            <small>2 Aktionen erforderlich</small>
          </article>
        </div>
      </section>

      <section className="import-module-grid" aria-label="Import Module">
        {importModules.map((module) => (
          <article className={`import-module-card ${module.tone}`} key={module.title}>
            <header>
              <div>
                <span>{module.description}</span>
                <h2>{module.title}</h2>
              </div>
              <strong>{module.status}</strong>
            </header>

            <div className="import-module-detail-list">
              {module.details.map((detail) => (
                <span key={detail}>{detail}</span>
              ))}
            </div>

            <div className="import-module-safety">
              <span>Sicherheitsprüfung</span>
              <strong>
                {module.tone === "ready"
                  ? "Bereit"
                  : module.tone === "attention"
                    ? "Review erforderlich"
                    : "Wartet auf Quelle"}
              </strong>
            </div>

            <div className="import-module-actions">
              {module.actions.map((action, index) =>
                index === 0 && "primaryHref" in module ? (
                  <Link className="primary" href={module.primaryHref} key={action}>
                    {action}
                  </Link>
                ) : (
                  <button
                    className={index === 0 ? "primary" : undefined}
                    disabled
                    key={action}
                    type="button"
                  >
                    {action}
                  </button>
                ),
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="import-placeholder-card" aria-labelledby="future-imports">
        <div>
          <span>Future Inputs</span>
          <h2 id="future-imports">Importwege vorbereitet, noch nicht implementiert.</h2>
        </div>
        <div className="import-channel-list">
          {importChannels.map((channel) => (
            <span key={channel}>{channel}</span>
          ))}
        </div>
      </section>

      <section className="import-history-card" aria-labelledby="import-history">
        <header className="matchday-section-heading">
          <div>
            <span>Historie</span>
            <h2 id="import-history">Import History</h2>
          </div>
          <b>UI Placeholder</b>
        </header>
        <div className="matchday-activity-timeline">
          {importHistory.map((entry) => (
            <article key={`${entry.time}-${entry.title}`}>
              <time>{entry.time}</time>
              <span aria-hidden="true" />
              <strong>
                {entry.title} · {entry.detail} · {entry.status}
              </strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
