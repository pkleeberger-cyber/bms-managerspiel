import { createCompetitionLifecycleSnapshot } from "./competition-lifecycle";
import type { CompetitionLifecycleSnapshot } from "./types";

export const competitionLifecycleFixture: readonly CompetitionLifecycleSnapshot[] = [
  createCompetitionLifecycleSnapshot({
    competitionId: "league-1-2026-27",
    competitionType: "LEAGUE_1",
    status: "ACTIVE",
    timelineEntries: [
      {
        time: "09:05",
        action: "GENERATE_FIXTURE",
        user: "admin:league-office",
        description: "Liga 1 Spielplan erzeugt",
      },
      {
        time: "09:12",
        action: "ACTIVATE_LEAGUE",
        user: "admin:league-office",
        description: "Erste Liga für Spieltag 18 aktiviert",
      },
    ],
  }),
  createCompetitionLifecycleSnapshot({
    competitionId: "league-2-2026-27",
    competitionType: "LEAGUE_2",
    status: "PARTICIPANTS_CONFIRMED",
    timelineEntries: [
      {
        time: "08:51",
        action: "CONFIRM_PARTICIPANTS",
        user: "admin:league-office",
        description: "Zweite Liga Teilnehmer bestätigt",
      },
    ],
  }),
  createCompetitionLifecycleSnapshot({
    competitionId: "cup-2026-27",
    competitionType: "CUP",
    status: "ROUND_READY",
    timelineEntries: [
      {
        time: "09:18",
        action: "RUN_DRAW",
        user: "admin:league-office",
        description: "Pokal ausgelost",
      },
    ],
  }),
  createCompetitionLifecycleSnapshot({
    competitionId: "europe-2026-27",
    competitionType: "EUROPE",
    status: "PARTICIPANTS_REQUIRED",
    timelineEntries: [
      {
        time: "08:42",
        action: "CREATE_COMPETITION",
        description: "Europapokal für neue Saison angelegt",
      },
    ],
  }),
  createCompetitionLifecycleSnapshot({
    competitionId: "supercup-2026-27",
    competitionType: "SUPERCUP",
    status: "READY",
    timelineEntries: [
      {
        time: "09:42",
        action: "GENERATE_SUPERCUP_FIXTURE",
        user: "admin:league-office",
        description: "Supercup-Spiel vorbereitet",
      },
    ],
  }),
];
