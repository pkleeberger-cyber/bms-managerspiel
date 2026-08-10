"use client";

import type { ChangeEvent, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ManagerContextSnapshot } from "@/application/manager-context-service";
import { TeamSideNavigation } from "@/components/app-shell/team-side-navigation";

export function TeamManagerContext({
  children,
  managerContext,
}: {
  children: ReactNode;
  managerContext: ManagerContextSnapshot;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryManagerSeasonId = searchParams.get("managerSeasonId");
  const queryManagerExists = managerContext.activeManagerSeasons.some(
    (managerSeason) => managerSeason.id === queryManagerSeasonId,
  );
  const selectedManagerSeasonId =
    queryManagerExists && queryManagerSeasonId
      ? queryManagerSeasonId
      : managerContext.selectedManagerSeasonId ?? "";
  const selectedManager = managerContext.activeManagerSeasons.find(
    (managerSeason) => managerSeason.id === selectedManagerSeasonId,
  );
  const selectedSummary = managerContext.teamSummaries.find(
    (summary) => summary.managerSeasonId === selectedManagerSeasonId,
  );

  function handleManagerChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextManagerSeasonId = event.target.value;
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextManagerSeasonId) {
      nextParams.set("managerSeasonId", nextManagerSeasonId);
    } else {
      nextParams.delete("managerSeasonId");
    }

    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="team-content-layout">
      <TeamSideNavigation defaultManagerSeasonId={selectedManagerSeasonId} />
      <div className="team-shell-content">
        <LivingTeamHeader summary={selectedSummary} />
        <section className="manager-context-selector" aria-label="Manager-Auswahl">
          <div>
            <span>Manager-Auswahl</span>
            <strong>{selectedManager?.displayName ?? "Keine aktiven Manager"}</strong>
          </div>
          <div>
            <label htmlFor="managerSeasonId">Manager</label>
            <select
              disabled={managerContext.activeManagerSeasons.length === 0}
              id="managerSeasonId"
              name="managerSeasonId"
              onChange={handleManagerChange}
              value={selectedManagerSeasonId}
            >
              {managerContext.activeManagerSeasons.length === 0 ? (
                <option value="">Keine aktiven Manager</option>
              ) : (
                managerContext.activeManagerSeasons.map((managerSeason) => (
                  <option key={managerSeason.id} value={managerSeason.id}>
                    {managerSeason.displayName}
                  </option>
                ))
              )}
            </select>
          </div>
        </section>
        {children}
      </div>
    </div>
  );
}

function LivingTeamHeader({
  summary,
}: {
  summary: ManagerContextSnapshot["teamSummaries"][number] | undefined;
}) {
  const nextFixture = summary?.nextFixture;

  return (
    <header className="manager-header living-team-header">
      <div className="manager-header-inner">
        <div className="manager-identity">
          <TeamCrest />
          <div>
            <div className="manager-name-row">
              <h1>{summary?.managerName ?? "Kein Manager ausgewählt"}</h1>
              <span className="status-dot">{summary ? formatStatus(summary.status) : "—"}</span>
            </div>
            <p className="manager-kicker">BMS Managerspiel</p>
            <p className="manager-meta">
              {summary
                ? `${summary.seasonName} · ${formatLeague(summary.league)}`
                : "Keine Living-Team-Daten verfügbar"}
            </p>
          </div>
        </div>

        <div className="manager-stat-grid">
          <div className="header-stat">
            <span>Spieltag</span>
            <strong>
              {summary?.currentMatchday ? `ST ${summary.currentMatchday}` : "—"}
            </strong>
            <small>Aus Living Fixtures</small>
          </div>
          <div className="header-stat">
            <span>Kaderwert</span>
            <strong>
              {summary?.teamValue === null || summary?.teamValue === undefined
                ? "—"
                : formatMarketValue(summary.teamValue)}
            </strong>
            <small>
              {summary?.squadCount === null || summary?.squadCount === undefined
                ? "Keine Kaderquelle"
                : `${summary.squadCount} Spieler`}
            </small>
          </div>
          <div className="header-stat">
            <span>Budget</span>
            <strong>
              {summary ? formatMarketValue(summary.budget) : "—"}
            </strong>
            <small>ManagerSeason</small>
          </div>
          <div className="header-stat">
            <span>Letztes Spiel</span>
            <strong>{summary?.lastFixture ? `ST ${summary.lastFixture.matchday}` : "—"}</strong>
            <small>
              {summary?.lastFixture
                ? summary.lastFixture.opponent
                : "Noch nicht berechnet"}
            </small>
          </div>
        </div>

        <div className="manager-fixtures">
          <div className="form-block">
            <span className="header-label">Form</span>
            <div className="form-list" aria-label="Form noch nicht berechnet">
              <span className="form-result draw">—</span>
            </div>
            <small>Noch nicht berechnet</small>
          </div>
          <div className="next-match-compact">
            <span className="header-label">Nächstes Spiel</span>
            <strong>{nextFixture ? `vs ${nextFixture.opponent}` : "Noch nicht geplant"}</strong>
            <small>
              {nextFixture
                ? `${nextFixture.matchday}. Spieltag · ${
                    nextFixture.venue === "HOME" ? "Heim" : "Auswärts"
                  } · Noch nicht berechnet`
                : "Keine Living Fixture"}
            </small>
          </div>
        </div>
      </div>
    </header>
  );
}

function TeamCrest() {
  return (
    <svg
      aria-label="BMS Wappen"
      className="manager-logo"
      fill="none"
      role="img"
      viewBox="0 0 100 118"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 4 L94 18 L94 62 Q94 98 50 114 Q6 98 6 62 L6 18 Z"
        fill="#0f1e35"
        stroke="#22c55e"
        strokeWidth="3"
      />
      <path d="M6 18 L94 18 L94 40 L6 40 Z" fill="#1a3050" />
      <path
        d="M6 40 L94 40 L94 62 Q94 82 75 96 L50 109 L25 96 Q6 82 6 62 Z"
        fill="#0d1a2e"
      />
      <path
        d="M35 52 L50 36 L65 52 L65 76 Q58 84 50 88 Q42 84 35 76 Z"
        stroke="#22c55e"
        strokeWidth="2"
      />
      <text
        fill="#22c55e"
        fontFamily="Exo 2, sans-serif"
        fontSize="13"
        fontWeight="700"
        textAnchor="middle"
        x="50"
        y="72"
      >
        BMS
      </text>
      <text
        fill="#ffffff"
        fontFamily="Exo 2, sans-serif"
        fontSize="10"
        fontWeight="600"
        opacity="0.9"
        textAnchor="middle"
        x="50"
        y="32"
      >
        ★ ★ ★
      </text>
    </svg>
  );
}

function formatLeague(league: "FIRST" | "SECOND") {
  return league === "FIRST" ? "Erste Liga" : "Zweite Liga";
}

function formatStatus(status: "ACTIVE" | "PAUSED" | "ARCHIVED") {
  if (status === "ACTIVE") {
    return "Aktiv";
  }

  return status === "PAUSED" ? "Pausiert" : "Archiviert";
}

function formatMarketValue(value: number): string {
  return `${value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} Mio. €`;
}
