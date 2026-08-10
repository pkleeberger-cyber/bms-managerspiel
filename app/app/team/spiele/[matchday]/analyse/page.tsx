import Link from "next/link";

import { loadPersistedMatchAnalysis } from "@/application/match-analysis-service";
import { MatchdayAnalysisDetail } from "@/components/matches/matchday-analysis-detail";

type MatchdayAnalysisPageProps = {
  params: Promise<{ matchday: string }>;
  searchParams?: Promise<{
    fixtureId?: string;
    managerSeasonId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MatchdayAnalysisPage({
  params,
  searchParams,
}: MatchdayAnalysisPageProps) {
  const { matchday } = await params;
  const query = await searchParams;
  const result = await loadPersistedMatchAnalysis({
    fixtureId: query?.fixtureId,
    managerSeasonId: query?.managerSeasonId,
    matchday: Number(matchday),
  });

  if (result.analysis) {
    return (
      <MatchdayAnalysisDetail
        analysis={result.analysis}
        competitionName={result.fixture?.competitionName ?? "Wettbewerb"}
      />
    );
  }

  return (
    <main className="cockpit cockpit-terminal matchday-analysis">
      <section className="analysis-missing-card">
        <span>Mein Team / Spiele</span>
        <h1>Analyse nicht verfügbar</h1>
        <p>{getMissingAnalysisMessage(result.reason)}</p>
        {result.fixture ? (
          <strong>
            {result.fixture.homeManagerName} vs {result.fixture.awayManagerName} ·
            Spieltag {result.fixture.matchday}
          </strong>
        ) : null}
        <div>
          <Link href="/admin/matchday/calculate">Zur Berechnung</Link>
          <Link href="/team/spiele">Zurück zu Spiele</Link>
        </div>
      </section>
    </main>
  );
}

function getMissingAnalysisMessage(reason: string) {
  if (reason === "UNPUBLISHED") {
    return "Diese Begegnung wurde intern berechnet, ist aber noch nicht vorläufig veröffentlicht.";
  }

  if (reason === "NO_RESULT") {
    return "Für diese Begegnung existiert noch kein berechnetes MatchResult.";
  }

  if (reason === "NO_ANALYSIS") {
    return "Das MatchResult existiert, aber die gespeicherte auditJson.matchAnalysis fehlt.";
  }

  return "Die angefragte Begegnung konnte nicht gefunden werden.";
}
