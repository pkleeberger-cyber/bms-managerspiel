"use client";

import { Fragment, useMemo, useState } from "react";

import type {
  AnalysisPlayer,
  MatchAnalysis,
  PlayerComparison,
} from "@/domain/match-analysis-engine";

type PositionFilter = "all" | AnalysisPlayer["position"];
type Tone = "positive" | "negative" | "neutral";

const filters: { label: string; value: PositionFilter }[] = [
  { label: "Alle", value: "all" },
  { label: "Torwart", value: "goalkeeper" },
  { label: "Abwehr", value: "defender" },
  { label: "Mittelfeld", value: "midfielder" },
  { label: "Sturm", value: "forward" },
];

const positionLabels = {
  goalkeeper: "Torwart",
  defender: "Abwehr",
  midfielder: "Mittelfeld",
  forward: "Sturm",
} as const;

function getTone(winner: PlayerComparison["winner"]): Tone {
  if (winner === "HOME") {
    return "positive";
  }

  if (winner === "AWAY") {
    return "negative";
  }

  return "neutral";
}

function getWinnerLabel(
  winner: PlayerComparison["winner"],
  analysis: MatchAnalysis,
): string {
  if (winner === "HOME") {
    return analysis.homeTeam.teamName;
  }

  if (winner === "AWAY") {
    return analysis.awayTeam.teamName;
  }

  return "Unentschieden";
}

function formatBoolean(value: boolean): string {
  return value ? "Ja" : "Nein";
}

type DetailCategory =
  | "rating"
  | "appearance"
  | "goals"
  | "yellowRed"
  | "red"
  | "teamOfTheWeek"
  | "total";

function getDetailValue(
  category: DetailCategory,
  player: AnalysisPlayer,
): string {
  switch (category) {
    case "rating":
      return player.rating.toLocaleString("de-DE");
    case "appearance":
      return "Ja";
    case "goals":
      return String(player.goals);
    case "yellowRed":
      return formatBoolean(player.yellowRedCard);
    case "red":
      return formatBoolean(player.redCard);
    case "teamOfTheWeek":
      return formatBoolean(player.teamOfTheWeek);
    case "total":
      return "—";
  }
}

function getDetailPoints(
  category: DetailCategory,
  player: AnalysisPlayer,
): number {
  switch (category) {
    case "rating":
      return player.ratingPoints;
    case "appearance":
      return player.appearancePoints;
    case "goals":
      return player.goalPoints;
    case "yellowRed":
      return player.yellowRedCard ? player.cardPoints : 0;
    case "red":
      return player.redCard ? player.cardPoints : 0;
    case "teamOfTheWeek":
      return player.teamOfWeekPoints;
    case "total":
      return player.totalPoints;
  }
}

function getPointTone(points: number): Tone {
  if (points > 0) {
    return "positive";
  }

  if (points < 0) {
    return "negative";
  }

  return "neutral";
}

function formatDetailPoints(points: number): string {
  return points > 0 ? `+${points}` : String(points);
}

function PlayerDetailCells({
  category,
  player,
}: {
  category: DetailCategory;
  player: AnalysisPlayer | null;
}) {
  if (!player) {
    return (
      <>
        <td className="evaluation-detail-value">—</td>
        <td className="evaluation-detail-points neutral">0</td>
      </>
    );
  }

  const points = getDetailPoints(category, player);

  return (
    <>
      <td className="evaluation-detail-value">
        {getDetailValue(category, player)}
      </td>
      <td className={`evaluation-detail-points ${getPointTone(points)}`}>
        {formatDetailPoints(points)}
      </td>
    </>
  );
}

const detailRows = [
  { key: "rating", label: "Note" },
  { key: "appearance", label: "Einsatz" },
  { key: "goals", label: "Tore" },
  { key: "yellowRed", label: "Gelb-Rot" },
  { key: "red", label: "Rot" },
  { key: "teamOfTheWeek", label: "Elf des Tages" },
  { key: "total", label: "Gesamtpunkte" },
] as const;

function comparisonMatchesPosition(
  comparison: PlayerComparison,
  positionFilter: PositionFilter,
): boolean {
  return positionFilter === "all"
    || comparison.homePlayer?.position === positionFilter
    || comparison.awayPlayer?.position === positionFilter;
}

function comparisonMatchesSearch(
  comparison: PlayerComparison,
  searchTerm: string,
): boolean {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return normalizedSearch.length === 0
    || comparison.homePlayer?.playerName.toLowerCase().includes(normalizedSearch) === true
    || comparison.awayPlayer?.playerName.toLowerCase().includes(normalizedSearch) === true;
}

export function FullMatchdayEvaluation({
  analysis,
}: {
  analysis: MatchAnalysis;
}) {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSlotId, setExpandedSlotId] = useState<number | null>(null);
  const toggleExpandedSlot = (slotId: number) => {
    setExpandedSlotId((currentSlotId) => (
      currentSlotId === slotId ? null : slotId
    ));
  };

  const visibleComparisons = useMemo(
    () => analysis.playerComparisons.filter((comparison) => (
      comparisonMatchesPosition(comparison, positionFilter)
      && comparisonMatchesSearch(comparison, searchTerm)
    )),
    [analysis.playerComparisons, positionFilter, searchTerm],
  );

  return (
    <div className="evaluation-page">
      <header className="evaluation-page-header">
        <div>
          <span>Mein Team / Spiele</span>
          <h1>Vollständige Spieltagsauswertung</h1>
          <p>Offizieller Slotvergleich aller gewerteten Spieler.</p>
        </div>
      </header>

      <section className="evaluation-summary-bar" aria-label="Spielzusammenfassung">
        <strong>{analysis.homeTeam.teamName}</strong>
        <b>{analysis.officialScore.home} : {analysis.officialScore.away}</b>
        <strong>{analysis.awayTeam.teamName}</strong>
        <span>Spieltag {analysis.matchday}</span>
        <span>{analysis.competitionId}</span>
        <span>
          {analysis.matchFactors.appliedRules.length > 0
            ? "Offizielles Ergebnis angepasst"
            : "Offizielles Ergebnis"}
        </span>
      </section>

      <section className="evaluation-controls" aria-label="Tabellensteuerung">
        <div className="evaluation-filter-group" aria-label="Nach Position filtern">
          {filters.map((filter) => (
            <button
              className={positionFilter === filter.value ? "active" : undefined}
              key={filter.value}
              onClick={() => setPositionFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label>
          <span>Suche</span>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Spielername"
            type="search"
            value={searchTerm}
          />
        </label>
      </section>

      <section className="evaluation-table-card" aria-label="Spielervergleich">
        <table className="evaluation-table">
          <thead>
            <tr className="evaluation-table-groups">
              <th colSpan={3}>{analysis.homeTeam.teamName}</th>
              <th colSpan={3}>{analysis.awayTeam.teamName}</th>
            </tr>
            <tr>
              <th>Slot</th>
              <th>Heimspieler</th>
              <th>Heimpunkte</th>
              <th>Auswärtspunkte</th>
              <th>Auswärtsspieler</th>
              <th>Gewinner</th>
            </tr>
          </thead>
          <tbody>
            {visibleComparisons.map((comparison) => {
              const tone = getTone(comparison.winner);
              const isExpanded = expandedSlotId === comparison.slotId;

              return (
                <Fragment key={comparison.slotId}>
                  <tr
                    aria-expanded={isExpanded}
                    className={`evaluation-duel-row ${tone}`}
                    onClick={() => toggleExpandedSlot(comparison.slotId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleExpandedSlot(comparison.slotId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <span className="evaluation-squad-slot">
                        #{comparison.slotId}
                        <small>Offizieller Slot</small>
                      </span>
                    </td>
                    <td>
                      <div className="evaluation-player-name">
                        <strong>
                          {comparison.homePlayer?.playerName ?? "Kein gewerteter Spieler"}
                        </strong>
                        {comparison.homePlayer?.wasReplacement ? (
                          <span className="evaluation-replacement-badge">Ersatzspieler</span>
                        ) : null}
                        <small>
                          {comparison.homePlayer
                            ? positionLabels[comparison.homePlayer.position]
                            : "Nicht besetzte Position"}
                        </small>
                      </div>
                    </td>
                    <td>
                      <strong>{comparison.homePlayer?.totalPoints ?? 0}</strong>
                    </td>
                    <td>
                      <strong>{comparison.awayPlayer?.totalPoints ?? 0}</strong>
                    </td>
                    <td>
                      <div className="evaluation-player-name">
                        <strong>
                          {comparison.awayPlayer?.playerName ?? "Kein gewerteter Spieler"}
                        </strong>
                        {comparison.awayPlayer?.wasReplacement ? (
                          <span className="evaluation-replacement-badge">Ersatzspieler</span>
                        ) : null}
                        <small>
                          {comparison.awayPlayer
                            ? positionLabels[comparison.awayPlayer.position]
                            : "Nicht besetzte Position"}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className={`evaluation-difference ${tone}`}>
                        {getWinnerLabel(comparison.winner, analysis)}
                      </span>
                    </td>
                  </tr>
                  <tr className={`evaluation-detail-row ${isExpanded ? "open" : ""}`}>
                    <td colSpan={6}>
                      <div className="evaluation-detail-panel">
                        <table>
                          <thead>
                            <tr>
                              <th rowSpan={2}>Kategorie</th>
                              <th colSpan={2}>{analysis.homeTeam.teamName}</th>
                              <th colSpan={2}>{analysis.awayTeam.teamName}</th>
                            </tr>
                            <tr>
                              <th>Wert</th>
                              <th className="evaluation-detail-points">Punkte</th>
                              <th>Wert</th>
                              <th className="evaluation-detail-points">Punkte</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailRows.map((row) => (
                              <tr key={row.key}>
                                <td>{row.label}</td>
                                <PlayerDetailCells
                                  category={row.key}
                                  player={comparison.homePlayer}
                                />
                                <PlayerDetailCells
                                  category={row.key}
                                  player={comparison.awayPlayer}
                                />
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="evaluation-team-totals" aria-label="Mannschaftsteile">
        {analysis.positionAnalysis.map((duel) => (
          <div className={getTone(duel.winner)} key={duel.position}>
            <span>{positionLabels[duel.position]}</span>
            <strong>{duel.homePoints} : {duel.awayPoints}</strong>
            <b>{duel.difference}</b>
            <small>{getWinnerLabel(duel.winner, analysis)}</small>
          </div>
        ))}
      </section>
    </div>
  );
}
