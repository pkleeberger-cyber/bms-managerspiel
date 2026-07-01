# Official Matchday Verification

## Purpose

The official matchday verification proves that the Match Result Engine reproduces a historical BMS matchday exactly.

This is a deterministic verification fixture. It is not a production Excel importer and does not write to a database.

## Reference Workbooks

The verification combines two historical sources:

- `Test_Auswertung2.xlsx` contains the player evaluations and historical manager totals.
- `TestSpieltag.xlsx` contains the official fixtures and fantasy results.

`TestSpieltag.xlsx` uses these columns:

| Column | Field |
| --- | --- |
| A | `spieltag` |
| B | `heim` |
| C | `auswarts` |
| D | `hTore` |
| E | `aTore` |

The supplied snapshot contains nine fixtures for Matchday 34.

## Verification Pipeline

```text
Test_Auswertung2.xlsx
        |
        v
Lineup Engine
        |
        v
Verified manager lineup results and totals
        |
        +----------------------+
                               |
TestSpieltag.xlsx              |
        |                      |
        v                      v
Official fixtures ------> Match Result Engine
                               |
                               v
                    MatchdayVerificationReport
```

The matchday verifier imports the already calculated lineup results from the Excel Reality Test. It does not implement another scoring path and does not recalculate manager totals differently.

For every official fixture it:

1. resolves the verified home and away lineup results by manager name;
2. calls `calculateMatchResult`;
3. compares engine and Excel fantasy goals;
4. verifies win, draw, and loss outcomes;
5. verifies the `3/1/0` league-point assignment;
6. verifies both teams' fantasy goal differences.

Missing manager results, duplicate manager assignments, invalid headers, and matchday mismatches fail explicitly.

## Report

`app/domain/match-engine/excel-matchday-verification.ts` exports:

- `officialMatchdayFixtures`;
- `excelMatchdayVerificationReport`;
- `excelMatchdayVerificationProof`;
- reusable extraction and report functions.

Each match report contains:

- home and away manager;
- engine score;
- historical Excel score;
- score difference;
- score match;
- engine and Excel outcome;
- winner match;
- engine and Excel league points;
- league-points match;
- goal-difference match.

The summary contains:

- matches processed;
- perfect matches;
- differences;
- total absolute score difference.

## Verification Result

The audit processes all nine historical fixtures:

- matches processed: `9`;
- perfect matches: `8`;
- differences: `1`;
- total absolute score difference: `13`.

Eight fixtures reproduce the historical workbook exactly.

The remaining fixture is:

```text
Thomas 13:28 Ben  (verified Lineup Engine totals)
Thomas  0:28 Ben  (official TestSpieltag.xlsx result)
```

Thomas's player rows in `Test_Auswertung2.xlsx` sum to `13`, and the already verified Lineup Engine also returns `13`. The official fixture workbook records `0`.

The winner, loser, and league-point allocation remain identical because Ben wins both score variants. The official goal difference does not match the unadjusted calculated result.

This is evidence of an official match-level adjustment that is not present in either supplied workbook. It may represent invalid-team handling or a manual match penalty, but the available data does not identify the rule. The verifier does not infer a `-13` penalty or change the Match Result Engine. Existing domain rules explicitly require that invalid-team penalties remain undefined until the official competition rule is confirmed.

## Limitations

The fixture intentionally does not provide:

- file-upload handling;
- production workbook versioning;
- persistent manager identity mapping;
- database writes;
- UI output.

Manager names are used to join the two historical workbooks. A production importer must use stable persisted manager IDs.

The Thomas exception requires an authoritative validity or penalty source before the engine can reproduce the official `0` without deriving an adjustment from the expected result itself.
