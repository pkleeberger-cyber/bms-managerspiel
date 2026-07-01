export type EventCategory =
  | "league"
  | "matchday"
  | "club"
  | "player"
  | "cup"
  | "european"
  | "record";

export type EventScope =
  | "competition"
  | "matchday"
  | "club"
  | "manager"
  | "player"
  | "season";

export type EventSeverity = "low" | "medium" | "high" | "critical";

export type EventValidity =
  | { type: "matchdays"; count: number }
  | { type: "season" }
  | { type: "permanent" };

export type BmsEventType =
  | "TITLE_RACE_CLOSE"
  | "LEADER_CHANGED"
  | "LEADER_PULLS_AWAY"
  | "EUROPE_BATTLE_CLOSE"
  | "RELEGATION_BATTLE_CLOSE"
  | "MATCHDAY_SURPRISE"
  | "CHAMPIONSHIP_DECIDED"
  | "CUP_ROUND_COMPLETED"
  | "CUP_DRAW_READY"
  | "CUP_FINAL_SET"
  | "CUP_WINNER_DECIDED"
  | "EURO_TOP4_CLOSE"
  | "EURO_QUALIFICATION_LINE_CLOSE"
  | "EURO_SEMIFINALS_SET"
  | "EURO_FINAL_SET"
  | "EURO_WINNER_DECIDED";

export type EventPayloadValue =
  | string
  | number
  | boolean
  | null
  | readonly EventPayloadValue[]
  | { readonly [key: string]: EventPayloadValue };

export type EventPayload = Record<string, EventPayloadValue>;

export type BmsEvent = {
  id: string;
  type: BmsEventType;
  category: EventCategory;
  title: string;
  priority: number;
  severity: EventSeverity;
  scope: EventScope;
  validFor: EventValidity;
  relatedCompetitionId: string;
  relatedManagerIds: string[];
  relatedTeamIds: string[];
  matchday: number;
  payload: EventPayload;
};
