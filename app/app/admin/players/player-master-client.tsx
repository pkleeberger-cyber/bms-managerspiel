"use client";

import { useMemo, useState } from "react";

import type { PlayerMasterSnapshot } from "@/application/player-service";
import type { PlayerMasterCard } from "@/application/player-service";
import type { PlayerMasterOperationsSnapshot } from "@/application/player-master-change-service";
import type { PlayerPositionGroup } from "@/infrastructure";

type PlayerMasterTab = "overview" | "changes" | "impact" | "history";

type TransferPeriodControls = {
  activePhase: "SUMMER" | "WINTER" | null;
  phases: readonly {
    phase: "SUMMER" | "WINTER";
    status: "CLOSED" | "OPEN";
  }[];
  status: "CLOSED" | "OPEN";
};

const positionLabels = {
  TW: "Torwart",
  AB: "Abwehr",
  MF: "Mittelfeld",
  ST: "Sturm",
} as const satisfies Record<PlayerPositionGroup, string>;

const statusLabels = {
  ACTIVE: "Aktiv",
  LEFT_BUNDESLIGA: "Bundesliga verlassen",
  INACTIVE: "Inaktiv",
} as const;

export function PlayerMasterClient({
  closeTransferPeriodAction,
  createDraftChangeAction,
  openTransferPeriodAction,
  operations,
  releaseDraftBatchAction,
  snapshot,
  transferPeriod,
  voidDraftChangeAction,
}: {
  closeTransferPeriodAction: () => void | Promise<void>;
  createDraftChangeAction: (formData: FormData) => void | Promise<void>;
  openTransferPeriodAction: (formData: FormData) => void | Promise<void>;
  operations: PlayerMasterOperationsSnapshot;
  releaseDraftBatchAction: (formData: FormData) => void | Promise<void>;
  snapshot: PlayerMasterSnapshot;
  transferPeriod: TransferPeriodControls;
  voidDraftChangeAction: (formData: FormData) => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<PlayerMasterTab>("overview");
  const [search, setSearch] = useState("");
  const [club, setClub] = useState("ALL");
  const [position, setPosition] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [selectedChangeId, setSelectedChangeId] = useState(
    operations.draftChanges[0]?.id ?? "",
  );

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return snapshot.players.filter((player) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        player.displayName.toLowerCase().includes(normalizedSearch) ||
        player.bundesligaClub.toLowerCase().includes(normalizedSearch);
      const matchesClub = club === "ALL" || player.bundesligaClub === club;
      const matchesPosition =
        position === "ALL" || player.positionGroup === position;
      const matchesStatus = status === "ALL" || player.status === status;

      return matchesSearch && matchesClub && matchesPosition && matchesStatus;
    });
  }, [club, position, search, snapshot.players, status]);

  const selectedChange =
    operations.draftChanges.find((change) => change.id === selectedChangeId) ??
    operations.draftChanges[0] ??
    null;

  return (
    <section className="player-maintenance-workspace">
      <nav className="player-office-tabs" aria-label="Player Master Tabs">
        <button
          className={activeTab === "overview" ? "active" : undefined}
          onClick={() => setActiveTab("overview")}
          type="button"
        >
          Übersicht
        </button>
        <button
          className={activeTab === "changes" ? "active" : undefined}
          onClick={() => setActiveTab("changes")}
          type="button"
        >
          Änderungen
        </button>
        <button
          className={activeTab === "impact" ? "active" : undefined}
          onClick={() => setActiveTab("impact")}
          type="button"
        >
          Auswirkungen
        </button>
        <button
          className={activeTab === "history" ? "active" : undefined}
          onClick={() => setActiveTab("history")}
          type="button"
        >
          Historie
        </button>
      </nav>

      {activeTab === "overview" ? (
        <section className="player-office-panel" aria-label="Spielerübersicht">
          <PlayerFilters
            club={club}
            clubs={snapshot.clubs}
            position={position}
            positionGroups={snapshot.positionGroups}
            search={search}
            setClub={setClub}
            setPosition={setPosition}
            setSearch={setSearch}
            setStatus={setStatus}
            status={status}
            statuses={snapshot.statuses}
          />
          <PlayerMaintenanceTable
            createDraftChangeAction={createDraftChangeAction}
            players={filteredPlayers}
          />
        </section>
      ) : null}

      {activeTab === "changes" ? (
        <section className="player-office-panel" aria-label="Offene Änderungen">
          <TransferPeriodControl
            closeTransferPeriodAction={closeTransferPeriodAction}
            openTransferPeriodAction={openTransferPeriodAction}
            transferPeriod={transferPeriod}
          />
          <DraftChangesPanel
            operations={operations}
            releaseDraftBatchAction={releaseDraftBatchAction}
            selectedChangeId={selectedChange?.id ?? ""}
            setSelectedChangeId={setSelectedChangeId}
            voidDraftChangeAction={voidDraftChangeAction}
          />
        </section>
      ) : null}

      {activeTab === "impact" ? (
        <section className="player-office-panel" aria-label="Auswirkungen">
          <ImpactPanel
            changes={operations.draftChanges}
            selectedChange={selectedChange}
            selectedChangeId={selectedChange?.id ?? ""}
            setSelectedChangeId={setSelectedChangeId}
          />
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="player-office-panel" aria-label="Änderungshistorie">
          <HistoryPanel />
        </section>
      ) : null}
    </section>
  );
}

function PlayerFilters({
  club,
  clubs,
  position,
  positionGroups,
  search,
  setClub,
  setPosition,
  setSearch,
  setStatus,
  status,
  statuses,
}: {
  club: string;
  clubs: readonly string[];
  position: string;
  positionGroups: readonly PlayerPositionGroup[];
  search: string;
  setClub: (value: string) => void;
  setPosition: (value: string) => void;
  setSearch: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
  statuses: readonly PlayerMasterCard["status"][];
}) {
  return (
    <section className="player-master-filter-card" aria-label="Spielerfilter">
      <label>
        <span>Suche</span>
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Spieler oder Club"
          type="search"
          value={search}
        />
      </label>
      <label>
        <span>Verein</span>
        <select onChange={(event) => setClub(event.target.value)} value={club}>
          <option value="ALL">Alle Vereine</option>
          {clubs.map((clubName) => (
            <option key={clubName} value={clubName}>
              {clubName}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Position</span>
        <select
          onChange={(event) => setPosition(event.target.value)}
          value={position}
        >
          <option value="ALL">Alle Positionen</option>
          {positionGroups.map((positionGroup) => (
            <option key={positionGroup} value={positionGroup}>
              {positionLabels[positionGroup]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option value="ALL">Alle Status</option>
          {statuses.map((playerStatus) => (
            <option key={playerStatus} value={playerStatus}>
              {statusLabels[playerStatus]}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function PlayerMaintenanceTable({
  createDraftChangeAction,
  players,
}: {
  createDraftChangeAction: (formData: FormData) => void | Promise<void>;
  players: readonly PlayerMasterCard[];
}) {
  if (players.length === 0) {
    return (
      <div className="player-master-empty">
        Keine Spieler für diese Filterkombination.
      </div>
    );
  }

  return (
    <div className="player-maintenance-table">
      <div className="player-maintenance-row head" aria-hidden="true">
        <span>Status</span>
        <span>Spieler</span>
        <span>Verein</span>
        <span>Position</span>
        <span>Marktwert</span>
        <span>Manager</span>
        <span>Offen</span>
        <span>Aktion</span>
      </div>
      {players.map((player) => (
        <PlayerMaintenanceRow
          createDraftChangeAction={createDraftChangeAction}
          key={player.id}
          player={player}
        />
      ))}
    </div>
  );
}

function PlayerMaintenanceRow({
  createDraftChangeAction,
  player,
}: {
  createDraftChangeAction: (formData: FormData) => void | Promise<void>;
  player: PlayerMasterCard;
}) {
  const [action, setAction] = useState("STATUS_CHANGE");

  return (
    <details className={`player-maintenance-entry ${player.status.toLowerCase()}`}>
      <summary className="player-maintenance-row">
        <span className={`player-status-pill ${player.status.toLowerCase()}`}>
          {statusLabels[player.status]}
        </span>
        <strong>{player.displayName}</strong>
        <span>{player.bundesligaClub}</span>
        <span>{positionLabels[player.positionGroup]}</span>
        <span>{formatMarketValue(player.marketValue)}</span>
        <span>{player.managersUnderContract}</span>
        <span>{player.hasOpenChange ? player.openChangeLabel : "—"}</span>
        <b>Bearbeiten</b>
      </summary>
      <form action={createDraftChangeAction} className="player-inline-action-form">
        <input name="playerId" type="hidden" value={player.id} />
        <label>
          <span>Aktion</span>
          <select
            name="type"
            onChange={(event) => setAction(event.target.value)}
            value={action}
          >
            <option value="STATUS_CHANGE">Status ändern</option>
            <option value="CLUB_CHANGE">Verein ändern</option>
            <option value="MARKET_VALUE_CHANGE">Marktwert ändern</option>
          </select>
        </label>
        {action === "STATUS_CHANGE" ? (
          <label>
            <span>Status</span>
            <select name="newStatus" defaultValue="LEFT_BUNDESLIGA">
              <option value="ACTIVE">Aktiv</option>
              <option value="LEFT_BUNDESLIGA">Abgang</option>
              <option value="INACTIVE">Inaktiv</option>
            </select>
          </label>
        ) : null}
        {action === "CLUB_CHANGE" ? (
          <label>
            <span>Neuer Verein</span>
            <input
              name="newClub"
              placeholder={player.bundesligaClub}
              type="text"
            />
          </label>
        ) : null}
        {action === "MARKET_VALUE_CHANGE" ? (
          <label>
            <span>Marktwert</span>
            <input
              name="newMarketValue"
              placeholder={String(player.marketValue)}
              step="0.1"
              type="number"
            />
          </label>
        ) : null}
        <label className="player-action-reason">
          <span>Grund</span>
          <input name="reason" placeholder="Begründung" required type="text" />
        </label>
        <button type="submit">Als Draft speichern</button>
      </form>
    </details>
  );
}

function TransferPeriodControl({
  closeTransferPeriodAction,
  openTransferPeriodAction,
  transferPeriod,
}: {
  closeTransferPeriodAction: () => void | Promise<void>;
  openTransferPeriodAction: (formData: FormData) => void | Promise<void>;
  transferPeriod: TransferPeriodControls;
}) {
  return (
    <details className="player-transfer-control">
      <summary>
        <span>Transferfenster</span>
        <strong>
          {transferPeriod.activePhase
            ? `${formatTransferPhase(transferPeriod.activePhase)} offen`
            : "Geschlossen"}
        </strong>
      </summary>
      <div>
        <div className="player-change-impact">
          {transferPeriod.phases.map((phase) => (
            <span key={phase.phase}>
              {formatTransferPhase(phase.phase)}:{" "}
              {phase.status === "OPEN" ? "offen" : "geschlossen"}
            </span>
          ))}
        </div>
        <div className="player-release-form compact">
          <form action={openTransferPeriodAction}>
            <input name="phase" type="hidden" value="SUMMER" />
            <button
              className={transferPeriod.activePhase === "SUMMER" ? "primary" : undefined}
              disabled={transferPeriod.activePhase === "SUMMER"}
              type="submit"
            >
              Sommer öffnen
            </button>
          </form>
          <form action={openTransferPeriodAction}>
            <input name="phase" type="hidden" value="WINTER" />
            <button
              className={transferPeriod.activePhase === "WINTER" ? "primary" : undefined}
              disabled={transferPeriod.activePhase === "WINTER"}
              type="submit"
            >
              Winter öffnen
            </button>
          </form>
          <form action={closeTransferPeriodAction}>
            <button disabled={transferPeriod.status !== "OPEN"} type="submit">
              Schließen
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}

function DraftChangesPanel({
  operations,
  releaseDraftBatchAction,
  selectedChangeId,
  setSelectedChangeId,
  voidDraftChangeAction,
}: {
  operations: PlayerMasterOperationsSnapshot;
  releaseDraftBatchAction: (formData: FormData) => void | Promise<void>;
  selectedChangeId: string;
  setSelectedChangeId: (value: string) => void;
  voidDraftChangeAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="player-draft-workspace">
      <form action={releaseDraftBatchAction} className="player-release-form">
        <input name="batchId" type="hidden" value={operations.batch.id} />
        <label>
          <span>Freigabenotiz</span>
          <input
            name="note"
            placeholder={`Wirksam ab ST ${operations.estimatedEffectiveFromMatchday}`}
            type="text"
          />
        </label>
        <button
          className="primary"
          disabled={operations.draftChanges.length === 0}
          type="submit"
        >
          Änderungen freigeben
        </button>
      </form>

      <div className="player-draft-table">
        <div className="player-draft-row head" aria-hidden="true">
          <span>Spieler</span>
          <span>Typ</span>
          <span>Alt</span>
          <span>Neu</span>
          <span>Manager</span>
          <span>Aktion</span>
        </div>
        {operations.draftChanges.length === 0 ? (
          <div className="player-master-empty">Keine offene Änderung.</div>
        ) : operations.draftChanges.map((change) => (
          <article
            className={selectedChangeId === change.id ? "selected" : undefined}
            key={change.id}
          >
            <button onClick={() => setSelectedChangeId(change.id)} type="button">
              {change.playerName}
            </button>
            <span>{formatChangeType(change.type)}</span>
            <span>{change.oldValue}</span>
            <span>{change.newValue}</span>
            <span>{change.affectedAssignments.length}</span>
            <form action={voidDraftChangeAction}>
              <input name="changeId" type="hidden" value={change.id} />
              <button type="submit">Verwerfen</button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}

function ImpactPanel({
  changes,
  selectedChange,
  selectedChangeId,
  setSelectedChangeId,
}: {
  changes: PlayerMasterOperationsSnapshot["draftChanges"];
  selectedChange: PlayerMasterOperationsSnapshot["draftChanges"][number] | null;
  selectedChangeId: string;
  setSelectedChangeId: (value: string) => void;
}) {
  if (!selectedChange) {
    return (
      <div className="player-master-empty">
        Keine Draft-Änderung für eine Auswirkungsprüfung vorhanden.
      </div>
    );
  }

  return (
    <div className="player-impact-workspace">
      <label className="player-impact-selector">
        <span>Draft auswählen</span>
        <select
          onChange={(event) => setSelectedChangeId(event.target.value)}
          value={selectedChangeId}
        >
          {changes.map((change) => (
            <option key={change.id} value={change.id}>
              {change.playerName} · {formatChangeType(change.type)}
            </option>
          ))}
        </select>
      </label>
      <div className="player-impact-summary">
        <article>
          <span>Betroffene Manager</span>
          <strong>{countUniqueManagers(selectedChange)}</strong>
        </article>
        <article>
          <span>Betroffene Slots</span>
          <strong>{selectedChange.affectedAssignments.length}</strong>
        </article>
        <article>
          <span>Pflichttransfer</span>
          <strong>{selectedChange.type === "STATUS_CHANGE" ? "Prüfen" : "Nein"}</strong>
        </article>
        <article>
          <span>Hinweise</span>
          <strong>{selectedChange.warnings.length}</strong>
        </article>
      </div>
      <div className="player-impact-list">
        {selectedChange.affectedAssignments.length === 0 ? (
          <div className="player-master-empty">
            Keine Manager-Slots betroffen.
          </div>
        ) : selectedChange.affectedAssignments.map((assignment) => (
          <article key={`${assignment.managerSeasonId}-${assignment.slotId}`}>
            <strong>{assignment.managerName}</strong>
            <span>Slot {assignment.slotId}</span>
            <span>{positionLabels[assignment.positionGroup]}</span>
            <span>
              ST {assignment.validFromMatchday} bis{" "}
              {assignment.validToMatchday ?? "offen"}
            </span>
          </article>
        ))}
      </div>
      {selectedChange.warnings.length > 0 ? (
        <div className="player-impact-warning-list">
          {selectedChange.warnings.map((warning) => (
            <article key={`${warning.managerSeasonId}-${warning.message}`}>
              <strong>{warning.managerName}</strong>
              <span>{warning.message}</span>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HistoryPanel() {
  return (
    <div className="player-history-panel">
      <div className="player-master-filter-card compact">
        <label>
          <span>Filter</span>
          <input disabled placeholder="Freigegebene Änderung suchen" type="search" />
        </label>
        <label>
          <span>Status</span>
          <select disabled>
            <option>Released</option>
          </select>
        </label>
      </div>
      <div className="player-master-empty">
        Freigegebene Player-Master-Historie ist im aktuellen Snapshot noch nicht enthalten.
      </div>
    </div>
  );
}

function countUniqueManagers(
  change: PlayerMasterOperationsSnapshot["draftChanges"][number],
) {
  return new Set(
    change.affectedAssignments.map((assignment) => assignment.managerSeasonId),
  ).size;
}

function formatMarketValue(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

function formatChangeType(type: string) {
  if (type === "STATUS_CHANGE") {
    return "Status";
  }

  if (type === "CLUB_CHANGE") {
    return "Verein";
  }

  if (type === "MARKET_VALUE_CHANGE") {
    return "Marktwert";
  }

  return "Position";
}

function formatTransferPhase(phase: "SUMMER" | "WINTER") {
  return phase === "SUMMER" ? "Sommertransfer" : "Wintertransfer";
}
