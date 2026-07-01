import { FullMatchdayEvaluation } from "@/components/matches/full-matchday-evaluation";
import { matchAnalysisExcelFixture } from "@/domain/match-analysis-engine/fixture";

export default function FullMatchdayEvaluationPage() {
  return <FullMatchdayEvaluation analysis={matchAnalysisExcelFixture} />;
}
