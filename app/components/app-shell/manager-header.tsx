"use client";

import { usePathname } from "next/navigation";

export function ManagerHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/team")) {
    return null;
  }

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
              <h1>Dashboard</h1>
              <span className="status-dot">Bereit</span>
            </div>
            <p className="manager-meta">Saison 2026/27</p>
          </div>
        </div>

        <div className="manager-stat-grid">
          <div className="header-stat">
            <span>Position</span>
            <strong>—</strong>
            <small>Teamkontext öffnen</small>
          </div>
          <div className="header-stat">
            <span>Punkte</span>
            <strong>—</strong>
            <small>Noch nicht berechnet</small>
          </div>
          <div className="header-stat">
            <span>Tore</span>
            <strong>—</strong>
            <small>Noch nicht berechnet</small>
          </div>
          <div className="header-stat">
            <span>Kaderwert</span>
            <strong>—</strong>
            <small>Manager auswählen</small>
          </div>
        </div>

        <div className="manager-fixtures">
          <div className="form-block">
            <div>
              <span className="header-label">Form</span>
              <small>Noch nicht berechnet</small>
            </div>
            <div className="form-list" aria-label="Keine Form berechnet">
              <span className="form-result draw">—</span>
            </div>
          </div>
          <div className="next-match-compact">
            <span className="header-label">Nächstes Spiel</span>
            <strong>—</strong>
            <small>Im Teamkontext verfügbar</small>
          </div>
        </div>
      </div>
    </header>
  );
}
