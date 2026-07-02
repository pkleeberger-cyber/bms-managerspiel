import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createReferenceAppliedRuleCandidateReport,
  createReferenceSeasonDifferenceAudit,
  verifyFinalReferenceSeason,
  verifyGoldenReferenceSeason,
} from "../domain/reference-season-import";
import type {
  ReferenceAppliedRuleCandidateReport,
  ReferenceDifferenceCategory,
  ReferenceFinalFixtureVerification,
  ReferenceFinalSeasonVerificationReport,
  ReferenceSeasonDifferenceAudit,
  ReferenceSeasonVerificationReport,
} from "../domain/reference-season-import";

type PreviousComparison = {
  previousWorkbook: string;
  goldenWorkbook: string;
  differenceCount: {
    previous: number;
    golden: number;
    delta: number;
  };
  categoryCount: Record<ReferenceDifferenceCategory, {
    previous: number;
    golden: number;
    delta: number;
  }>;
  ruleCandidateCount: {
    previous: number;
    golden: number;
    delta: number;
  };
  mappingIssues: {
    previous: number;
    golden: number;
    delta: number;
  };
};

type GoldenVerificationReport = ReferenceSeasonVerificationReport & {
  previousComparison: PreviousComparison | null;
};

const categories: ReferenceDifferenceCategory[] = [
  "TEAM_INVALID",
  "MANUAL_PENALTY",
  "POINT_ADJUSTMENT",
  "PLAYER_MAPPING",
  "MISSING_RATING",
  "UNKNOWN",
];

function readArgument(name: string): string | null {
  const argumentIndex = process.argv.indexOf(name);

  if (argumentIndex === -1) {
    return null;
  }

  const value = process.argv[argumentIndex + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }

  return value;
}

function getCategoryCount(
  audit: ReferenceSeasonDifferenceAudit,
  category: ReferenceDifferenceCategory,
): number {
  return audit.summary.byCategory.find((entry) => entry.category === category)
    ?.managerDifferences ?? 0;
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function createPreviousComparison(
  outputDirectory: string,
  goldenVerification: ReferenceSeasonVerificationReport,
  goldenAudit: ReferenceSeasonDifferenceAudit,
  goldenCandidates: ReferenceAppliedRuleCandidateReport,
): Promise<PreviousComparison | null> {
  const previousDirectory = path.resolve(outputDirectory, "../reference-season");
  const previousVerification = await readJsonIfExists<ReferenceSeasonVerificationReport>(
    path.join(previousDirectory, "liga-1-verification.json"),
  );
  const previousAudit = await readJsonIfExists<ReferenceSeasonDifferenceAudit>(
    path.join(previousDirectory, "difference-audit.json"),
  );
  const previousCandidates = await readJsonIfExists<ReferenceAppliedRuleCandidateReport>(
    path.join(previousDirectory, "applied-rule-candidates.json"),
  );

  if (!previousVerification || !previousAudit || !previousCandidates) {
    return null;
  }

  return {
    previousWorkbook: previousVerification.workbook,
    goldenWorkbook: goldenVerification.workbook,
    differenceCount: {
      previous: previousVerification.summary.differences,
      golden: goldenVerification.summary.differences,
      delta: goldenVerification.summary.differences - previousVerification.summary.differences,
    },
    categoryCount: Object.fromEntries(categories.map((category) => {
      const previous = getCategoryCount(previousAudit, category);
      const golden = getCategoryCount(goldenAudit, category);

      return [category, {
        previous,
        golden,
        delta: golden - previous,
      }];
    })) as PreviousComparison["categoryCount"],
    ruleCandidateCount: {
      previous: previousCandidates.summary.candidates,
      golden: goldenCandidates.summary.candidates,
      delta: goldenCandidates.summary.candidates - previousCandidates.summary.candidates,
    },
    mappingIssues: {
      previous: previousCandidates.summary.excludedByCategory.PLAYER_MAPPING,
      golden: goldenCandidates.summary.excludedByCategory.PLAYER_MAPPING,
      delta: goldenCandidates.summary.excludedByCategory.PLAYER_MAPPING
        - previousCandidates.summary.excludedByCategory.PLAYER_MAPPING,
    },
  };
}

function renderVerificationMarkdown(report: GoldenVerificationReport): string {
  const comparison = report.previousComparison
    ? `## Vergleich zur bisherigen Referenz

Kennzahl | Bisher | Golden | Delta
--- | ---: | ---: | ---:
Fixture-Abweichungen | ${report.previousComparison.differenceCount.previous} | ${report.previousComparison.differenceCount.golden} | ${report.previousComparison.differenceCount.delta}
Regelkandidaten | ${report.previousComparison.ruleCandidateCount.previous} | ${report.previousComparison.ruleCandidateCount.golden} | ${report.previousComparison.ruleCandidateCount.delta}
PLAYER_MAPPING | ${report.previousComparison.mappingIssues.previous} | ${report.previousComparison.mappingIssues.golden} | ${report.previousComparison.mappingIssues.delta}

Kategorie | Bisher | Golden | Delta
--- | ---: | ---: | ---:
${categories.map((category) => {
      const row = report.previousComparison?.categoryCount[category];

      return `${category} | ${row?.previous ?? 0} | ${row?.golden ?? 0} | ${row?.delta ?? 0}`;
    }).join("\n")}`
    : "## Vergleich zur bisherigen Referenz\n\nKeine vorherigen Referenzreports gefunden.";

  return `# Golden Reference Verification – Liga 1

## Quelle

- Workbook: \`${report.workbook}\`
- Bewertung: \`${report.sheets.evaluation}\`
- Paarungen: \`${report.sheets.fixtures}\`
- Verarbeitet: ${report.processedAt}

## Ergebnis

Kennzahl | Wert
--- | ---:
Spieltage verarbeitet | ${report.summary.matchdaysProcessed}
Paarungen verarbeitet | ${report.summary.fixturesProcessed}
Manager-Auswertungen verarbeitet | ${report.summary.managerEvaluationsProcessed}
Exakte Paarungen | ${report.summary.exactMatches}
Paarungen mit Abweichung | ${report.summary.differences}
Invalid-Team-Fälle | ${report.summary.invalidTeamCases}
Gesamte absolute Punktedifferenz | ${report.summary.totalScoreDifference}

${comparison}
`;
}

function renderDifferenceAuditMarkdown(audit: ReferenceSeasonDifferenceAudit): string {
  return `# Golden Reference Difference Audit – Liga 1

## Zusammenfassung

Kategorie | Paarungen | Manager-Ergebnisse | Absolute Differenz
--- | ---: | ---: | ---:
${audit.summary.byCategory.map((category) => [
    category.category,
    category.fixtureDifferences,
    category.managerDifferences,
    category.totalAbsoluteDifference,
  ].join(" | ")).join("\n")}

## Abweichungen

${audit.fixtureDifferences.map((fixture) => fixture.managerDifferences.map((difference) => (
    `- Spieltag ${fixture.matchday}, ${fixture.fixture.homeManager} – `
    + `${fixture.fixture.awayManager}, ${difference.manager}: `
    + `${difference.engineTotal} vs ${difference.officialTotal}, `
    + `Differenz ${difference.difference}, Kategorie \`${difference.likelyCategory}\``
  )).join("\n")).join("\n")}
`;
}

function renderRuleCandidatesMarkdown(report: ReferenceAppliedRuleCandidateReport): string {
  return `# Golden Reference Rule Candidates – Liga 1

## Zusammenfassung

Kennzahl | Wert
--- | ---:
Kandidaten gesamt | ${report.summary.candidates}
TEAM_INVALID | ${report.summary.byType.TEAM_INVALID}
TEAM_PENALTY | ${report.summary.byType.TEAM_PENALTY}
POINT_ADJUSTMENT | ${report.summary.byType.POINT_ADJUSTMENT}
Ausgeschlossene Issues | ${report.summary.excludedIssues}
PLAYER_MAPPING | ${report.summary.excludedByCategory.PLAYER_MAPPING}
MISSING_RATING | ${report.summary.excludedByCategory.MISSING_RATING}
UNKNOWN | ${report.summary.excludedByCategory.UNKNOWN}

## Kandidaten

${report.candidates.map((candidate) => (
    `- ${candidate.candidateId}: \`${candidate.proposedRule.type}\`, `
    + `${candidate.proposedRule.managerReference.displayName}, `
    + `Spieltag ${candidate.proposedRule.validFromMatchday}`
  )).join("\n")}

## Nicht in Regeln umgewandelt

${report.excludedIssues.map((issue) => (
    `- Spieltag ${issue.matchday}, ${issue.manager}: \`${issue.category}\``
  )).join("\n") || "Keine."}
`;
}

function renderFinalVerificationMarkdown(report: ReferenceFinalSeasonVerificationReport): string {
  return `# Golden Final Verification – Liga 1

## Pipeline

\`\`\`text
Golden Reference
        ↓
Calculation Engine
        ↓
Rules Engine
        ↓
Official Matchday
        ↓
Official League Table
        ↓
Verification
\`\`\`

## Ergebnis

Kennzahl | Wert
--- | ---:
Fixtures verarbeitet | ${report.summary.totalFixtures}
Exakte Matches | ${report.summary.perfectFixtureMatches}
Verbleibende Differenzen | ${report.summary.remainingDifferences}
Verbleibende Score-Differenz | ${report.summary.remainingTotalScoreDifference}
TEAM_INVALID angewendet | ${report.summary.rulesApplied.TEAM_INVALID}
TEAM_PENALTY angewendet | ${report.summary.rulesApplied.TEAM_PENALTY}
POINT_ADJUSTMENT angewendet | ${report.summary.rulesApplied.POINT_ADJUSTMENT}

## Verbleibende Kategorien

Kategorie | Manager-Ergebnisse | Absolute Differenz
--- | ---: | ---:
${report.summary.differencesByCategory.map((category) => [
    category.category,
    category.managerDifferences,
    category.totalAbsoluteDifference,
  ].join(" | ")).join("\n")}

## Datenqualitätsgrenze

\`PLAYER_MAPPING\`, \`MISSING_RATING\` und \`UNKNOWN\` werden nicht als Regeln angewendet.
`;
}

function renderRemainingDifferencesMarkdown(
  differences: readonly ReferenceFinalFixtureVerification[],
): string {
  if (differences.length === 0) {
    return "# Golden Remaining Differences – Liga 1\n\nKeine verbleibenden Differenzen.\n";
  }

  return `# Golden Remaining Differences – Liga 1

Spieltag | Paarung | Official Engine | Golden | Differenz | Kategorien
---: | --- | ---: | ---: | ---: | ---
${differences.map((difference) => [
    difference.matchday,
    `${difference.fixture.homeManager} – ${difference.fixture.awayManager}`,
    `${difference.officialEngineScore.home}:${difference.officialEngineScore.away}`,
    `${difference.historicalScore.home}:${difference.historicalScore.away}`,
    `${difference.remainingDifference.home > 0 ? "+" : ""}${difference.remainingDifference.home}`
      + ` / ${difference.remainingDifference.away > 0 ? "+" : ""}${difference.remainingDifference.away}`,
    difference.remainingCategories.map((category) => `\`${category}\``).join(", ") || "—",
  ].join(" | ")).join("\n")}
`;
}

async function main() {
  const workbookArgument = readArgument("--workbook");

  if (!workbookArgument) {
    throw new Error(
      "Usage: npm run verify:golden-reference -- --workbook /path/to/golden.xlsx",
    );
  }

  const outputDirectory = path.resolve(
    readArgument("--output") ?? "../reports/golden-reference",
  );
  const verification = await verifyGoldenReferenceSeason(path.resolve(workbookArgument));
  const audit = createReferenceSeasonDifferenceAudit(verification);
  const candidates = createReferenceAppliedRuleCandidateReport(audit);
  const finalVerification = verifyFinalReferenceSeason(verification, candidates);
  const remainingDifferences = finalVerification.fixtures.filter(
    (fixture) => !fixture.exactMatch,
  );
  const previousComparison = await createPreviousComparison(
    outputDirectory,
    verification,
    audit,
    candidates,
  );
  const goldenVerification: GoldenVerificationReport = {
    ...verification,
    previousComparison,
  };

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(outputDirectory, "verification.json"),
      `${JSON.stringify(goldenVerification, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "verification.md"),
      renderVerificationMarkdown(goldenVerification),
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "difference-audit.json"),
      `${JSON.stringify(audit, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "difference-audit.md"),
      renderDifferenceAuditMarkdown(audit),
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "rule-candidates.json"),
      `${JSON.stringify(candidates, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "rule-candidates.md"),
      renderRuleCandidatesMarkdown(candidates),
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "final-verification.json"),
      `${JSON.stringify(finalVerification, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "final-verification.md"),
      renderFinalVerificationMarkdown(finalVerification),
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "remaining-differences.json"),
      `${JSON.stringify({
        workbook: finalVerification.workbook,
        competition: finalVerification.competition,
        generatedAt: finalVerification.generatedAt,
        summary: finalVerification.summary,
        differences: remainingDifferences,
      }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "remaining-differences.md"),
      renderRemainingDifferencesMarkdown(remainingDifferences),
      "utf8",
    ),
  ]);

  console.log(JSON.stringify(goldenVerification.summary, null, 2));
  console.log(JSON.stringify(audit.summary, null, 2));
  console.log(JSON.stringify(candidates.summary, null, 2));
  console.log(JSON.stringify(finalVerification.summary, null, 2));
  console.log(`Golden reports written to ${outputDirectory}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
