import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createReferenceAppliedRuleCandidateReport,
  createReferenceSeasonDifferenceAudit,
  verifyFinalReferenceSeason,
  verifyReferenceSeason,
} from "../domain/reference-season-import";
import type {
  ReferenceAppliedRuleCandidate,
  ReferenceAppliedRuleCandidateReport,
  ReferenceExcludedRuleIssue,
  ReferenceFinalSeasonVerificationReport,
  ReferenceFixtureDifferenceAudit,
  ReferenceFixtureDifference,
  ReferenceManagerDifferenceAudit,
  ReferenceSeasonDifferenceAudit,
  ReferenceSeasonVerificationReport,
} from "../domain/reference-season-import";

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

function renderDifferenceRow(difference: ReferenceFixtureDifference): string {
  return [
    difference.matchday,
    `${difference.homeManager} – ${difference.awayManager}`,
    `${difference.calculatedScore.home}:${difference.calculatedScore.away}`,
    `${difference.officialScore.home}:${difference.officialScore.away}`,
    `${difference.scoreDifference.home >= 0 ? "+" : ""}${difference.scoreDifference.home}`
      + ` / ${difference.scoreDifference.away >= 0 ? "+" : ""}${difference.scoreDifference.away}`,
  ].join(" | ");
}

function renderMarkdown(report: ReferenceSeasonVerificationReport): string {
  const invalidCases = report.invalidTeamCases.length === 0
    ? "- Keine"
    : report.invalidTeamCases.map((invalidCase) => (
        `- Spieltag ${invalidCase.matchday}: ${invalidCase.managerName} `
        + `(${invalidCase.side}) – berechnet ${invalidCase.calculatedScore}, `
        + `offiziell ${invalidCase.officialScore}`
      )).join("\n");
  const differences = report.differences.length === 0
    ? "Keine Abweichungen."
    : [
        "Spieltag | Paarung | Berechnet | Offiziell | Differenz Heim / Auswärts",
        "--- | --- | ---: | ---: | ---:",
        ...report.differences.map(renderDifferenceRow),
      ].join("\n");

  return `# Reference Season Verification – Liga 1

## Quelle

- Workbook: \`${report.workbook}\`
- Bewertungssheet: \`${report.sheets.evaluation}\`
- Paarungssheet: \`${report.sheets.fixtures}\`
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

## Liga-1-Manager

${report.managers.map((manager) => `- ${manager}`).join("\n")}

## Nicht zu Liga 1 gehörende Bewertungsmanager

${report.excludedEvaluationManagers.map((manager) => `- ${manager}`).join("\n")}

## Invalid-Team-Fälle

${invalidCases}

## Abweichungen

${differences}
`;
}

function formatSigned(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

function renderPlayerComparisonRows(
  difference: ReferenceManagerDifferenceAudit,
): string {
  const differingPlayers = difference.playerLevelComparison.filter(
    (player) => player.difference !== 0,
  );

  if (differingPlayers.length === 0) {
    return "_Keine Abweichung auf Spielerebene erkennbar._";
  }

  return [
    "Slot | Gewertet für | Spieler | Note | Engine | Excel | Differenz | Ersatz",
    "---: | ---: | --- | ---: | ---: | ---: | ---: | ---",
    ...differingPlayers.map((player) => [
      player.slotId,
      player.evaluatedForSlotId ?? "—",
      player.playerName,
      player.rating ?? "—",
      player.enginePoints,
      player.workbookPoints,
      formatSigned(player.difference),
      player.wasReplacement ? "Ja" : "Nein",
    ].join(" | ")),
  ].join("\n");
}

function renderManagerDifference(
  fixture: ReferenceFixtureDifferenceAudit,
  difference: ReferenceManagerDifferenceAudit,
): string {
  return `### Spieltag ${fixture.matchday}: ${fixture.fixture.homeManager} – ${fixture.fixture.awayManager} · ${difference.manager}

- Seite: ${difference.side === "HOME" ? "Heim" : "Auswärts"}
- Engine: ${difference.engineTotal}
- Offiziell: ${difference.officialTotal}
- Differenz: ${formatSigned(difference.difference)}
- Excel-Spielersumme: ${difference.workbookTotal}
- Engine gegen Excel-Spielersumme: ${formatSigned(difference.engineToWorkbookDifference)}
- Wahrscheinliche Kategorie: \`${difference.likelyCategory}\`
- Indizien: ${difference.categoryEvidence.join(" ")}

${renderPlayerComparisonRows(difference)}
`;
}

function renderDifferenceAuditMarkdown(
  audit: ReferenceSeasonDifferenceAudit,
): string {
  const categoryRows = audit.summary.byCategory.map((category) => [
    category.category,
    category.fixtureDifferences,
    category.managerDifferences,
    category.totalAbsoluteDifference,
  ].join(" | "));
  const differenceSections = audit.fixtureDifferences.flatMap((fixture) => (
    fixture.managerDifferences.map((difference) => (
      renderManagerDifference(fixture, difference)
    ))
  ));

  return `# Reference Season Difference Audit – Liga 1

## Quelle

- Workbook: \`${audit.workbook}\`
- Wettbewerb: \`${audit.competition}\`
- Verarbeitet: ${audit.processedAt}

## Zusammenfassung

Kennzahl | Wert
--- | ---:
Paarungen mit Abweichung | ${audit.summary.fixtureDifferences}
Betroffene Manager-Ergebnisse | ${audit.summary.managerDifferences}
Unbekannte Manager-Abweichungen | ${audit.summary.unknownDifferencesRemaining}
Gesamte absolute Punktedifferenz | ${audit.summary.totalAbsoluteDifference}

## Kategorien

Kategorie | Paarungen | Manager-Ergebnisse | Absolute Differenz
--- | ---: | ---: | ---:
${categoryRows.join("\n")}

## Klassifikationslogik

- \`TEAM_INVALID\`: bekannter historischer Thomas-Fall; erwartetes offizielles Ergebnis 0.
- \`MISSING_RATING\`: Engine und Excel-Spielersumme unterscheiden sich und mindestens ein abweichender Slot hat keine gültige Note.
- \`PLAYER_MAPPING\`: Engine und Excel-Spielersumme unterscheiden sich auf Spielerebene, ohne fehlende Note als unmittelbares Indiz.
- \`MANUAL_PENALTY\`: Engine entspricht der Excel-Spielersumme, das offizielle Ergebnis ist niedriger.
- \`POINT_ADJUSTMENT\`: Engine entspricht der Excel-Spielersumme, das offizielle Ergebnis ist höher.
- \`UNKNOWN\`: die zwei vorhandenen Sheets liefern kein belastbareres Indiz.

Die Kategorien außer dem bekannten Thomas-Fall sind Prüfhinweise, keine neu
implementierten BMS-Regeln. Die Engines bleiben unverändert.

## Abweichungen

${differenceSections.join("\n")}
`;
}

function renderRuleCandidate(candidate: ReferenceAppliedRuleCandidate): string {
  const value = candidate.proposedRule.type === "TEAM_INVALID"
    ? `Ungültiges Ergebnis: ${candidate.proposedRule.value.invalidFantasyGoals}`
    : `Punkte: ${formatSigned(candidate.proposedRule.value.points ?? 0)}`;

  return `### ${candidate.candidateId}

- Status: \`${candidate.reviewStatus}\`
- Vorgeschlagener Regeltyp: \`${candidate.proposedRule.type}\`
- Ursprungskategorie: \`${candidate.sourceCategory}\`
- Spieltag: ${candidate.proposedRule.validFromMatchday}
- Manager: ${candidate.proposedRule.managerReference.displayName}
- Manager-ID: noch nicht aufgelöst
- Paarung: ${candidate.source.fixture.homeManager} – ${candidate.source.fixture.awayManager}
- Seite: ${candidate.source.side === "HOME" ? "Heim" : "Auswärts"}
- ${value}
- Engine: ${candidate.source.engineTotal}
- Offiziell: ${candidate.source.officialTotal}
- Excel-Spielersumme: ${candidate.source.workbookTotal}
- Indizien: ${candidate.source.categoryEvidence.join(" ")}
`;
}

function renderExcludedIssue(issue: ReferenceExcludedRuleIssue): string {
  const players = issue.differingPlayers.length === 0
    ? "keine abweichenden Spielerslots"
    : issue.differingPlayers.map((player) => (
        `Slot ${player.slotId} ${player.playerName}: `
        + `${player.enginePoints} / ${player.workbookPoints}`
      )).join("; ");

  return `- Spieltag ${issue.matchday}, ${issue.fixture.homeManager} – `
    + `${issue.fixture.awayManager}, ${issue.manager}: \`${issue.category}\`; `
    + `Engine ${issue.engineTotal}, offiziell ${issue.officialTotal}; ${players}`;
}

function renderRuleCandidateMarkdown(
  report: ReferenceAppliedRuleCandidateReport,
): string {
  return `# AppliedRule Candidates – Reference Season Liga 1

## Status

Diese Datei enthält ausschließlich prüfbare Vorschläge. Keine Regel wurde
angewendet, persistiert oder an eine Manager-ID gebunden.

Kennzahl | Wert
--- | ---:
Kandidaten gesamt | ${report.summary.candidates}
TEAM_INVALID | ${report.summary.byType.TEAM_INVALID}
TEAM_PENALTY | ${report.summary.byType.TEAM_PENALTY}
POINT_ADJUSTMENT | ${report.summary.byType.POINT_ADJUSTMENT}
Ausgeschlossene Datenprobleme | ${report.summary.excludedIssues}
PLAYER_MAPPING | ${report.summary.excludedByCategory.PLAYER_MAPPING}
MISSING_RATING | ${report.summary.excludedByCategory.MISSING_RATING}
UNKNOWN | ${report.summary.excludedByCategory.UNKNOWN}

## Review-Grenze

- \`MANUAL_PENALTY\` wird als \`TEAM_PENALTY\` mit der Differenz offiziell minus Engine vorgeschlagen.
- \`POINT_ADJUSTMENT\` bleibt \`POINT_ADJUSTMENT\`.
- \`TEAM_INVALID\` schlägt das erwartete ungültige Ergebnis 0 vor.
- Persistierte Manager-/Team-IDs müssen vor einer späteren Anwendung aufgelöst werden.
- \`PLAYER_MAPPING\`, \`MISSING_RATING\` und \`UNKNOWN\` werden niemals in Regeln umgewandelt.

## Regelkandidaten

${report.candidates.map(renderRuleCandidate).join("\n")}

## Ausgeschlossene Mapping- und Datenprobleme

${report.excludedIssues.length === 0
    ? "Keine."
    : report.excludedIssues.map(renderExcludedIssue).join("\n")}
`;
}

function renderFinalVerificationMarkdown(
  report: ReferenceFinalSeasonVerificationReport,
): string {
  const remainingFixtures = report.fixtures.filter((fixture) => !fixture.exactMatch);
  const remainingRows = remainingFixtures.length === 0
    ? "Keine verbleibenden Abweichungen."
    : [
        "Spieltag | Paarung | Official Engine | Historisch | Differenz | Kategorie",
        "---: | --- | ---: | ---: | ---: | ---",
        ...remainingFixtures.map((fixture) => [
          fixture.matchday,
          `${fixture.fixture.homeManager} – ${fixture.fixture.awayManager}`,
          `${fixture.officialEngineScore.home}:${fixture.officialEngineScore.away}`,
          `${fixture.historicalScore.home}:${fixture.historicalScore.away}`,
          `${formatSigned(fixture.remainingDifference.home)} / `
            + `${formatSigned(fixture.remainingDifference.away)}`,
          fixture.remainingCategories.map((category) => `\`${category}\``).join(", ") || "—",
        ].join(" | ")),
      ].join("\n");
  const tableRows = report.finalLeagueTable.map((row) => [
    row.position,
    row.manager,
    row.matchesPlayed,
    row.wins,
    row.draws,
    row.losses,
    row.fantasyGoalsFor,
    row.fantasyGoalsAgainst,
    row.fantasyGoalDifference,
    row.leaguePoints,
  ].join(" | "));
  const categoryRows = report.summary.differencesByCategory.map((category) => [
    category.category,
    category.managerDifferences,
    category.totalAbsoluteDifference,
  ].join(" | "));

  return `# Final Season Verification – Liga 1

## Verarbeitung

\`\`\`text
Berechnete Referenzsaison
        ↓
Geprüfte AppliedRule-Kandidaten
        ↓
Bestehender Rules Engine
        ↓
Offizielle Matchday-Ergebnisse
        ↓
Offizielle Abschlusstabelle
        ↓
Vergleich mit historischen Excel-Ergebnissen
\`\`\`

Für diesen Verifikationslauf werden alle 100 Kandidaten als geprüft angenommen.
Es erfolgt keine Persistierung und keine automatische Freigabe für Produktion.

## Ergebnis

Kennzahl | Wert
--- | ---:
Paarungen gesamt | ${report.summary.totalFixtures}
Exakte Paarungen | ${report.summary.perfectFixtureMatches}
Verbleibende Paarungen mit Abweichung | ${report.summary.remainingDifferences}
Verbleibende absolute Punktedifferenz | ${report.summary.remainingTotalScoreDifference}
TEAM_INVALID angewendet | ${report.summary.rulesApplied.TEAM_INVALID}
TEAM_PENALTY angewendet | ${report.summary.rulesApplied.TEAM_PENALTY}
POINT_ADJUSTMENT angewendet | ${report.summary.rulesApplied.POINT_ADJUSTMENT}
PLAYER_MAPPING verbleibend | ${report.summary.remainingByCategory.PLAYER_MAPPING}
MISSING_RATING verbleibend | ${report.summary.remainingByCategory.MISSING_RATING}
UNKNOWN verbleibend | ${report.summary.remainingByCategory.UNKNOWN}

## Verbleibende Differenzen nach Kategorie

Kategorie | Manager-Ergebnisse | Absolute Differenz
--- | ---: | ---:
${categoryRows.join("\n")}

## Verbleibende Abweichungen

${remainingRows}

## Offizielle Abschlusstabelle

Pos. | Manager | Sp. | S | U | N | Punkte für | Punkte gegen | Diff. | Ligapunkte
---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:
${tableRows.join("\n")}
`;
}

async function main() {
  const workbookArgument = readArgument("--workbook");

  if (!workbookArgument) {
    throw new Error(
      "Usage: npm run verify:reference-season -- --workbook /path/to/Saisondaten.xlsx",
    );
  }

  const outputDirectory = path.resolve(
    readArgument("--output") ?? "../reports/reference-season",
  );
  const report = await verifyReferenceSeason(path.resolve(workbookArgument));
  const differenceAudit = createReferenceSeasonDifferenceAudit(report);
  const ruleCandidateReport = createReferenceAppliedRuleCandidateReport(differenceAudit);
  const finalVerification = verifyFinalReferenceSeason(report, ruleCandidateReport);

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(outputDirectory, "liga-1-verification.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "liga-1-verification.md"),
      renderMarkdown(report),
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "difference-audit.json"),
      `${JSON.stringify(differenceAudit, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "difference-audit.md"),
      renderDifferenceAuditMarkdown(differenceAudit),
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "applied-rule-candidates.json"),
      `${JSON.stringify(ruleCandidateReport, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "applied-rule-candidates.md"),
      renderRuleCandidateMarkdown(ruleCandidateReport),
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "final-season-verification.json"),
      `${JSON.stringify(finalVerification, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "final-season-verification.md"),
      renderFinalVerificationMarkdown(finalVerification),
      "utf8",
    ),
  ]);

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(JSON.stringify(differenceAudit.summary, null, 2));
  console.log(JSON.stringify(ruleCandidateReport.summary, null, 2));
  console.log(JSON.stringify(finalVerification.summary, null, 2));
  console.log(`Reports written to ${outputDirectory}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
