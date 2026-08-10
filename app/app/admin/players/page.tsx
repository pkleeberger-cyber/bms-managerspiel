import {
  createPlayerMasterDraftChange,
  loadPlayerMasterOperationsSnapshot,
  releasePlayerMasterDraftBatch,
  voidPlayerMasterDraftChange,
} from "@/application/player-master-change-service";
import { loadPlayerMaster } from "@/application/player-service";
import {
  closeTransferPeriod,
  loadTransferPeriodAdminSnapshot,
  openTransferPeriod,
} from "@/application/transfer-period-service";

import { PlayerMasterClient } from "./player-master-client";

export const dynamic = "force-dynamic";

export default async function PlayerMasterPage() {
  const [snapshot, operations, transferPeriod] = await Promise.all([
    loadPlayerMaster(),
    loadPlayerMasterOperationsSnapshot(),
    loadTransferPeriodAdminSnapshot(),
  ]);
  const activePlayers = snapshot.players.filter(
    (player) => player.status === "ACTIVE",
  ).length;
  const departures = snapshot.players.filter(
    (player) => player.status === "LEFT_BUNDESLIGA",
  ).length;

  return (
    <main className="player-master">
      <section className="player-master-hero" aria-labelledby="player-master-hero">
        <div>
          <span className="matchday-ops-eyebrow">Player Master</span>
          <h1 id="player-master-hero">Bundesliga-Spieler</h1>
        </div>
        <div className="player-master-hero-grid">
          <article>
            <span>Spieler</span>
            <strong>{snapshot.importedPlayers}</strong>
            <small>{snapshot.currentSeason}</small>
          </article>
          <article>
            <span>Aktiv</span>
            <strong>{activePlayers}</strong>
            <small>Im Spielerpool</small>
          </article>
          <article>
            <span>Abgänge</span>
            <strong>{departures}</strong>
            <small>Bundesliga verlassen</small>
          </article>
          <article>
            <span>Drafts</span>
            <strong>{operations.draftChanges.length}</strong>
            <small>Offene Änderungen</small>
          </article>
        </div>
      </section>

      {snapshot.databaseStatus === "UNAVAILABLE" ? (
        <section className="player-master-warning">
          <strong>Prisma nicht verfügbar.</strong>
          <span>
            Der Player Master rendert ohne Fixture-Fallback. Sobald Player-Daten
            in Prisma verfügbar sind, erscheinen sie hier automatisch.
          </span>
        </section>
      ) : null}

      <PlayerMasterClient
        closeTransferPeriodAction={closeTransferPeriodAction}
        createDraftChangeAction={createDraftChangeAction}
        openTransferPeriodAction={openTransferPeriodAction}
        operations={operations}
        releaseDraftBatchAction={releaseDraftBatchAction}
        snapshot={snapshot}
        transferPeriod={{
          activePhase: transferPeriod.activePhase,
          phases: transferPeriod.phases,
          status: transferPeriod.status,
        }}
        voidDraftChangeAction={voidDraftChangeAction}
      />
    </main>
  );
}

async function createDraftChangeAction(formData: FormData) {
  "use server";

  await createPlayerMasterDraftChange(formData);
}

async function voidDraftChangeAction(formData: FormData) {
  "use server";

  await voidPlayerMasterDraftChange(formData);
}

async function releaseDraftBatchAction(formData: FormData) {
  "use server";

  await releasePlayerMasterDraftBatch(formData);
}

async function openTransferPeriodAction(formData: FormData) {
  "use server";

  await openTransferPeriod(formData);
}

async function closeTransferPeriodAction() {
  "use server";

  await closeTransferPeriod();
}
