import Link from "next/link";

const budgetRows = [
  {
    label: "Budget Vorsaison",
    amount: "24,0 Mio. €",
    detail: "Verfügbares Budget zum Ende der vergangenen Saison",
    tone: "neutral",
  },
  {
    label: "Saisonabzug",
    amount: "−0,8 Mio. €",
    detail: "Jährlicher Budgetausgleich",
    tone: "negative",
  },
  {
    label: "Prämien",
    amount: "+2,5 Mio. €",
    detail: "Erfolge aus Liga und Pokal",
    tone: "positive",
  },
  {
    label: "Strafen",
    amount: "−0,3 Mio. €",
    detail: "Offene Abzüge aus der Vorsaison",
    tone: "negative",
  },
] as const;

const teamValueRows = [
  {
    label: "Kaderwert Vorsaison",
    value: "68,4 Mio. €",
    tone: "neutral",
  },
  {
    label: "Aktueller Kaderwert",
    value: "74,1 Mio. €",
    tone: "neutral",
  },
  {
    label: "Marktwertentwicklung",
    value: "+5,7 Mio. €",
    tone: "positive",
  },
] as const;

const transferNumbers = [
  { label: "Freie Transfers", value: "4", emphasis: false },
  { label: "Zusätzliche Transfers", value: "2", emphasis: false },
  { label: "Pflichttransfers", value: "2", emphasis: false },
  { label: "Bereits verwendet", value: "1", emphasis: false },
  { label: "Noch verfügbar", value: "5", emphasis: true },
] as const;

const transferChecks = [
  { label: "Budget gültig", status: "Erfüllt", tone: "positive" },
  {
    label: "Positionsstruktur korrekt",
    status: "Prüfung ausstehend",
    tone: "warning",
  },
  { label: "Keine Doppelspieler", status: "Erfüllt", tone: "positive" },
  {
    label: "Alle Pflichttransfers erledigt",
    status: "2 offen",
    tone: "negative",
  },
] as const;

const bundesligaDepartures = [
  {
    name: "Mats Beispiel",
    position: "Abwehr",
    formerClub: "SC Beispielstadt",
  },
  {
    name: "Jonas Muster",
    position: "Mittelfeld",
    formerClub: "SV Musterhausen",
  },
] as const;

export default function TransferCenterPage() {
  return (
    <div className="transfer-center">
      <header className="transfer-center-hero">
        <div className="transfer-center-hero-copy">
          <span>Mein Team / Transfers</span>
          <h1>Sommertransfer 2026/27</h1>
          <p>
            Die Bundesliga ist zurück. Bereite deine Mannschaft auf die neue
            Saison vor.
          </p>
        </div>
        <div className="transfer-phase-status">
          <span className="transfer-status-dot" aria-hidden="true" />
          <div>
            <strong>Transferphase geöffnet</strong>
            <span>Noch 18 Tage</span>
          </div>
        </div>
      </header>

      <main className="transfer-center-content">
        <div className="transfer-primary-grid">
          <section className="transfer-card transfer-budget-card">
            <header className="transfer-card-heading">
              <div>
                <span>Finanzieller Rahmen</span>
                <h2>Budget &amp; Teamwert</h2>
              </div>
              <div className="transfer-budget-total">
                <span>Transferbudget</span>
                <strong>25,4 Mio. €</strong>
              </div>
            </header>

            <div className="transfer-budget-list">
              {budgetRows.map((row, index) => (
                <div className="transfer-budget-row" key={row.label}>
                  <span className="transfer-budget-step">{index + 1}</span>
                  <div>
                    <strong>{row.label}</strong>
                    <span>{row.detail}</span>
                  </div>
                  <b className={row.tone}>{row.amount}</b>
                </div>
              ))}
            </div>

            <div className="transfer-team-value">
              <span className="transfer-subheading">Teamwert</span>
              {teamValueRows.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <strong className={row.tone}>{row.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="transfer-card transfer-status-card">
            <header className="transfer-card-heading">
              <div>
                <span>Dein Rahmen</span>
                <h2>Transferstatus</h2>
              </div>
              <span className="transfer-card-badge">Phase aktiv</span>
            </header>

            <div className="transfer-number-grid">
              {transferNumbers.map((item) => (
                <article
                  className={item.emphasis ? "emphasis" : undefined}
                  key={item.label}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <div className="transfer-check-list">
              <span className="transfer-subheading">Validierungsstatus</span>
              {transferChecks.map((check) => (
                <div key={check.label}>
                  <span
                    className={`transfer-check-indicator ${check.tone}`}
                    aria-hidden="true"
                  />
                  <strong>{check.label}</strong>
                  <b className={check.tone}>{check.status}</b>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="transfer-secondary-grid">
          <section className="transfer-card transfer-departures-card">
            <header className="transfer-card-heading">
              <div>
                <span>Zusätzliche Möglichkeiten</span>
                <h2>Bundesliga-Abgänge</h2>
              </div>
              <span className="transfer-card-badge warning">2 Spieler</span>
            </header>
            <span className="transfer-departure-note">
              Diese Spieler haben die Bundesliga verlassen und können
              zusätzlich ersetzt werden.
            </span>
            <div className="transfer-departure-list">
              {bundesligaDepartures.map((player) => (
                <article key={player.name}>
                  <span className="transfer-position-badge">
                    {player.position}
                  </span>
                  <div>
                    <strong>{player.name}</strong>
                    <span>{player.formerClub}</span>
                  </div>
                  <b>Zusätzlich ersetzbar</b>
                </article>
              ))}
            </div>
          </section>

          <section className="transfer-card transfer-draft-card">
            <header className="transfer-card-heading">
              <div>
                <span>Dein Arbeitsstand</span>
                <h2>Transferentwurf</h2>
              </div>
              <span className="transfer-draft-badge">Entwurf gespeichert</span>
            </header>

            <div className="transfer-draft-current">
              <span>Aktueller Entwurf</span>
              <strong>1 Transfer vorbereitet</strong>
              <b>Noch nicht abgabebereit</b>
            </div>

            <dl className="transfer-draft-meta">
              <div>
                <dt>Letzte Änderung</dt>
                <dd>Heute, 18:42 Uhr</dd>
              </div>
              <div>
                <dt>Teamstatus</dt>
                <dd>Noch nicht abgabebereit</dd>
              </div>
            </dl>

            <div className="transfer-draft-actions">
              <Link href="/team/transfers/workspace">
                Transferarbeitsplatz öffnen
              </Link>
              <button disabled type="button">
                Team verbindlich abgeben
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
