import Link from "next/link";

import { DashboardCard } from "@/components/ui/dashboard-card";
import { Icon } from "@/components/icons";

const newsItems = [
  {
    category: "Liga",
    title: "Der 19. Spieltag steht vor der Tür",
    time: "vor 2 Stunden",
  },
  {
    category: "Markt",
    title: "Transferfenster schließt am Freitag",
    time: "vor 5 Stunden",
  },
  {
    category: "BMS",
    title: "Auswertung des letzten Spieltags",
    time: "gestern",
  },
];

export default function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Mein Team · Übersicht</p>
          <h1>Guten Morgen, Patrick.</h1>
          <p>Hier ist dein Überblick für den 19. Spieltag.</p>
        </div>
        <div className="season-chip">
          <span>Transferphase</span>
          <strong>Noch 3 Tage</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <DashboardCard title="Budget" eyebrow="Verfügbar" icon="coins">
          <p className="metric-value">8,75 Mio. €</p>
          <div className="metric-footer">
            <span className="positive">+1,20 Mio. €</span>
            <span>seit Saisonstart</span>
          </div>
        </DashboardCard>

        <DashboardCard title="Kaderwert" eyebrow="Aktuell" icon="chart">
          <p className="metric-value">76,40 Mio. €</p>
          <div className="metric-footer">
            <span className="positive">+2,8 %</span>
            <span>zum letzten Spieltag</span>
          </div>
        </DashboardCard>

        <DashboardCard title="Ligaposition" eyebrow="Erste Liga" icon="trophy">
          <div className="position-value">
            <strong>3.</strong>
            <div>
              <span>34 Punkte</span>
              <small>3 Punkte hinter Platz 2</small>
            </div>
          </div>
          <div className="position-track">
            <span style={{ width: "72%" }} />
          </div>
        </DashboardCard>

        <DashboardCard
          title="Nächstes Spiel"
          eyebrow="Samstag · 15:30"
          icon="calendar"
          className="match-card"
        >
          <div className="matchup">
            <div className="club">
              <span className="mini-logo home">PM</span>
              <strong>Patrick</strong>
            </div>
            <div className="match-center">
              <span>19. Spieltag</span>
              <strong>VS</strong>
              <small>In 4 Tagen</small>
            </div>
            <div className="club">
              <span className="mini-logo away">FB</span>
              <strong>FC Bayern Manager</strong>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Letztes Spiel"
          eyebrow="18. Spieltag"
          icon="shield"
          className="last-match-card"
        >
          <div className="last-match">
            <div>
              <span>Patrick</span>
              <strong>57</strong>
            </div>
            <span className="result-pill">Sieg</span>
            <div>
              <span>Ruhrpott XI</span>
              <strong>42</strong>
            </div>
          </div>
          <p className="match-note">Starke 15 Punkte Vorsprung am vergangenen Wochenende.</p>
        </DashboardCard>

        <DashboardCard
          title="Aktuelle Meldungen"
          eyebrow="News"
          icon="news"
          className="news-card"
        >
          <div className="news-list">
            {newsItems.map((item) => (
              <article key={item.title}>
                <span>{item.category}</span>
                <div>
                  <h3>{item.title}</h3>
                  <time>{item.time}</time>
                </div>
                <Icon name="chevron" />
              </article>
            ))}
          </div>
          <Link className="card-link" href="/news">
            Alle Meldungen
            <Icon name="arrow" />
          </Link>
        </DashboardCard>

        <DashboardCard
          title="Schnellzugriff"
          eyebrow="Aktionen"
          icon="spark"
          className="actions-card"
        >
          <div className="quick-actions">
            <Link href="/team/squad">
              <Icon name="team" />
              <span>
                <strong>Kader ansehen</strong>
                <small>25 Spieler im Kader</small>
              </span>
              <Icon name="chevron" />
            </Link>
            <Link href="/team/transfers">
              <Icon name="coins" />
              <span>
                <strong>Transfermarkt</strong>
                <small>Spieler suchen</small>
              </span>
              <Icon name="chevron" />
            </Link>
            <Link href="/competitions/erste-liga">
              <Icon name="chart" />
              <span>
                <strong>Ligatabelle</strong>
                <small>Aktueller Spieltag</small>
              </span>
              <Icon name="chevron" />
            </Link>
          </div>
        </DashboardCard>
      </div>
    </>
  );
}
