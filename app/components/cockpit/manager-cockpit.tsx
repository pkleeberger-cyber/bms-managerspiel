import { CockpitSection } from "@/components/cockpit/cockpit-section";
import { ComparisonCard } from "@/components/cockpit/comparison-card";
import { ConsequenceCard } from "@/components/cockpit/consequence-card";
import { LastMatchCard } from "@/components/cockpit/last-match-card";
import { TopPlayerCard } from "@/components/cockpit/top-player-card";
import { TrendChart } from "@/components/cockpit/trend-chart";

const positionTrend = [
  { label: "ST 9", value: 6 },
  { label: "ST 10", value: 5 },
  { label: "ST 11", value: 4 },
  { label: "ST 12", value: 4 },
  { label: "ST 13", value: 2 },
  { label: "ST 14", value: 3 },
];

const goalsTrend = [
  { label: "ST 9", value: 54 },
  { label: "ST 10", value: 62 },
  { label: "ST 11", value: 58 },
  { label: "ST 12", value: 71 },
  { label: "ST 13", value: 76 },
  { label: "ST 14", value: 58 },
];

export function ManagerCockpit() {
  return (
    <div className="cockpit cockpit-terminal cockpit-v2 cockpit-playable">
      <div className="cockpit-topline">
        <div>
          <span>Mein Team / Übersicht</span>
          <h1>Matchday 14</h1>
        </div>
        <div className="matchday-status">
          <span>ST 14</span>
          <strong>FINAL</strong>
        </div>
      </div>

      <CockpitSection index="01" title="Das Match">
        <LastMatchCard />
      </CockpitSection>

      <CockpitSection index="02" title="Was hat sich verändert?">
        <div className="consequence-grid playable-consequence-grid">
          <ConsequenceCard
            label="Saisonziel · Europa"
            current="1 Pkt."
            reference="Europa"
            referenceLabel="Ziel"
            change="Abstand reduziert"
            insight="Europa in Reichweite"
            direction="up"
          />
          <ConsequenceCard
            label="Performance · Manager-Tore"
            current="58"
            reference="66"
            referenceLabel="Saison-Ø"
            change="12 %"
            insight="Tiefster Wert · 4 ST"
            direction="down"
          />
          <ConsequenceCard
            label="Momentum"
            current="Beendet"
            reference="5 Spiele"
            referenceLabel="Serie"
            change="1. Niederlage"
            insight="5 Spiele ungeschlagen"
            direction="down"
          />
        </div>
      </CockpitSection>

      <CockpitSection index="03" title="Wo wurde das Match entschieden?">
        <div className="comparison-grid team-part-grid">
          <ComparisonCard label="Abwehr" opponentValue={41} managerValue={22} />
          <ComparisonCard
            label="Mittelfeld"
            opponentValue={52}
            managerValue={34}
          />
          <ComparisonCard label="Sturm" opponentValue={36} managerValue={31} />
          <ComparisonCard label="Torwart" opponentValue={8} managerValue={11} />
        </div>
      </CockpitSection>

      <CockpitSection index="04" title="Positiver Impuls">
        <div className="positive-takeaway">
          <span className="positive-takeaway-label">Top Performer</span>
          <TopPlayerCard
            name="Jonas Hartmann"
            position="Mittelfeld"
            initials="JH"
            points={15}
            seasonAverage={10.8}
          />
          <span className="positive-takeaway-badge">Saisonbestwert</span>
        </div>
      </CockpitSection>

      <CockpitSection index="05" title="Saisontrend">
        <div className="season-story-grid season-trend-only">
          <TrendChart
            title="Ligaposition"
            currentValue="3."
            change="2. → 3."
            points={positionTrend}
            lowerIsBetter
          />
          <TrendChart
            title="Manager-Tore"
            currentValue="58"
            change="Ø 66 · ▼ 12 %"
            points={goalsTrend}
          />
        </div>
      </CockpitSection>
    </div>
  );
}
