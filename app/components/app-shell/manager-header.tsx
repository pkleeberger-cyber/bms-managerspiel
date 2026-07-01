const form = [
  { result: "W", tone: "win" },
  { result: "W", tone: "win" },
  { result: "D", tone: "draw" },
  { result: "L", tone: "loss" },
  { result: "W", tone: "win" },
];

export function ManagerHeader() {
  return (
    <header className="manager-header">
      <div className="manager-header-inner">
        <div className="manager-identity">
          <div className="manager-logo" aria-label="Manager Logo">
            PM
          </div>
          <div>
            <p className="manager-kicker">BMS Managerspiel</p>
            <div className="manager-name-row">
              <h1>Patrick</h1>
              <span className="status-dot">Aktiv</span>
            </div>
            <p className="manager-meta">Saison 2026/27 · Erste Liga</p>
          </div>
        </div>

        <div className="manager-stat-grid">
          <div className="header-stat">
            <span>Position</span>
            <strong>3.</strong>
            <small>von 12 Managern</small>
          </div>
          <div className="header-stat">
            <span>Punkte</span>
            <strong>34</strong>
            <small>+3 zum 4. Platz</small>
          </div>
          <div className="header-stat">
            <span>Tore</span>
            <strong>812 : 745</strong>
            <small>Differenz +67</small>
          </div>
          <div className="header-stat">
            <span>Kaderwert</span>
            <strong>76,4 Mio. €</strong>
            <small>Ligaplatz 2</small>
          </div>
        </div>

        <div className="manager-fixtures">
          <div className="form-block">
            <div>
              <span className="header-label">Form</span>
              <small>Letzte 5 Spiele</small>
            </div>
            <div className="form-list" aria-label="Form: Sieg, Sieg, Unentschieden, Niederlage, Sieg">
              {form.map((item, index) => (
                <span className={`form-result ${item.tone}`} key={`${item.result}-${index}`}>
                  {item.result}
                </span>
              ))}
            </div>
          </div>
          <div className="next-match-compact">
            <span className="header-label">Nächstes Spiel</span>
            <strong>vs FC Bayern Manager</strong>
            <small>19. Spieltag · Auswärts</small>
          </div>
        </div>
      </div>
    </header>
  );
}
