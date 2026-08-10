import Link from "next/link";

const officeModules = [
  {
    href: "/admin/season",
    label: "Saison",
    eyebrow: "Season Operations",
    description:
      "Steuere die unabhängigen Wettbewerbs-Lifecycles der aktuellen Saison.",
    metric: "5 Wettbewerbe",
    status: "Aktiv",
  },
  {
    href: "/admin/matchday",
    label: "Spieltag",
    eyebrow: "Matchday Operations",
    description:
      "Überwache Datenerfassung, Berechnung, Review und Veröffentlichung.",
    metric: "Spieltag 1",
    status: "Datenerfassung",
  },
  {
    href: "/admin/players",
    label: "Player Master",
    eyebrow: "Transfer Office",
    description:
      "Pflege Status, Verein, Marktwert und Pflichttransfer-Auslöser.",
    metric: "Spieler",
    status: "Aktiv",
  },
  {
    href: "/admin/import",
    label: "Imports",
    eyebrow: "Datenimport",
    description: "Zukünftiger Arbeitsbereich für Quellen, Uploads und Prüfung.",
    metric: "Kicker",
    status: "Geplant",
  },
  {
    href: "/admin/managers",
    label: "Manager",
    eyebrow: "Manager Office",
    description: "Zukünftiger Arbeitsbereich für Teilnehmerstatus und Betreuung.",
    metric: "24 Manager",
    status: "Geplant",
  },
  {
    href: "/admin/users",
    label: "Benutzer",
    eyebrow: "Account Linking",
    description: "Verknüpfe zukünftige Login-Benutzer mit Manager-Identitäten.",
    metric: "User → Manager",
    status: "Foundation",
  },
  {
    href: "/admin/players",
    label: "Players",
    eyebrow: "Spielerpool",
    description: "Zukünftiger Arbeitsbereich für Kaderdaten und Bundesliga-Spieler.",
    metric: "612 Spieler",
    status: "Geplant",
  },
  {
    href: "/admin/system",
    label: "System",
    eyebrow: "System Health",
    description: "Zukünftiger Arbeitsbereich für Jobs, Datenbank und Fallbacks.",
    metric: "Repository",
    status: "Bereit",
  },
] as const;

export default function AdminOfficePage() {
  return (
    <main className="admin-office-home">
      <header className="admin-office-hero">
        <div>
          <span>Mission Control</span>
          <h1>Operativer Leitstand für das BMS Office.</h1>
          <p>
            Saison, Spieltage und zukünftige Module laufen in einem gemeinsamen
            Workspace. Der Fokus liegt auf Qualitätssicherung, Freigaben und
            stabilen Betriebsabläufen.
          </p>
        </div>
        <div className="admin-office-hero-status">
          <span>Heute</span>
          <strong>Operations bereit</strong>
          <small>Repository · Service · Prisma · Fallback</small>
        </div>
      </header>

      <section className="admin-office-card-grid" aria-label="Office Module">
        {officeModules.map((module) => (
          <Link className="admin-office-module-card" href={module.href} key={module.href}>
            <span>{module.eyebrow}</span>
            <h2>{module.label}</h2>
            <p>{module.description}</p>
            <div>
              <strong>{module.metric}</strong>
              <small>{module.status}</small>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
