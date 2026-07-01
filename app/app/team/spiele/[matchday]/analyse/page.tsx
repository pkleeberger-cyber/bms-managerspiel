import { MatchdayAnalysisDetail } from "@/components/matches/matchday-analysis-detail";
import { matchAnalysisExcelFixture } from "@/domain/match-analysis-engine/fixture";

export default function MatchdayAnalysisPage() {
  return <MatchdayAnalysisDetail analysis={matchAnalysisExcelFixture} />;
}
