export const DEFAULT_STARTING_BUDGET_CENTS = 4_000_000_000;

export type Manager = {
  id: string;
  userId: string;
  displayName: string;
  firstName: string;
  lastName: string;
  leagueLevel: number;
  currentBudgetCents: number;
  startingBudgetCents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
