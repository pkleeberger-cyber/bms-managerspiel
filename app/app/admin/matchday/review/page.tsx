import Link from "next/link";

import { loadCurrentMatchdayLifecycle } from "@/application/matchday-operations-service";
import type { MatchdayLifecycleStatus } from "@/domain/matchday-lifecycle";

export const dynamic = "force-dynamic";

type RuleCandidateType = "TEAM_INVALID" | "TEAM_PENALTY" | "POINT_ADJUSTMENT";

type RuleCandidate = {
  id: string;
  type: RuleCandidateType;
  manager: string;
  reason: string;
  suggestedAction: string;
  blocksPublication: boolean;
};

type ReviewCheckTone = "ok" | "warning";

const lifecycleStatusLabels: Record<MatchdayLifecycleStatus, string> = {
  DRAFT: "Entwurf",
  DATA_ENTRY_OPEN: "Datenerfassung geöffnet",
  DATA_ENTRY_COMPLETE: "Datenerfassung abgeschlossen",
  CALCULATED: "Berechnet",
  PUBLISHED_PRELIMINARY: "Vorläufig veröffentlicht",
  REOPENED: "Erneut geöffnet",
  PUBLISHED_OFFICIAL: "Offiziell abgeschlossen",
  ARCHIVED: "Archiviert",
};

const ruleCandidates: readonly RuleCandidate[] = [
  {
    id: "candidate-team-invalid-01",
    type: "TEAM_INVALID",
    manager: "Thomas",
    reason: "Aufstellung unterschreitet die Mindestanzahl gültiger Spieler.",
    suggestedAction: "Teamwertung prüfen und Invalid-Regel vormerken.",
    blocksPublication: true,
  },
  {
    id: "candidate-team-penalty-01",
    type: "TEAM_PENALTY",
    manager: "Marco",
    reason: "Verspätete Kaderkorrektur nach Datenerfassung.",
    suggestedAction: "Strafe für Version 3 bestätigen oder ablehnen.",
    blocksPublication: true,
  },
  {
    id: "candidate-point-adjustment-01",
    type: "POINT_ADJUSTMENT",
    manager: "Patrick",
    reason: "Abweichung zwischen berechnetem Ergebnis und Review-Hinweis.",
    suggestedAction: "Punktanpassung vor Veröffentlichung prüfen.",
    blocksPublication: false,
  },
  {
    id: "candidate-point-adjustment-02",
    type: "POINT_ADJUSTMENT",
    manager: "Daniel",
    reason: "Manuelle Korrektur aus Golden-Reference-Abgleich offen.",
    suggestedAction: "Audit-Vermerk anlegen, keine automatische Änderung.",
    blocksPublication: false,
  },
] as const;

const summaryCards = [
  { label: "Manager ausgewertet", value: "612", detail: "Berechnung abgeschlossen" },
  { label: "Begegnungen berechnet", value: "306", detail: "Alle Fixtures verarbeitet" },
  { label: "Regelkandidaten", value: "4", detail: "2 davon publikationskritisch" },
  { label: "Tabellenänderungen", value: "18", detail: "Zwischentabelle vorbereitet" },
  { label: "Events erzeugt", value: "24", detail: "Story- und Verlaufsevents" },
  { label: "Golden Reference", value: "Offen", detail: "Vergleich folgt später" },
] as const;

const reviewTimeline = [
  { time: "09:23", event: "Berechnung abgeschlossen" },
  { time: "09:25", event: "Regelkandidaten aus Rules Engine übernommen" },
  { time: "09:28", event: "Tabellenänderungen zur Sichtprüfung bereitgestellt" },
  { time: "09:31", event: "Golden-Reference-Platzhalter markiert" },
  { time: "09:34", event: "Review wartet auf Admin-Entscheidung" },
] as const;

const reviewChecklist: readonly {
  label: string;
  tone: ReviewCheckTone;
  marker: string;
}[] = [
  { label: "Datenerfassung abgeschlossen", tone: "ok", marker: "✓" },
  { label: "Berechnung erfolgreich", tone: "ok", marker: "✓" },
  { label: "2 Regelkandidaten offen", tone: "warning", marker: "!" },
  { label: "Tabellen berechnet", tone: "ok", marker: "✓" },
  { label: "Events erstellt", tone: "ok", marker: "✓" },
  { label: "Historie aktualisiert", tone: "ok", marker: "✓" },
] as const;

const futurePlaceholders = [
  "Applied Rules",
  "Audit",
  "Golden Reference comparison",
  "Version history",
] as const;

const candidateTypeLabels: Record<RuleCandidateType, string> = {
  TEAM_INVALID: "Team ungültig",
  TEAM_PENALTY: "Teamstrafe",
  POINT_ADJUSTMENT: "Punktanpassung",
};

const candidateGroups = Object.entries(candidateTypeLabels).map(
  ([type, label]) => ({
    type: type as RuleCandidateType,
    label,
    candidates: ruleCandidates.filter((candidate) => candidate.type === type),
  }),
);

export default async function MatchdayReviewCenterPage() {
  const { lifecycle } = await loadCurrentMatchdayLifecycle();
  const unresolvedCandidates = ruleCandidates.filter(
    (candidate) => candidate.blocksPublication,
  ).length;
  const isPublishable = unresolvedCandidates === 0;

  const heroMeta = [
    { label: "Saison", value: lifecycle.seasonName },
    { label: "Wettbewerb", value: lifecycle.competitionName },
    { label: "Spieltag", value: String(lifecycle.matchday) },
    { label: "Version", value: String(lifecycle.currentVersion.versionNumber) },
    {
      label: "Lifecycle",
      value: lifecycleStatusLabels[lifecycle.currentStatus],
    },
  ] as const;

  return (
    <main className="matchday-review">
      <header className="matchday-ops-title">
        <span>Administration / Spieltag / Review</span>
        <h1>Spieltag überprüfen</h1>
        <p>Prüfe den berechneten Spieltag vor der Veröffentlichung.</p>
      </header>

      <section className="matchday-review-hero" aria-labelledby="review-hero">
        <div>
          <span className="matchday-ops-eyebrow">Final Quality Check</span>
          <h2 id="review-hero">Kann dieser Spieltag veröffentlicht werden?</h2>
          <p>
            Der Review bündelt Regelkandidaten, Berechnungsstatus und offene
            Qualitätssignale vor der vorläufigen Veröffentlichung.
          </p>
        </div>
        <div className="matchday-review-meta">
          {heroMeta.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <div className="matchday-review-workspace">
        <section className="matchday-review-card matchday-review-rules">
          <header className="matchday-section-heading compact">
            <div>
              <span>Regelprüfung</span>
              <h2>Regelkandidaten</h2>
            </div>
            <b>{ruleCandidates.length} Kandidaten</b>
          </header>

          <div className="matchday-rule-groups">
            {candidateGroups.map((group) => (
              <section className="matchday-rule-group" key={group.type}>
                <header>
                  <span>{group.type}</span>
                  <strong>{group.label}</strong>
                </header>
                <div className="matchday-rule-candidates">
                  {group.candidates.map((candidate) => (
                    <article key={candidate.id}>
                      <div>
                        <span>Manager</span>
                        <strong>{candidate.manager}</strong>
                      </div>
                      <p>{candidate.reason}</p>
                      <small>{candidate.suggestedAction}</small>
                      <div className="matchday-rule-actions">
                        <button type="button">Übernehmen</button>
                        <button type="button">Ablehnen</button>
                        <button type="button">Details</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="matchday-review-card matchday-review-summary">
          <header className="matchday-section-heading compact">
            <div>
              <span>Berechnung</span>
              <h2>Berechnungsübersicht</h2>
            </div>
            <b>Abgeschlossen</b>
          </header>

          <div className="matchday-review-summary-grid">
            {summaryCards.map((card) => (
              <article key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
              </article>
            ))}
          </div>

          <section className="matchday-review-timeline" aria-labelledby="review-timeline">
            <header className="matchday-section-heading compact">
              <div>
                <span>Timeline</span>
                <h2 id="review-timeline">Recent Calculation Timeline</h2>
              </div>
            </header>
            <div className="matchday-activity-timeline">
              {reviewTimeline.map((entry) => (
                <article key={`${entry.time}-${entry.event}`}>
                  <time>{entry.time}</time>
                  <span aria-hidden="true" />
                  <strong>{entry.event}</strong>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="matchday-review-card matchday-review-status">
          <header className="matchday-section-heading compact">
            <div>
              <span>Status</span>
              <h2>Review Status</h2>
            </div>
          </header>

          <div className="matchday-review-checklist">
            {reviewChecklist.map((item) => (
              <div className={item.tone} key={item.label}>
                <span aria-hidden="true">{item.marker}</span>
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>

          <section className={`matchday-publication-state ${isPublishable ? "ready" : "blocked"}`}>
            <span>Current publication state</span>
            <strong>
              {isPublishable ? "Ready for publication" : "Not publishable"}
            </strong>
            <p>
              {isPublishable
                ? "Alle Review-Punkte sind bestätigt."
                : "Offene Regelkandidaten blockieren die Veröffentlichung."}
            </p>
          </section>

          <section className="matchday-review-placeholders">
            <span>Future Integration</span>
            {futurePlaceholders.map((placeholder) => (
              <div key={placeholder}>{placeholder}</div>
            ))}
          </section>
        </aside>
      </div>

      <footer className="matchday-review-actions" aria-label="Review Aktionen">
        <Link href="/admin/matchday">Zurück zum Leitstand</Link>
        <button className="primary" disabled={!isPublishable} type="button">
          Spieltag veröffentlichen
        </button>
      </footer>
    </main>
  );
}
