import { redirect } from "next/navigation";

import { loadTransferMarket } from "@/application/player-service";
import {
  completeManagerMandatoryTransfer,
  loadOpenMandatoryTransfers,
} from "@/application/player-departure-service";
import { loadCurrentTeamOverview } from "@/application/team-service";
import {
  loadTransferPeriodSnapshot,
  submitNormalTransferPlan,
} from "@/application/transfer-period-service";
import { GuidedTransferWorkspace } from "@/components/app-shell/guided-transfer-workspace";

type GuidedTransferWorkspacePageProps = {
  searchParams?: Promise<{
    developerMode?: string;
    managerSeasonId?: string;
    phase?: string;
  }>;
};

export default async function GuidedTransferWorkspacePage({
  searchParams,
}: GuidedTransferWorkspacePageProps) {
  const params = await searchParams;
  const phase = params?.phase === "WINTER" ? "WINTER" : "SUMMER";
  const developerMode = params?.developerMode === "1";
  const [snapshot, transferMarket, transferPeriod] = await Promise.all([
    loadCurrentTeamOverview({
      managerSeasonId: params?.managerSeasonId,
    }),
    loadTransferMarket({
      phase,
      developerMode,
    }),
    loadTransferPeriodSnapshot(),
  ]);
  const mandatoryTransfers = await loadOpenMandatoryTransfers(
    snapshot.manager.managerSeasonId,
  );
  const transferMode = mandatoryTransfers.length > 0
    ? "MANDATORY_OPEN"
    : transferPeriod.status === "OPEN" && transferPeriod.activePhase === "SUMMER"
      ? "SUMMER_OPEN"
      : transferPeriod.status === "OPEN" && transferPeriod.activePhase === "WINTER"
        ? "WINTER_OPEN"
        : "CLOSED";

  return (
    <GuidedTransferWorkspace
      key={snapshot.manager.managerSeasonId ?? snapshot.manager.shortName}
      mandatoryTransfers={mandatoryTransfers}
      snapshot={snapshot}
      submitTransfersAction={submitTransfersAction}
      transferMarket={transferMarket}
      transferMode={transferMode}
    />
  );
}

async function submitTransfersAction(formData: FormData) {
  "use server";

  const managerSeasonId = readOptionalString(formData, "managerSeasonId");
  const rawTransfers = formData.get("mandatoryTransfersJson");
  const transfers = parseMandatoryTransferCompletions(rawTransfers);

  if (transfers.length > 0) {
    for (const transfer of transfers) {
      await completeManagerMandatoryTransfer({
        ...transfer,
        managerSeasonId,
      });
    }

    redirect(createTransferRedirect(managerSeasonId, "mandatorySuccess"));
  }

  await submitNormalTransferPlan(formData);
  redirect(createTransferRedirect(managerSeasonId, "normalSuccess"));
}

function parseMandatoryTransferCompletions(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  const parsed: unknown = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    throw new Error("Pflichttransfer-Abgabe ist ungültig.");
  }

  return parsed.map((item) => {
    if (
      typeof item !== "object"
      || item === null
      || typeof (item as { mandatoryTransferId?: unknown }).mandatoryTransferId !== "string"
      || typeof (item as { incomingPlayerId?: unknown }).incomingPlayerId !== "string"
    ) {
      throw new Error("Pflichttransfer-Abgabe enthält ungültige Einträge.");
    }

    return {
      mandatoryTransferId: (item as { mandatoryTransferId: string }).mandatoryTransferId,
      incomingPlayerId: (item as { incomingPlayerId: string }).incomingPlayerId,
    };
  });
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function createTransferRedirect(
  managerSeasonId: string | undefined,
  statusParam: "mandatorySuccess" | "normalSuccess",
) {
  const params = new URLSearchParams({ [statusParam]: "1" });

  if (managerSeasonId) {
    params.set("managerSeasonId", managerSeasonId);
  }

  return `/team/transfers?${params.toString()}`;
}
