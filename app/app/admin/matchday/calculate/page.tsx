import Link from "next/link";

const calculationMeta = [
  { label: "Spieltag", value: "18" },
  { label: "Saison", value: "2026/27" },
  { label: "Zeitpunkt", value: "Heute 09:23" },
] as const;

const pipelineSteps = [
  {
    title: "Historical Squad",
    status: "Completed",
    detail: "Historische Kaderstände geladen",
    tone: "completed",
    icon: "✓",
  },
  {
    title: "Lineup Engine",
    status: "Completed",
    detail: "Manager-Aufstellungen ausgewertet",
    tone: "completed",
    icon: "✓",
  },
  {
    title: "Match Result Engine",
    status: "Completed",
    detail: "Begegnungen berechnet",
    tone: "completed",
    icon: "✓",
  },
  {
    title: "League Engine",
    status: "Completed",
    detail: "Zwischentabelle vorbereitet",
    tone: "completed",
    icon: "✓",
  },
  {
    title: "Rules Engine",
    status: "Completed",
    detail: "Regelkandidaten erkannt",
    tone: "completed",
    icon: "✓",
  },
  {
    title: "Official Matchday",
    status: "Completed",
    detail: "Offizieller Spieltag erzeugt",
    tone: "completed",
    icon: "✓",
  },
  {
    title: "Match Analysis",
    status: "Completed",
    detail: "Analyseobjekte erstellt",
    tone: "completed",
    icon: "✓",
  },
  {
    title: "Event Engine",
    status: "Completed",
    detail: "Ereignisse erzeugt",
    tone: "completed",
    icon: "✓",
  },
  {
    title: "Official League Table",
    status: "Completed",
    detail: "Tabelle aktualisiert",
    tone: "completed",
    icon: "✓",
  },
] as const;

const statusLegend = [
  { label: "Waiting", icon: "○", tone: "waiting" },
  { label: "Running", icon: "↻", tone: "running" },
  { label: "Completed", icon: "✓", tone: "completed" },
  { label: "Later", icon: "…", tone: "later" },
  { label: "Error", icon: "!", tone: "error" },
] as const;

const summaryCards = [
  { label: "Manager ausgewertet", value: "612", detail: "Aktive Bewertungen" },
  { label: "Begegnungen berechnet", value: "306", detail: "Offizielle Fixtures" },
  { label: "Regelkandidaten", value: "43", detail: "Für Admin-Prüfung" },
  { label: "Events erzeugt", value: "18", detail: "Story- und Ligaevents" },
  { label: "Tabellen aktualisiert", value: "2", detail: "Liga-Snapshots" },
] as const;

const calculationLog = [
  { time: "09:18", event: "Datenerfassung abgeschlossen" },
  { time: "09:19", event: "Lineup Engine gestartet" },
  { time: "09:20", event: "612 Manager ausgewertet" },
  { time: "09:21", event: "306 Begegnungen berechnet" },
  { time: "09:22", event: "43 Regelkandidaten erkannt" },
  { time: "09:23", event: "Berechnung abgeschlossen" },
] as const;

export default function MatchdayCalculationCenterPage() {
  return (
    <main className="matchday-calculation">
      <header className="matchday-ops-title">
        <span>Administration / Spieltag / Berechnung</span>
        <h1>Spieltag berechnen</h1>
        <p>Die BMS-Engine verarbeitet den aktuellen Spieltag.</p>
      </header>

      <section className="matchday-calculation-hero" aria-labelledby="calculation-hero">
        <div>
          <span className="matchday-ops-eyebrow">Offizielle BMS-Berechnung</span>
          <h2 id="calculation-hero">Die Engine-Pipeline ist abgeschlossen</h2>
          <p>
            Jeder Schritt zeigt, welcher Teil der validierten Domain-Pipeline
            den Spieltag verarbeitet hat.
          </p>
        </div>
        <div className="matchday-calculation-meta">
          {calculationMeta.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section
        className="matchday-calculation-card"
        aria-labelledby="calculation-pipeline"
      >
        <header className="matchday-section-heading">
          <div>
            <span>Pipeline</span>
            <h2 id="calculation-pipeline">BMS Calculation Pipeline</h2>
          </div>
          <b>9 Schritte</b>
        </header>

        <div className="matchday-pipeline-status-legend" aria-label="Pipeline-Status">
          {statusLegend.map((status) => (
            <span className={status.tone} key={status.label}>
              <b aria-hidden="true">{status.icon}</b>
              {status.label}
            </span>
          ))}
        </div>

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

      <section
        className="matchday-calculation-card"
        aria-labelledby="calculation-summary"
      >
        <header className="matchday-section-heading">
          <div>
            <span>Ergebnis</span>
            <h2 id="calculation-summary">Calculation Summary</h2>
          </div>
          <b>Erfolgreich</b>
        </header>

        <div className="matchday-calculation-summary">
          {summaryCards.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="matchday-calculation-card" aria-labelledby="calculation-log">
        <header className="matchday-section-heading">
          <div>
            <span>Protokoll</span>
            <h2 id="calculation-log">Calculation Log</h2>
          </div>
          <b>Timeline</b>
        </header>

        <div className="matchday-activity-timeline">
          {calculationLog.map((entry) => (
            <article key={`${entry.time}-${entry.event}`}>
              <time>{entry.time}</time>
              <span aria-hidden="true" />
              <strong>{entry.event}</strong>
            </article>
          ))}
        </div>
      </section>

      <footer className="matchday-calculation-actions" aria-label="Aktionen">
        <Link href="/admin/matchday">Zurück zum Leitstand</Link>
        <Link className="primary" href="/admin/matchday/review">
          Regelprüfung öffnen
        </Link>
      </footer>
    </main>
  );
}
