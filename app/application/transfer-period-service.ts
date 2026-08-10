import { revalidatePath } from "next/cache";

import type { Prisma } from "@prisma/client";
import type { PlayerListPhase } from "@/infrastructure";
import { getPrismaClient } from "@/infrastructure/prisma";

export type TransferPeriodStatus = "CLOSED" | "OPEN";

export type TransferPeriodSnapshot = {
  seasonId: string | null;
  seasonName: string;
  activePhase: PlayerListPhase | null;
  status: TransferPeriodStatus;
  openedAt: string | null;
  closedAt: string | null;
};

export type TransferPeriodAdminSnapshot = TransferPeriodSnapshot & {
  phases: readonly {
    phase: PlayerListPhase;
    status: TransferPeriodStatus;
    openedAt: string | null;
    closedAt: string | null;
  }[];
};

export class TransferPeriodService {
  private readonly prisma = getPrismaClient();

  async loadSnapshot(): Promise<TransferPeriodSnapshot> {
    const admin = await this.loadAdminSnapshot();
    const openPhase = admin.phases.find((phase) => phase.status === "OPEN");

    return {
      seasonId: admin.seasonId,
      seasonName: admin.seasonName,
      activePhase: openPhase?.phase ?? null,
      status: openPhase ? "OPEN" : "CLOSED",
      openedAt: openPhase?.openedAt ?? null,
      closedAt: openPhase?.closedAt ?? admin.closedAt,
    };
  }

  async loadAdminSnapshot(): Promise<TransferPeriodAdminSnapshot> {
    if (!this.prisma) {
      return createUnavailableSnapshot();
    }

    const season = await this.prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { yearStart: "desc" },
    });

    if (!season) {
      return createUnavailableSnapshot();
    }

    const phases = await this.prisma.transferPhase.findMany({
      where: { seasonId: season.id },
      orderBy: { type: "asc" },
    });
    const phaseSnapshots = (["SUMMER", "WINTER"] as const).map((phase) => {
      const existing = phases.find((item) => item.type === phase);

      return {
        phase,
        status: existing?.status === "OPEN" ? "OPEN" as const : "CLOSED" as const,
        openedAt: existing?.opensAt?.toISOString() ?? null,
        closedAt: existing?.deadlineAt?.toISOString() ?? null,
      };
    });
    const openPhase = phaseSnapshots.find((phase) => phase.status === "OPEN");

    return {
      seasonId: season.id,
      seasonName: season.name,
      activePhase: openPhase?.phase ?? null,
      status: openPhase ? "OPEN" : "CLOSED",
      openedAt: openPhase?.openedAt ?? null,
      closedAt: phaseSnapshots.find((phase) => phase.closedAt)?.closedAt ?? null,
      phases: phaseSnapshots,
    };
  }

  async openTransferPeriod(formData: FormData): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    const phase = readPhase(formData);
    const season = await this.prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { yearStart: "desc" },
    });

    if (!season) {
      throw new Error("Keine aktive Saison gefunden.");
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.transferPhase.updateMany({
        where: {
          seasonId: season.id,
          status: "OPEN",
        },
        data: {
          status: "CLOSED",
          deadlineAt: now,
        },
      });
      await tx.transferPhase.upsert({
        where: {
          seasonId_type: {
            seasonId: season.id,
            type: phase,
          },
        },
        update: {
          status: "OPEN",
          opensAt: now,
          deadlineAt: null,
        },
        create: {
          seasonId: season.id,
          type: phase,
          status: "OPEN",
          opensAt: now,
          deadlineAt: null,
        },
      });
    });

    revalidateTransferPeriodPaths();
  }

  async closeTransferPeriod(): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    const season = await this.prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { yearStart: "desc" },
    });

    if (!season) {
      throw new Error("Keine aktive Saison gefunden.");
    }

    await this.prisma.transferPhase.updateMany({
      where: {
        seasonId: season.id,
        status: "OPEN",
      },
      data: {
        status: "CLOSED",
        deadlineAt: new Date(),
      },
    });

    revalidateTransferPeriodPaths();
  }

  async submitNormalTransferPlan(formData: FormData): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    const managerSeasonId = readRequiredString(formData, "managerSeasonId");
    const transferPlan = readJson(formData, "transferPlanJson");
    const season = await this.prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { yearStart: "desc" },
    });

    if (!season) {
      throw new Error("Keine aktive Saison gefunden.");
    }

    const [activePhase, managerSeason, openMandatoryTransfer] = await Promise.all([
      this.prisma.transferPhase.findFirst({
        where: {
          seasonId: season.id,
          status: "OPEN",
        },
        orderBy: { opensAt: "desc" },
      }),
      this.prisma.managerSeason.findUnique({
        where: { id: managerSeasonId },
      }),
      this.prisma.managerMandatoryTransfer.findFirst({
        where: {
          managerSeasonId,
          status: "OPEN",
        },
        select: { id: true },
      }),
    ]);

    if (!activePhase) {
      throw new Error("Der Transfermarkt ist aktuell geschlossen.");
    }

    if (openMandatoryTransfer) {
      throw new Error("Offene Pflichttransfers müssen separat abgeschlossen werden.");
    }

    if (!managerSeason || managerSeason.seasonId !== season.id) {
      throw new Error("ManagerSeason ist für die aktive Saison nicht verfügbar.");
    }

    const team = await this.prisma.team.findUnique({
      where: {
        seasonId_managerId: {
          seasonId: season.id,
          managerId: managerSeason.managerId,
        },
      },
      select: { id: true },
    });

    if (!team) {
      throw new Error("Team für Transferabgabe fehlt.");
    }

    await this.prisma.transferSubmission.upsert({
      where: {
        transferPhaseId_teamId: {
          transferPhaseId: activePhase.id,
          teamId: team.id,
        },
      },
      update: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        budgetJson: readJson(formData, "budgetJson"),
        transfersJson: transferPlan,
        validationJson: {
          status: "SUBMITTED",
          source: "transfer-workspace",
        },
      },
      create: {
        transferPhaseId: activePhase.id,
        teamId: team.id,
        status: "SUBMITTED",
        submittedAt: new Date(),
        budgetJson: readJson(formData, "budgetJson"),
        transfersJson: transferPlan,
        validationJson: {
          status: "SUBMITTED",
          source: "transfer-workspace",
        },
      },
    });

    revalidateTransferPeriodPaths();
  }
}

export async function loadTransferPeriodSnapshot() {
  return new TransferPeriodService().loadSnapshot();
}

export async function loadTransferPeriodAdminSnapshot() {
  return new TransferPeriodService().loadAdminSnapshot();
}

export async function openTransferPeriod(formData: FormData) {
  return new TransferPeriodService().openTransferPeriod(formData);
}

export async function closeTransferPeriod() {
  return new TransferPeriodService().closeTransferPeriod();
}

export async function submitNormalTransferPlan(formData: FormData) {
  return new TransferPeriodService().submitNormalTransferPlan(formData);
}

function readPhase(formData: FormData): PlayerListPhase {
  const phase = formData.get("phase");

  if (phase === "SUMMER" || phase === "WINTER") {
    return phase;
  }

  throw new Error("Transferphase fehlt.");
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} fehlt.`);
  }

  return value.trim();
}

function readJson(formData: FormData, key: string): Prisma.InputJsonValue {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return {};
  }

  return JSON.parse(value) as Prisma.InputJsonValue;
}

function createUnavailableSnapshot(): TransferPeriodAdminSnapshot {
  return {
    seasonId: null,
    seasonName: "Keine aktive Saison",
    activePhase: null,
    status: "CLOSED",
    openedAt: null,
    closedAt: null,
    phases: [
      { phase: "SUMMER", status: "CLOSED", openedAt: null, closedAt: null },
      { phase: "WINTER", status: "CLOSED", openedAt: null, closedAt: null },
    ],
  };
}

function revalidateTransferPeriodPaths() {
  for (const path of ["/admin/players", "/team/transfers", "/team/transfers/workspace"]) {
    try {
      revalidatePath(path);
    } catch {
      // CLI validation has no Next.js static generation store.
    }
  }
}
