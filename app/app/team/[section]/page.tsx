import Link from "next/link";
import { notFound } from "next/navigation";

import { CockpitSection } from "@/components/cockpit/cockpit-section";
import { ManagerCockpit } from "@/components/cockpit/manager-cockpit";
import { PlaceholderPage } from "@/components/placeholder-page";

const sections = {
  overview: {
    title: "Übersicht",
    description: "Die Teamübersicht ist aktuell über das Cockpit erreichbar.",
    icon: "chart",
  },
  squad: {
    title: "Kader",
    description: "Die Kaderübersicht wird in einem zukünftigen Sprint ergänzt.",
    icon: "team",
  },
  kader: {
    title: "Kader",
    description: "Die Kaderübersicht wird in einem zukünftigen Sprint ergänzt.",
    icon: "team",
  },
  transfers: {
    title: "Transfers",
    description: "Der Transferbereich wird in einem zukünftigen Sprint ergänzt.",
    icon: "coins",
  },
  matches: {
    title: "Spiele",
    description: "Spielplan und Begegnungen werden in einem zukünftigen Sprint ergänzt.",
    icon: "calendar",
  },
  spiele: {
    title: "Spiele",
    description: "Spielplan und Begegnungen werden in einem zukünftigen Sprint ergänzt.",
    icon: "calendar",
  },
  history: {
    title: "Historie",
    description: "Die Managerhistorie wird in einem zukünftigen Sprint ergänzt.",
    icon: "chart",
  },
  historie: {
    title: "Historie",
    description: "Die Managerhistorie wird in einem zukünftigen Sprint ergänzt.",
    icon: "chart",
  },
} as const;

const squadStatus = [
  {
    label: "Kaderwert",
    value: "68,4 Mio. €",
    support: "+4,8 Mio seit Saisonstart",
    badge: "Liga-Rang #4",
    tone: "positive",
  },
  {
    label: "Restbudget",
    value: "7,6 Mio. €",
    support: "11 % Budgetreserve",
    badge: "Flexibel",
    tone: "neutral",
  },
  {
    label: "Spieler",
    value: "25",
    support: "19 Stammoptionen",
    badge: "+3 vs Liga-Ø",
    tone: "positive",
  },
  {
    label: "Ø Punkte/Spiel",
    value: "6,8",
    support: "+8 % über Liga-Durchschnitt",
    badge: "Top 5",
    tone: "positive",
  },
  {
    label: "Teamform",
    value: "↗ 4/5",
    support: "4 Gewinner im letzten Spiel",
    badge: "Steigend",
    tone: "positive",
  },
  {
    label: "Stärkste Unit",
    value: "Mittelfeld",
    support: "42 % aller Teampunkte",
    badge: "Trägt",
    tone: "positive",
  },
  {
    label: "Schwächste Unit",
    value: "Abwehr",
    support: "18 % unter Teamschnitt",
    badge: "Achtung",
    tone: "negative",
  },
] as const;

const decisionReview = [
  {
    label: "💎 Schnäppchen der Saison",
    player: "Luca Weber",
    initials: "LW",
    keyNumber: "94 Punkte",
    metric: "+38 % über Erwartung",
    insight: "Bester Einkauf bisher.",
    badge: "💎 Schnäppchen",
    tone: "positive",
  },
  {
    label: "📉 Erwartungen bisher nicht erfüllt",
    player: "David König",
    initials: "DK",
    keyNumber: "42 Punkte",
    metric: "−41 % unter Erwartung",
    insight: "Winterpause beobachten.",
    badge: "📉 Formschwach",
    tone: "negative",
  },
  {
    label: "⭐ Herzstück deiner Mannschaft",
    player: "Jonas Hartmann",
    initials: "JH",
    keyNumber: "154 Punkte",
    metric: "18 % aller Teampunkte",
    insight: "Ohne ihn fehlen deinem Team Punkte.",
    badge: "⭐ Leistungsträger",
    tone: "positive",
  },
] as const;

const positionUnits = [
  {
    unit: "Torwart",
    points: "86",
    average: "7,2 Ø pro Spieler",
    trend: "▂▃▄▃▄",
    insight: "Konstanter Rückhalt.",
    tone: "positive",
  },
  {
    unit: "Abwehr",
    points: "112",
    average: "18 % unter Teamschnitt",
    trend: "▇▆▅▄▂",
    insight: "Hier verlierst du aktuell Spiele.",
    tone: "negative",
  },
  {
    unit: "Mittelfeld",
    points: "318",
    average: "42 % aller Teampunkte",
    trend: "▁▂▄▆▇",
    insight: "Stärkster Mannschaftsteil.",
    tone: "positive",
  },
  {
    unit: "Sturm",
    points: "242",
    average: "7,6 Ø pro Spieler",
    trend: "▂▃▃▄▅",
    insight: "Gute Punkteausbeute.",
    tone: "neutral",
  },
] as const;

const players = [
  {
    name: "Jonas Hartmann",
    position: "MF",
    club: "SC Freiburg",
    trend: "▂▃▄▆▇",
    status: "🔥 Topform",
    appearances: 14,
    grade: "2,4",
    pointsPerGame: "11,0",
    goals: 5,
    cards: "1/0",
    teamOfDay: 3,
    points: 154,
    marketValue: "12,8 Mio. €",
  },
  {
    name: "Luca Weber",
    position: "ST",
    club: "VfB Stuttgart",
    trend: "▁▂▄▆▇",
    status: "💎 Schnäppchen",
    appearances: 13,
    grade: "2,8",
    pointsPerGame: "7,2",
    goals: 6,
    cards: "2/0",
    teamOfDay: 1,
    points: 94,
    marketValue: "6,2 Mio. €",
  },
  {
    name: "Mats Keller",
    position: "TW",
    club: "1. FC Köln",
    trend: "▃▃▄▃▄",
    status: "🧱 Konstant",
    appearances: 14,
    grade: "2,9",
    pointsPerGame: "6,1",
    goals: 0,
    cards: "0/0",
    teamOfDay: 1,
    points: 86,
    marketValue: "5,4 Mio. €",
  },
  {
    name: "Emil Brandt",
    position: "MF",
    club: "Mainz 05",
    trend: "▂▃▃▄▅",
    status: "⭐ Leistungsträger",
    appearances: 14,
    grade: "3,0",
    pointsPerGame: "6,0",
    goals: 2,
    cards: "3/0",
    teamOfDay: 0,
    points: 84,
    marketValue: "7,9 Mio. €",
  },
  {
    name: "Noah Stein",
    position: "AB",
    club: "Werder Bremen",
    trend: "▅▄▃▃▂",
    status: "⚠ Beobachten",
    appearances: 12,
    grade: "3,4",
    pointsPerGame: "4,7",
    goals: 1,
    cards: "4/0",
    teamOfDay: 0,
    points: 56,
    marketValue: "8,1 Mio. €",
  },
  {
    name: "David König",
    position: "AB",
    club: "Borussia Dortmund",
    trend: "▇▆▅▄▂",
    status: "📉 Formschwach",
    appearances: 13,
    grade: "3,7",
    pointsPerGame: "3,2",
    goals: 0,
    cards: "5/1",
    teamOfDay: 0,
    points: 42,
    marketValue: "11,5 Mio. €",
  },
] as const;

const seasonRecord = [
  { label: "Siege", value: "8", icon: "✓", tone: "positive" },
  { label: "Unentschieden", value: "2", icon: "=", tone: "neutral" },
  { label: "Niederlagen", value: "4", icon: "×", tone: "negative" },
  { label: "Tore", value: "812:745", icon: "•", tone: "positive" },
  { label: "Aktuelle Serie", value: "1 Niederlage", icon: "↘", tone: "negative" },
] as const;

const matchSchedule = [
  {
    matchday: "ST 11",
    opponent: "Mainz Manager",
    venue: "Heim",
    result: "12:9",
    resultTone: "win",
    status: "Ausgewertet",
    action: "Analyse",
    href: "/team/spiele/11/analyse",
  },
  {
    matchday: "ST 12",
    opponent: "Ruhrpott XI",
    venue: "Auswärts",
    result: "9:9",
    resultTone: "draw",
    status: "Ausgewertet",
    action: "Analyse",
    href: "/team/spiele/12/analyse",
  },
  {
    matchday: "ST 13",
    opponent: "Köln Manager",
    venue: "Heim",
    result: "11:7",
    resultTone: "win",
    status: "Ausgewertet",
    action: "Analyse",
    href: "/team/spiele/13/analyse",
  },
  {
    matchday: "ST 14",
    opponent: "FC Adler",
    venue: "Heim",
    result: "8:10",
    resultTone: "loss",
    status: "Ausgewertet",
    action: "Analyse",
    href: "/team/spiele/14/analyse",
  },
  {
    matchday: "ST 15",
    opponent: "FC Bayern Manager",
    venue: "Auswärts",
    result: "–",
    resultTone: "neutral",
    status: "Ausstehend",
    action: "Vorschau",
    href: null,
  },
  {
    matchday: "ST 16",
    opponent: "Borussia Manager",
    venue: "Heim",
    result: "–",
    resultTone: "neutral",
    status: "Offen",
    action: null,
    href: null,
  },
] as const;

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function TeamSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const page = sections[section as keyof typeof sections];

  if (!page) {
    notFound();
  }

  if (section === "overview") {
    return <ManagerCockpit />;
  }

  if (section === "squad" || section === "kader") {
    return <SquadOverviewPage />;
  }

  if (section === "matches" || section === "spiele") {
    return <SpieleOverviewPage />;
  }

  return (
    <PlaceholderPage
      eyebrow="Mein Team"
      title={page.title}
      description={page.description}
      icon={page.icon}
    />
  );
}

function SpieleOverviewPage() {
  return (
    <div className="cockpit cockpit-terminal matches-overview">
        <div className="squad-page-header">
          <div>
            <span>Mein Team / Spiele</span>
            <h1>Spiele</h1>
            <p>Dein Spielplan, deine Ergebnisse und die nächsten Aufgaben.</p>
          </div>
          <div className="squad-season-badge">
            <span>Saison 2026/27</span>
            <strong>ST 14</strong>
          </div>
        </div>

        <CockpitSection index="01" title="Top Area">
          <div className="matches-top-grid">
            <article className="next-match-card">
              <div className="next-match-main">
                <div className="opponent-visuals" aria-hidden="true">
                  <span className="opponent-crest-placeholder" />
                </div>
                <div className="next-match-copy">
                  <span>Nächstes Spiel</span>
                  <h2>FC Bayern Manager</h2>
                  <small>Gegner: Platz 6</small>
                  <div className="next-match-meta">
                    <b>ST 15</b>
                    <b>Auswärts</b>
                    <span className="match-status ausstehend">Ausstehend</span>
                  </div>
                </div>
              </div>
              <div className="next-match-side">
                <span className="opponent-manager-placeholder" aria-hidden="true" />
                <button type="button">Vorschau →</button>
              </div>
            </article>

            <article className="season-balance-card">
              <header>
                <span>Saisonbilanz</span>
              </header>
              <div className="season-record-grid">
                {seasonRecord.map((item) => (
                  <div className={`season-record-card ${item.tone}`} key={item.label}>
                    <span aria-hidden="true">{item.icon}</span>
                    <strong>{item.value}</strong>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </CockpitSection>

        <CockpitSection index="02" title="Spielplan">
          <div className="match-schedule-card">
            <header className="match-schedule-header">
              <span>Spielplan</span>
            </header>
            <table className="match-schedule-table">
              <thead>
                <tr>
                  <th>ST</th>
                  <th>Gegner</th>
                  <th>Heim/Auswärts</th>
                  <th>Ergebnis</th>
                  <th>Status</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {matchSchedule.map((match) => (
                  <tr key={match.matchday}>
                    <td>{match.matchday}</td>
                    <td>
                      <div className="schedule-opponent-cell">
                        <span className="schedule-crest-placeholder" aria-hidden="true" />
                        <strong>{match.opponent}</strong>
                      </div>
                    </td>
                    <td>{match.venue}</td>
                    <td>
                      <span className={`match-result ${match.resultTone}`}>
                        {match.result}
                      </span>
                    </td>
                    <td>
                      <span className={`match-status ${match.status.toLowerCase()}`}>
                        {match.status}
                      </span>
                    </td>
                    <td>
                      {match.href ? (
                        <Link href={match.href}>{match.action} →</Link>
                      ) : match.action ? (
                        <button type="button">{match.action} →</button>
                      ) : (
                        <span className="disabled-action">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CockpitSection>
    </div>
  );
}
function SquadOverviewPage() {
  return (
    <div className="cockpit cockpit-terminal squad-overview">
      <div className="squad-page-header">
        <div>
          <span>Mein Team / Kader</span>
          <h1>Kader</h1>
          <p>Wie gut waren deine Kaderentscheidungen?</p>
        </div>
        <div className="squad-season-badge">
          <span>Saison 2026/27</span>
          <strong>ST 14</strong>
        </div>
      </div>

      <CockpitSection index="01" title="Kaderstatus">
        <div className="squad-status-grid">
          {squadStatus.map((item) => (
            <article className={`squad-status-card ${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.support}</p>
              <b>{item.badge}</b>
            </article>
          ))}
        </div>
      </CockpitSection>

      <CockpitSection index="02" title="Deine Entscheidungen">
        <div className="decision-review-grid">
          {decisionReview.map((item) => (
            <article className="decision-card" key={item.label}>
              <header>
                <span>{item.label}</span>
                <b className={item.tone}>{item.badge}</b>
              </header>
              <div className="decision-player">
                <span className={`decision-avatar ${item.tone}`}>
                  {item.initials}
                </span>
                <strong>{item.player}</strong>
                <span className="decision-insight">{item.insight}</span>
              </div>
              <div className="decision-metrics">
                <strong>{item.keyNumber}</strong>
                <span>{item.metric}</span>
              </div>
            </article>
          ))}
        </div>
      </CockpitSection>

      <CockpitSection index="03" title="Mannschaftsteile">
        <div className="position-unit-grid">
          {positionUnits.map((unit) => (
            <article className="position-unit-card" key={unit.unit}>
              <header>
                <span>{unit.unit}</span>
                <b className={unit.tone}>{unit.average}</b>
              </header>
              <strong>{unit.points}</strong>
              <span className="unit-sparkline">{unit.trend}</span>
              <div>
                <b>{unit.insight}</b>
              </div>
            </article>
          ))}
        </div>
      </CockpitSection>

      <CockpitSection index="04" title="Spielerkader">
        <div className="squad-table-card">
          <div className="squad-table-wrap">
            <table className="squad-player-table">
              <thead>
                <tr>
                  <th>Spieler</th>
                  <th>Pos.</th>
                  <th>Trend</th>
                  <th>Status</th>
                  <th>Einsätze</th>
                  <th>Ø Note</th>
                  <th>Pkt./Spiel</th>
                  <th>Tore</th>
                  <th>Karten</th>
                  <th>Elf d. Tages</th>
                  <th>Gesamtpunkte</th>
                  <th>Marktwert</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.name}>
                    <td>
                      <div className="squad-player-cell">
                        <strong>{player.name}</strong>
                        <span>{player.club}</span>
                      </div>
                    </td>
                    <td>{player.position}</td>
                    <td>
                      <span className="player-sparkline">{player.trend}</span>
                    </td>
                    <td>
                      <span className="player-status">{player.status}</span>
                    </td>
                    <td>{player.appearances}</td>
                    <td>{player.grade}</td>
                    <td>{player.pointsPerGame}</td>
                    <td>{player.goals}</td>
                    <td>{player.cards}</td>
                    <td>{player.teamOfDay}</td>
                    <td>
                      <strong>{player.points}</strong>
                    </td>
                    <td>{player.marketValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CockpitSection>
    </div>
  );
}
