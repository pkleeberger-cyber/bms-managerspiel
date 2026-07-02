import Link from "next/link";

const matchdayStats = [
  { label: "Spieltag", value: "18", detail: "Aktueller Spieltag" },
  { label: "Modus", value: "Datenerfassung", detail: "Zentrale Realspielerdaten" },
  { label: "Spielerpool", value: "42", detail: "Relevant für aktive Manager" },
  { label: "Erfasst", value: "28", detail: "Gespeicherte Einträge" },
  { label: "Offen", value: "14", detail: "Noch zu prüfen" },
] as const;

const positionOptions = ["Alle Positionen", "Torwart", "Abwehr", "Mittelfeld", "Sturm"] as const;

const clubOptions = [
  "Alle Vereine",
  "Bayer Leverkusen",
  "Bayern München",
  "Borussia Dortmund",
  "RB Leipzig",
  "VfB Stuttgart",
] as const;

const statusOptions = ["Alle", "Offen", "Erfasst"] as const;

const relevantPlayers = [
  {
    name: "Florian Wirtz",
    club: "Bayer Leverkusen",
    position: "MF",
    managerCount: 5,
    rating: "2,0",
    goals: 1,
    yellowRed: false,
    red: false,
    teamOfTheWeek: true,
    status: "gespeichert",
  },
  {
    name: "Serhou Guirassy",
    club: "Borussia Dortmund",
    position: "ST",
    managerCount: 4,
    rating: "",
    goals: 1,
    yellowRed: false,
    red: false,
    teamOfTheWeek: false,
    status: "offen",
  },
  {
    name: "Jamal Musiala",
    club: "Bayern München",
    position: "MF",
    managerCount: 3,
    rating: "2,5",
    goals: 0,
    yellowRed: false,
    red: false,
    teamOfTheWeek: false,
    status: "gespeichert",
  },
  {
    name: "Willi Orban",
    club: "RB Leipzig",
    position: "AB",
    managerCount: 2,
    rating: "",
    goals: 0,
    yellowRed: false,
    red: true,
    teamOfTheWeek: false,
    status: "offen",
  },
  {
    name: "Alexander Nübel",
    club: "VfB Stuttgart",
    position: "TW",
    managerCount: 3,
    rating: "3,0",
    goals: 0,
    yellowRed: false,
    red: false,
    teamOfTheWeek: false,
    status: "gespeichert",
  },
] as const;

const ratingOptions = ["", "1,0", "1,5", "2,0", "2,5", "3,0", "3,5", "4,0", "4,5", "5,0", "5,5", "6,0"] as const;

export default function MatchdayDataEntryPage() {
  return (
    <main className="matchday-data-entry">
      <header className="matchday-ops-title">
        <span>Administration / Spieltag / Datenerfassung</span>
        <h1>Spielerdaten erfassen</h1>
        <p>
          Pflege zentrale Realspielerdaten für den aktuellen Spieltag. Diese
          Daten werden später von allen Manager-Kadern gemeinsam genutzt.
        </p>
      </header>

      <section className="matchday-data-hero" aria-labelledby="data-entry-hero">
        <div>
          <span className="matchday-ops-eyebrow">Spieltag 18</span>
          <h2 id="data-entry-hero">Datenerfassung</h2>
          <p>
            Der Spielerpool enthält nur Realspieler, die am Spieltag bei
            mindestens einem aktiven Manager unter Vertrag stehen.
          </p>
        </div>
        <div className="matchday-data-hero-grid">
          {matchdayStats.map((stat) => (
            <article key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="matchday-data-notice">
        <strong>Sonderfallwertung</strong>
        <span>
          Keine Note + Tor oder Karte wird automatisch mit neutraler Note 3,5
          gewertet.
        </span>
      </section>

      <section className="matchday-data-card" aria-labelledby="data-entry-filter">
        <header className="matchday-section-heading">
          <div>
            <span>Filter</span>
            <h2 id="data-entry-filter">Relevanten Spielerpool eingrenzen</h2>
          </div>
          <b>Keine Manager-Paarungen</b>
        </header>

        <div className="matchday-filter-bar">
          <label>
            <span>Suche</span>
            <input placeholder="Spieler suchen" type="search" />
          </label>
          <label>
            <span>Position</span>
            <select defaultValue={positionOptions[0]}>
              {positionOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Bundesliga-Verein</span>
            <select defaultValue={clubOptions[0]}>
              {clubOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select defaultValue={statusOptions[0]}>
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="matchday-event-filter">
            <input type="checkbox" />
            <span>Ereignisse vorhanden</span>
          </label>
        </div>
      </section>

      <section className="matchday-data-card" aria-labelledby="player-entry-list">
        <header className="matchday-section-heading">
          <div>
            <span>Erfassung</span>
            <h2 id="player-entry-list">Relevante BMS-Spieler</h2>
          </div>
          <b>{relevantPlayers.length} Einträge sichtbar</b>
        </header>

        <div className="matchday-player-entry-list">
          <div className="matchday-player-entry-head" aria-hidden="true">
            <span>Spieler</span>
            <span>Manager</span>
            <span>Note</span>
            <span>Tore</span>
            <span>Gelb-Rot</span>
            <span>Rot</span>
            <span>Elf</span>
            <span>Status</span>
          </div>

          {relevantPlayers.map((player) => (
            <article className="matchday-player-entry-row" key={player.name}>
              <div className="matchday-player-entry-main">
                <span className="matchday-player-position">{player.position}</span>
                <div>
                  <strong>{player.name}</strong>
                  <span>{player.club}</span>
                </div>
              </div>

              <div className="matchday-manager-count">
                <strong>{player.managerCount}</strong>
                <span>Kader</span>
              </div>

              <label className="matchday-data-field compact">
                <span>Note</span>
                <select defaultValue={player.rating}>
                  {ratingOptions.map((rating) => (
                    <option key={rating || "empty"} value={rating}>
                      {rating || "—"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="matchday-data-field compact">
                <span>Tore</span>
                <input defaultValue={player.goals} min="0" type="number" />
              </label>

              <label className="matchday-toggle-field">
                <input defaultChecked={player.yellowRed} type="checkbox" />
                <span>Gelb-Rot</span>
              </label>

              <label className="matchday-toggle-field">
                <input defaultChecked={player.red} type="checkbox" />
                <span>Rot</span>
              </label>

              <label className="matchday-toggle-field">
                <input defaultChecked={player.teamOfTheWeek} type="checkbox" />
                <span>Elf des Tages</span>
              </label>

              <span className={`matchday-entry-status ${player.status}`}>
                {player.status === "gespeichert" ? "Gespeichert" : "Offen"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer className="matchday-data-actions" aria-label="Aktionen">
        <Link href="/admin/matchday">Zurück zum Spieltagsleitstand</Link>
        <button type="button">Zwischenspeichern</button>
        <button className="primary" type="button">
          Datenerfassung abschließen
        </button>
      </footer>
    </main>
  );
}
