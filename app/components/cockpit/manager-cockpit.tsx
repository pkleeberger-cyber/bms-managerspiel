import { CockpitSection } from "@/components/cockpit/cockpit-section";
import { ComparisonCard } from "@/components/cockpit/comparison-card";
import { ConsequenceCard } from "@/components/cockpit/consequence-card";
import { LastMatchCard } from "@/components/cockpit/last-match-card";
import { TopPlayerCard } from "@/components/cockpit/top-player-card";
import type { LeagueFormResult, PositionChange } from "@/domain/league-engine";
import type { AnalysisPlayer } from "@/domain/match-analysis-engine";
import type { TeamOverviewData } from "@/domain/team-overview";

const positionLabels = {
  goalkeeper: "Torwart",
  defender: "Abwehr",
  midfielder: "Mittelfeld",
  forward: "Sturm",
} as const;

const positionChangeLabels: Record<PositionChange, string> = {
  up: "Platz verbessert",
  down: "Platz verloren",
  unchanged: "Platz gehalten",
  new: "Neu eingeordnet",
};

const formLabels: Record<LeagueFormResult, string> = {
  W: "S",
  D: "U",
  L: "N",
};

const nextMatchLabels: Record<TeamOverviewData["nextMatch"]["status"], string> = {
  NOT_SCHEDULED: "Noch nicht angesetzt",
};

function getDirection(
  change: PositionChange,
): "up" | "down" | "neutral" {
  if (change === "up") {
    return "up";
  }

  if (change === "down") {
    return "down";
  }

  return "neutral";
}

function PlayerTakeaway({
  badge,
  label,
  player,
  tone,
}: {
  badge: string;
  label: string;
  player: AnalysisPlayer | null;
  tone: "positive" | "negative";
}) {
  return (
    <div className={`positive-takeaway ${tone}`}>
      <span className="positive-takeaway-label">{label}</span>
      {player ? (
        <TopPlayerCard
          detailLabel="Offizieller Slot"
          detailValue={String(player.slotId)}
          initials={String(player.slotId)}
          name={player.playerName}
          points={player.totalPoints}
          position={positionLabels[player.position]}
          status={badge}
          tone={tone}
        />
      ) : (
        <span>Kein gewerteter Spieler</span>
      )}
      <span className="positive-takeaway-badge">{badge}</span>
    </div>
  );
}

export function ManagerCockpit({ data }: { data: TeamOverviewData }) {
  const previousPosition = data.league.previousPosition === null
    ? "—"
    : `${data.league.previousPosition}.`;
  const form = data.league.form.length > 0
    ? data.league.form.map((result) => formLabels[result]).join(" · ")
    : "—";
  const lastFormResult = data.league.form.at(-1);
  const why = data.analysis.why;

  return (
    <div className="cockpit cockpit-terminal cockpit-v2 cockpit-playable">
      <div className="cockpit-topline">
        <div>
          <span>Mein Team / Übersicht</span>
          <h1>Spieltag {data.matchday}</h1>
        </div>
        <div className="matchday-status">
          <span>ST {data.matchday}</span>
          <strong>ABGESCHLOSSEN</strong>
        </div>
      </div>

      <CockpitSection index="01" title="Das Match">
        <LastMatchCard
          competitionId={data.competitionId}
          lastMatch={data.lastMatch}
          matchday={data.matchday}
        />
      </CockpitSection>

      <CockpitSection index="02" title="Tabellenstand">
        <div className="consequence-grid playable-consequence-grid">
          <ConsequenceCard
            change={positionChangeLabels[data.league.positionChange]}
            current={`${data.league.position}.`}
            direction={getDirection(data.league.positionChange)}
            insight="Offizielle Tabellenposition"
            label="Ligaposition"
            reference={previousPosition}
            referenceLabel="Vorher"
          />
          <ConsequenceCard
            change="Offizieller Stand"
            current={String(data.league.leaguePoints)}
            direction="neutral"
            insight={`Nach Spieltag ${data.matchday}`}
            label="Ligapunkte"
            reference={String(data.matchday)}
            referenceLabel="Spieltag"
          />
          <ConsequenceCard
            change="Letztes Ergebnis"
            current={form}
            direction={
              lastFormResult === "W"
                ? "up"
                : lastFormResult === "L"
                  ? "down"
                  : "neutral"
            }
            insight="Offizielle Form"
            label="Form"
            reference={lastFormResult ? formLabels[lastFormResult] : "—"}
            referenceLabel="Aktuell"
          />
        </div>
      </CockpitSection>

      <CockpitSection index="03" title="Wo wurde das Match entschieden?">
        <div className="comparison-grid team-part-grid">
          {data.analysis.positionDuels.map((duel) => (
            <ComparisonCard
              difference={duel.difference}
              key={duel.position}
              label={positionLabels[duel.position]}
              managerValue={duel.homePoints}
              opponentValue={duel.awayPoints}
              winner={duel.winner}
            />
          ))}
        </div>
      </CockpitSection>

      <CockpitSection index="04" title="Spieler des Matches">
        <div className="overview-player-takeaways">
          <PlayerTakeaway
            badge="Bester Spieler"
            label="Positiver Impuls"
            player={data.analysis.bestPlayer}
            tone="positive"
          />
          <PlayerTakeaway
            badge="Schwächster Spieler"
            label="Enttäuschung"
            player={data.analysis.disappointment}
            tone="negative"
          />
        </div>
      </CockpitSection>

      <CockpitSection index="05" title="Spielentscheidende Faktoren">
        <div className="consequence-grid playable-consequence-grid">
          <ConsequenceCard
            change={why ? `${why.points} Punkte` : "Kein Rückstand"}
            current={why ? positionLabels[why.position] : "—"}
            direction={why ? "down" : "neutral"}
            insight="Größter Rückstand"
            label="Warum verloren?"
            reference={why ? String(why.points) : "0"}
            referenceLabel="Differenz"
          />
          <ConsequenceCard
            change={`${data.analysis.missingPositionCount} offen`}
            current={String(data.analysis.replacementPlayerCount)}
            direction={
              data.analysis.missingPositionCount > 0 ? "down" : "neutral"
            }
            insight={`Größtes Duell: Slot ${data.analysis.biggestDuelSlot ?? "—"}`}
            label="Aufstellung"
            reference={String(data.analysis.manualPenaltyCount)}
            referenceLabel="Manuelle Strafen"
          />
          <ConsequenceCard
            change="Noch offen"
            current="—"
            direction="neutral"
            insight="Keine zukünftige Begegnung im historischen Snapshot"
            label="Nächstes Match"
            reference={nextMatchLabels[data.nextMatch.status]}
            referenceLabel="Status"
          />
        </div>
      </CockpitSection>
    </div>
  );
}
