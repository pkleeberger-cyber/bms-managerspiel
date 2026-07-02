"use client";

import Link from "next/link";
import { useState } from "react";

type ReleaseType = "PRELIMINARY" | "OFFICIAL";

type ReleaseCenterProps = {
  competitionName: string;
  lifecycleStatus: string;
  matchday: number;
  seasonName: string;
  versionNumber: number;
};

const releaseSummary = [
  { label: "Manager ausgewertet", value: "612", detail: "Berechnung final geprüft" },
  { label: "Begegnungen", value: "306", detail: "Alle Paarungen berechnet" },
  { label: "Regelkandidaten übernommen", value: "4", detail: "Review-Entscheidungen berücksichtigt" },
  { label: "Version", value: "3", detail: "Aktueller Freigabestand" },
  { label: "Tabellen aktualisiert", value: "18", detail: "Liga- und Wettbewerbsstände" },
  { label: "Historie aktualisiert", value: "Ja", detail: "Versionsverlauf vorbereitet" },
  { label: "Events erstellt", value: "24", detail: "Manager- und Ligaevents" },
] as const;

const releaseOptions: readonly {
  description: string;
  title: string;
  type: ReleaseType;
}[] = [
  {
    type: "PRELIMINARY",
    title: "Vorläufig freigeben",
    description: "Korrekturen bleiben möglich.",
  },
  {
    type: "OFFICIAL",
    title: "Offiziell abschließen",
    description: "Der Spieltag wird offiziell abgeschlossen.",
  },
] as const;

const baseConsequences = [
  "Ergebnisse sichtbar",
  "Tabellen aktualisiert",
  "Matchanalyse sichtbar",
  "Wettbewerbe aktualisiert",
  "Historie aktualisiert",
] as const;

const officialConsequences = [
  "Spieltag abgeschlossen",
  "Weitere Änderungen nur nach Wiederöffnung",
] as const;

const futurePlaceholders = ["Notifications", "Emails", "Discord", "Push"] as const;

export function MatchdayReleaseCenter({
  competitionName,
  lifecycleStatus,
  matchday,
  seasonName,
  versionNumber,
}: ReleaseCenterProps) {
  const [releaseType, setReleaseType] = useState<ReleaseType>("PRELIMINARY");
  const [isReleased, setIsReleased] = useState(false);
  const visibleConsequences =
    releaseType === "OFFICIAL"
      ? [...baseConsequences, ...officialConsequences]
      : baseConsequences;

  if (isReleased) {
    return (
      <main className="matchday-release success">
        <section className="matchday-release-success" aria-labelledby="release-success">
          <span aria-hidden="true">✓</span>
          <div>
            <p>Release abgeschlossen</p>
            <h1 id="release-success">Spieltag erfolgreich freigegeben</h1>
            <strong>
              {releaseType === "OFFICIAL"
                ? "Offizielle Freigabe"
                : "Vorläufige Freigabe"}
            </strong>
          </div>
          <div className="matchday-release-success-actions">
            <Link href="/admin/matchday">Zum Leitstand</Link>
            <Link href="/team/overview">Manageransicht öffnen</Link>
          </div>
        </section>
      </main>
    );
  }

  const heroMeta = [
    { label: "Saison", value: seasonName },
    { label: "Wettbewerb", value: competitionName },
    { label: "Spieltag", value: String(matchday) },
    { label: "Current Version", value: String(versionNumber) },
    { label: "Lifecycle Status", value: lifecycleStatus },
  ] as const;

  return (
    <main className="matchday-release">
      <header className="matchday-ops-title">
        <span>Administration / Spieltag / Freigabe</span>
        <h1>Spieltag freigeben</h1>
        <p>Bestätige den aktuellen Berechnungsstand für alle Manager.</p>
      </header>

      <section className="matchday-release-hero" aria-labelledby="release-hero">
        <div>
          <span className="matchday-ops-eyebrow">Final Approval</span>
          <h2 id="release-hero">Dieser Spieltag geht an die Manager.</h2>
          <p>
            Die Freigabe macht den geprüften Berechnungsstand sichtbar und legt
            fest, ob Korrekturen weiter möglich bleiben.
          </p>
        </div>
        <div className="matchday-release-meta">
          {heroMeta.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <div className="matchday-release-workspace">
        <section className="matchday-release-card matchday-release-summary">
          <header className="matchday-section-heading compact">
            <div>
              <span>Freigabeumfang</span>
              <h2>Release Summary</h2>
            </div>
            <b>Bereit</b>
          </header>

          <div className="matchday-release-summary-grid">
            {releaseSummary.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <aside className="matchday-release-card matchday-release-control">
          <header className="matchday-section-heading compact">
            <div>
              <span>Freigabeart</span>
              <h2>Release Type</h2>
            </div>
          </header>

          <div className="matchday-release-options" role="group" aria-label="Release Type">
            {releaseOptions.map((option) => (
              <button
                aria-pressed={releaseType === option.type}
                className={releaseType === option.type ? "selected" : undefined}
                key={option.type}
                onClick={() => setReleaseType(option.type)}
                type="button"
              >
                <span>{releaseType === option.type ? "✓" : "○"}</span>
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>

          <section className="matchday-release-consequences" aria-labelledby="release-consequences">
            <span>Nach Freigabe werden</span>
            <h3 id="release-consequences">Consequences</h3>
            <div>
              {visibleConsequences.map((item) => (
                <p key={item}>
                  <span aria-hidden="true">✓</span>
                  {item}
                </p>
              ))}
            </div>
          </section>

          <section className="matchday-release-placeholders">
            <span>Future Integration</span>
            {futurePlaceholders.map((placeholder) => (
              <div key={placeholder}>{placeholder}</div>
            ))}
          </section>
        </aside>
      </div>

      <footer className="matchday-release-actions" aria-label="Release Aktionen">
        <Link href="/admin/matchday/review">Zurück zur Prüfung</Link>
        <button className="primary" onClick={() => setIsReleased(true)} type="button">
          Spieltag freigeben
        </button>
      </footer>
    </main>
  );
}
