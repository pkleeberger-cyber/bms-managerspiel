"use client";

import { useMemo, useState } from "react";

import type { TransferMarketSnapshot } from "@/application/player-service";
import type { TeamOverviewSnapshot } from "@/application/team-service";

type Position = "TW" | "AB" | "MF" | "ST";
type WorkflowKind = "mandatory" | "free";
type TransferMode = "CLOSED" | "SUMMER_OPEN" | "WINTER_OPEN" | "MANDATORY_OPEN";
type WorkflowStep =
  | "start"
  | "mandatory-list"
  | "own-player"
  | "replacement"
  | "success"
  | "summary"
  | "squad";

type Player = {
  id: string;
  name: string;
  club: string;
  position: Position;
  slotId?: number;
  role?: "Stamm" | "Ersatz";
  marketValue: string;
  marketValueNumber: number;
  reason?: string;
  mandatoryTransferId?: string;
  effectiveFromMatchday?: number;
  status?: TransferMarketSnapshot["players"][number]["status"];
};

type MandatoryTransferInput = {
  id: string;
  outgoingPlayerId: string;
  outgoingPlayerName: string;
  club: string;
  positionGroup: Position;
  slotId: number;
  effectiveFromMatchday: number;
  reason: string;
};

type DraftTransfer = {
  id: string;
  kind: WorkflowKind;
  outgoing: Player;
  incoming: Player;
};

const positionLabels: Record<Position, string> = {
  TW: "Torwart",
  AB: "Abwehr",
  MF: "Mittelfeld",
  ST: "Sturm",
};

const freeTransferLimit = 4;
const positions: Position[] = ["TW", "AB", "MF", "ST"];
const requiredPositionCounts: Record<Position, number> = {
  TW: 2,
  AB: 5,
  MF: 7,
  ST: 4,
};
const maxPlayersPerClub = 3;
const positionSlots: Record<Position, number[]> = {
  TW: [1, 2],
  AB: [3, 4, 5, 6, 7],
  MF: [8, 9, 10, 11, 12, 13, 14],
  ST: [15, 16, 17, 18],
};
const backupSlots = new Set([2, 6, 7, 13, 14, 17, 18]);

function parseMillions(value: string | null) {
  if (!value) {
    return 0;
  }

  return Number.parseFloat(value.replace(",", "."));
}

function formatMillions(value: number, sign = false) {
  const prefix = sign && value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} Mio. €`;
}

function PlayerAvatar({ player }: { player: Player }) {
  return (
    <span className="guided-player-avatar" aria-hidden="true">
      {player.name
        .split(" ")
        .map((part) => part[0])
        .join("")}
    </span>
  );
}

function PlayerFacts({ player }: { player: Player }) {
  return (
    <div className="guided-player-facts">
      <span>Marktwert <strong>{player.marketValue}</strong></span>
      <span>
        Kaufpreis{" "}
        <strong>Später berechnet</strong>
      </span>
    </div>
  );
}

export function GuidedTransferWorkspace({
  mandatoryTransfers,
  snapshot,
  submitTransfersAction,
  transferMarket,
  transferMode,
}: {
  mandatoryTransfers?: readonly MandatoryTransferInput[];
  snapshot: TeamOverviewSnapshot;
  submitTransfersAction?: (formData: FormData) => void | Promise<void>;
  transferMarket: TransferMarketSnapshot;
  transferMode: TransferMode;
}) {
  const ownSquad = useMemo(() => mapSnapshotSquadToPlayers(snapshot), [snapshot]);
  const mandatoryPlayers = useMemo(
    () => mapMandatoryTransfersToPlayers(mandatoryTransfers ?? [], ownSquad),
    [mandatoryTransfers, ownSquad],
  );
  const marketPlayers = useMemo(
    () => mapTransferMarketPlayers(transferMarket),
    [transferMarket],
  );
  const startingBudget = snapshot.manager.budget ?? 0;
  const isMandatoryMode = transferMode === "MANDATORY_OPEN";
  const normalTransferOpen = transferMode === "SUMMER_OPEN" || transferMode === "WINTER_OPEN";
  const transferLimit = isMandatoryMode ? mandatoryPlayers.length : freeTransferLimit;
  const hasMandatorySource = mandatoryPlayers.length > 0;
  const hasMarketSource = marketPlayers.length > 0;
  const positionMarketValues = useMemo(
    () => createPositionMarketValues(ownSquad),
    [ownSquad],
  );
  const [step, setStep] = useState<WorkflowStep>("start");
  const [workflowKind, setWorkflowKind] = useState<WorkflowKind | null>(null);
  const [outgoingPlayer, setOutgoingPlayer] = useState<Player | null>(null);
  const [selectedReplacement, setSelectedReplacement] = useState<Player | null>(null);
  const [completedMandatoryIds, setCompletedMandatoryIds] = useState<Set<string>>(
    new Set(),
  );
  const [draftTransfers, setDraftTransfers] = useState<DraftTransfer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("market");
  const [playerOrder, setPlayerOrder] = useState<Record<Position, string[]>>({
    TW: ownSquad.filter((player) => player.position === "TW").map((player) => player.id),
    AB: ownSquad.filter((player) => player.position === "AB").map((player) => player.id),
    MF: ownSquad.filter((player) => player.position === "MF").map((player) => player.id),
    ST: ownSquad.filter((player) => player.position === "ST").map((player) => player.id),
  });

  const openMandatoryPlayers = mandatoryPlayers.filter(
    (player) => !completedMandatoryIds.has(player.id),
  );
  const soldPlayerIds = new Set(
    draftTransfers.map((transfer) => transfer.outgoing.id),
  );
  const availableOwnSquad = ownSquad.filter(
    (player) => !soldPlayerIds.has(player.id),
  );
  const finalSquad = [...mandatoryPlayers, ...ownSquad]
    .filter((player) => (
      !soldPlayerIds.has(player.id)
      && !openMandatoryPlayers.some((openPlayer) => openPlayer.id === player.id)
    ))
    .concat(draftTransfers.map((transfer) => transfer.incoming));
  const filteredMarketPlayers = useMemo(() => {
    if (!outgoingPlayer) {
      return [];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const selectedIncomingPlayerIds = new Set(
      draftTransfers
        .map((transfer) => transfer.incoming.id)
        .filter((playerId) => playerId !== selectedReplacement?.id),
    );
    const resultingSquadPlayerIds = new Set(
      finalSquad
        .map((player) => player.id)
        .filter((playerId) => playerId !== selectedReplacement?.id),
    );

    return marketPlayers
      .filter((player) => (
        player.position === outgoingPlayer.position
        && !selectedIncomingPlayerIds.has(player.id)
        && !resultingSquadPlayerIds.has(player.id)
        && (
          normalizedSearch === ""
          || player.name.toLowerCase().includes(normalizedSearch)
          || player.club.toLowerCase().includes(normalizedSearch)
        )
      ))
      .sort((first, second) => (
        sortOrder === "alphabetical"
          ? first.name.localeCompare(second.name, "de")
          : second.marketValueNumber - first.marketValueNumber
      ));
  }, [
    draftTransfers,
    finalSquad,
    marketPlayers,
    outgoingPlayer,
    searchTerm,
    selectedReplacement,
    sortOrder,
  ]);
  const latestTransfer = draftTransfers.at(-1) ?? null;
  const mandatoryComplete = openMandatoryPlayers.length === 0;
  const plannedSales = draftTransfers.reduce(
    (total, transfer) => total + parseMillions(transfer.outgoing.marketValue),
    0,
  );
  const plannedPurchases = draftTransfers.reduce(
    (total, transfer) => total + transfer.incoming.marketValueNumber,
    0,
  );
  const remainingBudget = startingBudget + plannedSales - plannedPurchases;
  const transferLimitValid = draftTransfers.length <= transferLimit;
  const squadCountValid = finalSquad.length === 18;
  const positionStructureValid = positions.every((position) => (
    finalSquad.filter((player) => player.position === position).length
    === requiredPositionCounts[position]
  ));
  const finalSquadIds = finalSquad.map((player) => player.id);
  const duplicatePlayersValid = new Set(finalSquadIds).size === finalSquadIds.length;
  const duplicatePlayers = getDuplicatePlayers(finalSquad);
  const clubLimitViolations = getClubLimitViolations(finalSquad);
  const clubLimitValid = clubLimitViolations.length === 0;
  const budgetValid = remainingBudget >= 0;
  const normalPlanHasTransfers = draftTransfers.some(
    (transfer) => transfer.kind === "free",
  );
  const submitBlockers = createSubmitBlockers({
    budgetValid,
    clubLimitViolations,
    duplicatePlayers,
    isMandatoryMode,
    mandatoryComplete,
    normalPlanHasTransfers,
    normalTransferOpen,
    openMandatoryPlayers,
    positionStructureValid,
  });
  const hasValidationError = isMandatoryMode
    ? !budgetValid || !duplicatePlayersValid || !mandatoryComplete
    : !normalTransferOpen
      || !normalPlanHasTransfers
      || !budgetValid
      || !transferLimitValid
      || !clubLimitValid
      || !duplicatePlayersValid
      || !squadCountValid
      || !positionStructureValid;
  const isDraftValid = !hasValidationError && mandatoryComplete;
  const mandatoryTransferSubmissionJson = JSON.stringify(
    draftTransfers
      .filter((transfer) => (
        transfer.kind === "mandatory"
        && typeof transfer.outgoing.mandatoryTransferId === "string"
      ))
      .map((transfer) => ({
        mandatoryTransferId: transfer.outgoing.mandatoryTransferId,
        incomingPlayerId: transfer.incoming.id,
      })),
  );
  const transferPlanJson = JSON.stringify(
    draftTransfers.map((transfer) => ({
      kind: transfer.kind,
      outgoingPlayerId: transfer.outgoing.id,
      incomingPlayerId: transfer.incoming.id,
      slotId: transfer.outgoing.slotId ?? null,
    })),
  );
  const budgetJson = JSON.stringify({
    startingBudget,
    plannedSales,
    plannedPurchases,
    remainingBudget,
  });
  const planStatus = isDraftValid
    ? "Entwurf gültig"
    : hasValidationError
      ? "Entwurf fehlerhaft"
      : "Entwurf unvollständig";
  const planStatusTone = isDraftValid
    ? "positive"
    : hasValidationError
      ? "negative"
      : "warning";
  const transferLimitReached = draftTransfers.length >= transferLimit;
  const freeTransfersUsed = draftTransfers.filter(
    (transfer) => transfer.kind === "free",
  ).length;
  const freeTransferLimitReached = freeTransfersUsed >= freeTransferLimit;
  const wizardStepIndex = step === "start"
    ? 0
    : ["mandatory-list", "own-player", "replacement", "success"].includes(step)
      ? 1
      : step === "summary"
        ? 2
        : 3;
  const marketClosedWithoutMandatory = transferMode === "CLOSED" && !isMandatoryMode;
  const focusedMandatoryPlayer = openMandatoryPlayers[0] ?? mandatoryPlayers[0] ?? null;

  function beginWorkflow(kind: WorkflowKind) {
    if (
      transferLimitReached
      || (kind === "free" && freeTransferLimitReached)
      || (kind === "free" && !normalTransferOpen)
      || (kind === "free" && isMandatoryMode)
      || (kind === "mandatory" && !hasMandatorySource)
    ) {
      return;
    }

    setWorkflowKind(kind);
    setOutgoingPlayer(null);
    setSelectedReplacement(null);
    setSearchTerm("");
    setStep(kind === "mandatory" ? "mandatory-list" : "own-player");
  }

  function selectOutgoing(player: Player) {
    setOutgoingPlayer(player);
    setSelectedReplacement(null);
    setSearchTerm("");
    setStep("replacement");
  }

  function confirmTransfer() {
    if (
      transferLimitReached
      || (workflowKind === "free" && freeTransferLimitReached)
      || (workflowKind === "free" && !normalTransferOpen)
      || !workflowKind
      || !outgoingPlayer
      || !selectedReplacement
      || finalSquad.some((player) => player.id === selectedReplacement.id)
    ) {
      return;
    }

    const transfer: DraftTransfer = {
      id: `${workflowKind}-${outgoingPlayer.id}-${selectedReplacement.id}`,
      kind: workflowKind,
      outgoing: outgoingPlayer,
      incoming: selectedReplacement,
    };

    setDraftTransfers((current) => [...current, transfer]);

    if (workflowKind === "mandatory") {
      setCompletedMandatoryIds((current) => (
        new Set(current).add(outgoingPlayer.id)
      ));
    }

    setStep("success");
  }

  function undoLatestTransfer() {
    if (!latestTransfer) {
      return;
    }

    setDraftTransfers((current) => current.slice(0, -1));

    if (latestTransfer.kind === "mandatory") {
      setCompletedMandatoryIds((current) => {
        const next = new Set(current);
        next.delete(latestTransfer.outgoing.id);
        return next;
      });
    }

    setOutgoingPlayer(latestTransfer.outgoing);
    setSelectedReplacement(latestTransfer.incoming);
    setWorkflowKind(latestTransfer.kind);
    setStep("replacement");
  }

  function continueAfterSuccess() {
    setOutgoingPlayer(null);
    setSelectedReplacement(null);

    if (workflowKind === "mandatory" && openMandatoryPlayers.length > 0) {
      setStep("mandatory-list");
      return;
    }

    setWorkflowKind(null);
    setStep("start");
  }

  function planAnotherTransfer() {
    setWorkflowKind(null);
    setOutgoingPlayer(null);
    setSelectedReplacement(null);
    setStep("start");
  }

  function editTransfer(transfer: DraftTransfer) {
    removeTransfer(transfer);
    setWorkflowKind(transfer.kind);
    setOutgoingPlayer(transfer.outgoing);
    setSelectedReplacement(transfer.incoming);
    setStep("replacement");
  }

  function removeTransfer(transfer: DraftTransfer) {
    setDraftTransfers((current) => (
      current.filter((item) => item.id !== transfer.id)
    ));

    if (transfer.kind === "mandatory") {
      setCompletedMandatoryIds((current) => {
        const next = new Set(current);
        next.delete(transfer.outgoing.id);
        return next;
      });
    }
  }

  function movePlayer(
    position: Position,
    orderedPlayers: Player[],
    playerIndex: number,
    direction: -1 | 1,
  ) {
    const targetIndex = playerIndex + direction;

    if (targetIndex < 0 || targetIndex >= orderedPlayers.length) {
      return;
    }

    const nextOrder = orderedPlayers.map((player) => player.id);
    [nextOrder[playerIndex], nextOrder[targetIndex]] = [
      nextOrder[targetIndex],
      nextOrder[playerIndex],
    ];
    setPlayerOrder((current) => ({ ...current, [position]: nextOrder }));
  }

  return (
    <div className="guided-transfer-workspace">
      <main className="guided-transfer-main">
        <header className="guided-workspace-heading">
          <div>
            <span>Mein Team / Transfers</span>
            <h1>Transferassistent</h1>
            <p>{snapshot.manager.displayName} · {snapshot.season.name}</p>
          </div>
          <div className="guided-workspace-phase">
            <i aria-hidden="true" />
            <div>
              <strong>{snapshot.manager.transferStatus}</strong>
              <span>{formatTransferMode(transferMode)}</span>
            </div>
          </div>
        </header>

        {marketClosedWithoutMandatory ? (
          <section className="guided-closed-market-card">
            <div>
              <span>Transfermarkt geschlossen</span>
              <h2>Der Transfermarkt ist aktuell geschlossen.</h2>
              <p>
                Normale Transfers können nicht verbindlich abgegeben werden.
                Sobald die Spielleitung eine Sommer- oder Winterphase öffnet,
                erscheint hier wieder der normale Transferablauf.
              </p>
            </div>
            <button disabled type="button">Keine Abgabe möglich</button>
          </section>
        ) : null}

        {isMandatoryMode && focusedMandatoryPlayer ? (
          <section className="guided-mandatory-hero" aria-label="Pflichttransfer">
            <article>
              <span>Abgang</span>
              <strong>{focusedMandatoryPlayer.name}</strong>
              <small>
                Slot {focusedMandatoryPlayer.slotId ?? "—"} · {positionLabels[focusedMandatoryPlayer.position]}
              </small>
            </article>
            <article>
              <span>Grund</span>
              <strong>{focusedMandatoryPlayer.reason ?? "Bundesliga verlassen"}</strong>
              <small>Ausgehender Spieler ist fixiert.</small>
            </article>
            <article>
              <span>Ersatz</span>
              <strong>{selectedReplacement?.name ?? "Noch offen"}</strong>
              <small>Nur gleiche Position.</small>
            </article>
            <article>
              <span>Fortschritt</span>
              <strong>
                {mandatoryPlayers.length - openMandatoryPlayers.length} von {mandatoryPlayers.length}
              </strong>
              <small>Pflichttransfer</small>
            </article>
          </section>
        ) : null}

        {snapshot.dataSource === "FIXTURE" ? (
          <section className="guided-limit-notice">
            <span>!</span>
            <strong>
              Interner Fallback: Kein Prisma-Kader verfügbar. Die angezeigten
              Spieler sind nicht als Live-Daten zu verstehen.
            </strong>
          </section>
        ) : null}

        {!hasMarketSource ? (
          <section className="guided-limit-notice">
            <span>!</span>
            <strong>
              Kein aktiver Player-Master-Transferpool verfügbar. Der Workspace
              startet nur mit dem echten Kader.
            </strong>
          </section>
        ) : null}

        {transferMarket.activeVersion ? (
          <section className="guided-limit-notice">
            <span>{transferMarket.phase}</span>
            <strong>
              Player Master Version {transferMarket.activeVersion.versionNumber}
              {" · "}
              {transferMarket.hiddenLeftBundesliga
                ? "LEFT_BUNDESLIGA ausgeblendet"
                : "Developer Mode: LEFT_BUNDESLIGA sichtbar"}
            </strong>
          </section>
        ) : null}

        {!marketClosedWithoutMandatory ? (
          <nav className="guided-workflow-navigation" aria-label="Transferablauf">
            {[
              { label: "Transfer starten", target: "start", enabled: true },
              { label: "Transfer planen", target: "start", enabled: true },
              { label: "Transferplan ansehen", target: "summary", enabled: true },
              { label: "Kader prüfen", target: "squad", enabled: true },
              { label: "Validieren", target: "summary", enabled: false },
              { label: "Abgeben", target: "summary", enabled: false },
            ].map((item, index) => (
              <button
                className={
                  index < wizardStepIndex
                    ? "completed"
                    : index === wizardStepIndex
                      ? "active"
                      : "pending"
                }
                disabled={!item.enabled}
                key={`${item.label}-${index}`}
                onClick={() => setStep(item.target as WorkflowStep)}
                type="button"
              >
                <span>{index < wizardStepIndex ? "✓" : index + 1}</span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </nav>
        ) : null}

        {step === "start" && !marketClosedWithoutMandatory ? (
          <section className="guided-task-card guided-start-card">
            <div className="guided-task-heading">
              <span>Transfer starten</span>
              <h2>
                {mandatoryComplete
                  ? "Was möchtest du als Nächstes tun?"
                  : "Was möchtest du tun?"}
              </h2>
              <p className="guided-plan-intro">
                Du baust einen Transferplan. Die verbindliche Abgabe erfolgt
                erst am Ende.
              </p>
              {mandatoryComplete ? (
                <b className="guided-complete-badge">
                  {hasMandatorySource
                    ? "✓ Pflichttransfers abgeschlossen"
                    : "Keine Pflichttransfer-Quelle"}
                </b>
              ) : null}
            </div>
            <div className="guided-action-grid">
              <button
                className="guided-action-card mandatory"
                disabled={mandatoryComplete || !hasMandatorySource}
                onClick={() => beginWorkflow("mandatory")}
                type="button"
              >
                <span className="guided-action-index">01</span>
                <div>
                  <strong>Pflichttransfer durchführen</strong>
                  <p>
                    Ersetzt Spieler, die die Bundesliga verlassen haben.
                  </p>
                </div>
                <b>
                  {hasMandatorySource
                    ? mandatoryComplete
                      ? "Abgeschlossen"
                      : `${openMandatoryPlayers.length} offen`
                    : "Keine Quelle"}
                </b>
              </button>
              {!isMandatoryMode && normalTransferOpen ? (
                <button
                  className={`guided-action-card free ${mandatoryComplete ? "highlighted" : ""}`}
                  disabled={
                    !normalTransferOpen
                    || transferLimitReached
                    || freeTransferLimitReached
                  }
                  onClick={() => beginWorkflow("free")}
                  type="button"
                >
                  <span className="guided-action-index">02</span>
                  <div>
                    <strong>Freien Transfer durchführen</strong>
                    <p>Verkaufsauswahl nutzt deinen echten Kader.</p>
                  </div>
                  <b>
                    {normalTransferOpen
                      ? hasMarketSource ? "Transfer starten →" : "Nur Verkauf auswählbar"
                      : "Der Transfermarkt ist aktuell geschlossen."}
                  </b>
                </button>
              ) : null}
            </div>
            {!isMandatoryMode && transferLimitReached ? (
              <div className="guided-limit-notice">
                <span>!</span>
                <strong>Maximale Transferanzahl erreicht.</strong>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "mandatory-list" ? (
          <section className="guided-task-card">
            <div className="guided-task-heading">
              <button onClick={() => setStep("start")} type="button">← Zurück</button>
              <span>Pflichttransfer · Schritt 1</span>
              <h2>Welchen Spieler möchtest du ersetzen?</h2>
            </div>
            <div className="guided-required-list">
              {openMandatoryPlayers.length === 0 ? (
                <article>
                  <div>
                    <span className="guided-position-badge">Live</span>
                    <strong>Keine Pflichttransfer-Quelle</strong>
                    <small>Es werden keine Dummyspieler angezeigt.</small>
                  </div>
                </article>
              ) : openMandatoryPlayers.map((player) => (
                <article key={player.id}>
                  <PlayerAvatar player={player} />
                  <div>
                    <span className="guided-position-badge">{player.position}</span>
                    <strong>{player.name}</strong>
                    <small>{player.club}</small>
                  </div>
                  <b>{player.name} hat die Bundesliga verlassen.</b>
                  <button onClick={() => selectOutgoing(player)} type="button">
                    Spieler ersetzen
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {step === "own-player" ? (
          <section className="guided-task-card">
            <div className="guided-task-heading">
              <button onClick={() => setStep("start")} type="button">← Zurück</button>
              <span>Freier Transfer · Schritt 1</span>
              <h2>Welchen Spieler möchtest du verkaufen?</h2>
            </div>
            <div className="guided-own-player-grid">
              {availableOwnSquad.length === 0 ? (
                <article>
                  <div>
                    <span className="guided-position-badge">Live</span>
                    <strong>Kein Kader verfügbar</strong>
                    <small>Prisma-Kader fehlt oder ist leer.</small>
                  </div>
                </article>
              ) : availableOwnSquad.map((player) => (
                <article key={player.id}>
                  <PlayerAvatar player={player} />
                  <div>
                    <span className="guided-position-badge">{player.position}</span>
                    <strong>{player.name}</strong>
                    <small>{player.club}</small>
                  </div>
                  <PlayerFacts player={player} />
                  <button onClick={() => selectOutgoing(player)} type="button">
                    Auswählen
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {step === "replacement" && outgoingPlayer ? (
          <section className="guided-task-card guided-replacement-card">
            <div className="guided-task-heading">
              <button
                onClick={() => setStep(
                  workflowKind === "mandatory" ? "mandatory-list" : "own-player",
                )}
                type="button"
              >
                ← Spieler wechseln
              </button>
              <span>
                {workflowKind === "mandatory" ? "Pflichttransfer" : "Freier Transfer"}
                {" · "}Schritt 2
              </span>
              <h2>Passenden Ersatz auswählen</h2>
            </div>

            <div className="guided-replacement-layout">
              <article className="guided-current-player-card">
                <span>Aktueller Spieler</span>
                <div className="guided-player-photo">
                  <PlayerAvatar player={outgoingPlayer} />
                </div>
                <span className="guided-position-badge">
                  {positionLabels[outgoingPlayer.position]} · {outgoingPlayer.position}
                </span>
                <h3>{outgoingPlayer.name}</h3>
                <p>{outgoingPlayer.club}</p>
                <PlayerFacts player={outgoingPlayer} />
                <div className="guided-reason">
                  <span>Grund</span>
                  <strong>{outgoingPlayer.reason ?? "Freier Transfer"}</strong>
                </div>
              </article>

              <div className="guided-market-card">
                <header>
                  <div>
                    <span>Transfermarkt</span>
                    <h3>Nur {positionLabels[outgoingPlayer.position]}</h3>
                  </div>
                  <b>Automatisch gefiltert</b>
                </header>
                <div className="guided-market-controls">
                  <input
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Spieler oder Verein suchen"
                    type="search"
                    value={searchTerm}
                  />
                  <select
                    onChange={(event) => setSortOrder(event.target.value)}
                    value={sortOrder}
                  >
                    <option value="market">Marktwert</option>
                    <option value="alphabetical">Alphabetisch</option>
                  </select>
                </div>
                <div className="guided-market-list">
                  {filteredMarketPlayers.map((player) => {
                    const isSelected = selectedReplacement?.id === player.id;

                    return (
                      <button
                        className={isSelected ? "selected" : undefined}
                        key={player.id}
                        onClick={() => setSelectedReplacement(player)}
                        type="button"
                      >
                        <PlayerAvatar player={player} />
                        <div>
                          <strong>{player.name}</strong>
                          <small>{player.club}</small>
                        </div>
                        <span>{player.marketValue}</span>
                        <b>{isSelected ? "Ausgewählt" : "Auswählen"}</b>
                      </button>
                    );
                  })}
                  {filteredMarketPlayers.length === 0 ? (
                    <div className="guided-empty-selection">
                      <span>!</span>
                      <p>
                        Keine Live-Quelle für Ersatzspieler. Deshalb werden
                        hier keine Platzhalter-Kandidaten angezeigt.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="guided-comparison-card">
                <span>Vergleich</span>
                <h3>Auswahl prüfen</h3>
                {selectedReplacement ? (
                  <>
                    <div className="guided-comparison-player">
                      <PlayerAvatar player={selectedReplacement} />
                      <div>
                        <strong>{selectedReplacement.name}</strong>
                        <small>{selectedReplacement.club}</small>
                      </div>
                      <b>Ausgewählt</b>
                    </div>
                    <dl>
                      <div>
                        <dt>Budgetwirkung</dt>
                        <dd>
                          {formatMillions(
                            parseMillions(outgoingPlayer.marketValue)
                            - selectedReplacement.marketValueNumber,
                            true,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Transferwirkung</dt>
                        <dd>{workflowKind === "mandatory" ? "1 Pflichttransfer" : "1 Transfer"}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <div className="guided-empty-selection">
                    <span>+</span>
                    <p>Wähle einen Ersatzspieler aus.</p>
                  </div>
                )}
                <button
                  disabled={
                    !selectedReplacement
                    || transferLimitReached
                    || (workflowKind === "free" && freeTransferLimitReached)
                  }
                  onClick={confirmTransfer}
                  type="button"
                >
                  Zum Transferplan hinzufügen
                </button>
              </aside>
            </div>
          </section>
        ) : null}

        {step === "success" && latestTransfer ? (
          <section className="guided-task-card guided-success-card">
            <div className="guided-success-icon">✓</div>
            <span>Transferplan aktualisiert</span>
            <h2>Transfer zum Plan hinzugefügt.</h2>
            <p>
              {latestTransfer.kind === "mandatory"
                ? `Noch ${openMandatoryPlayers.length} Pflichttransfers offen.`
                : "Der freie Transfer ist jetzt Teil deines Entwurfs."}
            </p>

            <article className="guided-review-card">
              <div>
                <span>Verkauft</span>
                <strong>{latestTransfer.outgoing.name}</strong>
                <small>{latestTransfer.outgoing.club}</small>
              </div>
              <b>↓</b>
              <div className="new">
                <span>Neu geplant</span>
                <strong>{latestTransfer.incoming.name}</strong>
                <small>{latestTransfer.incoming.club}</small>
              </div>
              <dl>
                <div>
                  <dt>Budgetwirkung</dt>
                  <dd>
                    +{latestTransfer.outgoing.marketValue} / −
                    {latestTransfer.incoming.marketValue}
                  </dd>
                </div>
                <div>
                  <dt>Saldo</dt>
                  <dd>
                    {formatMillions(
                      parseMillions(latestTransfer.outgoing.marketValue)
                      - latestTransfer.incoming.marketValueNumber,
                      true,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Transferwirkung</dt>
                  <dd>
                    {latestTransfer.kind === "mandatory"
                      ? "1 Pflichttransfer"
                      : "1 Transfer verwendet"}
                  </dd>
                </div>
              </dl>
            </article>

            <div className="guided-success-actions">
              <button onClick={undoLatestTransfer} type="button">
                Rückgängig machen
              </button>
              {!isMandatoryMode ? (
                <button
                  disabled={transferLimitReached}
                  onClick={planAnotherTransfer}
                  type="button"
                >
                  Weiteren Transfer planen
                </button>
              ) : null}
              {workflowKind === "mandatory" && openMandatoryPlayers.length > 0 ? (
                <button
                  className="primary"
                  disabled={transferLimitReached}
                  onClick={continueAfterSuccess}
                  type="button"
                >
                  Nächsten Pflichttransfer bearbeiten
                </button>
              ) : null}
              <button className="primary" onClick={() => setStep("summary")} type="button">
                Zur Zusammenfassung
              </button>
            </div>
            {!isMandatoryMode && transferLimitReached ? (
              <div className="guided-limit-notice">
                <span>!</span>
                <strong>Maximale Transferanzahl erreicht.</strong>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "summary" ? (
          <section className="guided-task-card guided-plan-summary">
            <div className="guided-task-heading">
              <button onClick={() => setStep("start")} type="button">← Weiter planen</button>
              <span>Transferplan</span>
              <h2>Dein aktueller Plan</h2>
              <p className="guided-plan-intro">
                {isMandatoryMode
                  ? "Prüfe den Pflichttransfer. Er zählt nicht gegen das normale Transferlimit."
                  : "Prüfe alle geplanten Bewegungen. Zwischenstände dürfen unvollständig sein."}
              </p>
            </div>
            <div className="guided-summary-grid">
              <article>
                <span>{isMandatoryMode ? "Pflichttransfer" : "Transfers geplant"}</span>
                <strong>
                  {isMandatoryMode
                    ? `${mandatoryPlayers.length - openMandatoryPlayers.length} von ${mandatoryPlayers.length}`
                    : draftTransfers.length}
                </strong>
                <b>{isMandatoryMode ? "ohne Transferlimit" : `von ${transferLimit}`}</b>
              </article>
              <article>
                <span>Budget verfügbar</span>
                <strong>{formatMillions(remainingBudget)}</strong>
                <b>nach aktuellem Plan</b>
              </article>
              <article>
                <span>Pflichttransfers offen</span>
                <strong>{openMandatoryPlayers.length}</strong>
                <b>von {mandatoryPlayers.length}</b>
              </article>
              <article>
                <span>Entwurfsstatus</span>
                <strong className="status-value">{planStatus}</strong>
                <b>Zwischenstand</b>
              </article>
            </div>
            <div className="guided-summary-transfers">
              {draftTransfers.length === 0 ? (
                <article className="guided-empty-plan-card">
                  <span>01</span>
                  <div>
                    <small>Noch keine Transfers</small>
                    <strong>
                      {isMandatoryMode
                        ? "Beginne mit dem offenen Pflichttransfer."
                        : "Beginne mit einem Pflichttransfer oder einem freien Transfer."}
                    </strong>
                  </div>
                </article>
              ) : draftTransfers.map((transfer) => (
                <article className="guided-transfer-plan-card" key={transfer.id}>
                  <header>
                    <div>
                      <span className="guided-position-badge">{transfer.outgoing.position}</span>
                      <strong>{transfer.kind === "mandatory" ? "Pflichttransfer" : "Freier Transfer"}</strong>
                    </div>
                    <div className="guided-transfer-budget-effect">
                      <span>Budgetwirkung</span>
                      <strong>
                        {formatMillions(
                          parseMillions(transfer.outgoing.marketValue)
                          - transfer.incoming.marketValueNumber,
                          true,
                        )}
                      </strong>
                    </div>
                  </header>
                  <div className="guided-transfer-player-flow">
                    <div className="guided-transfer-player-card outgoing">
                      <PlayerAvatar player={transfer.outgoing} />
                      <div>
                        <small>Abgegeben</small>
                        <strong>{transfer.outgoing.name}</strong>
                        <span>{transfer.outgoing.club}</span>
                      </div>
                      <b>Verkauft</b>
                    </div>
                    <span className="guided-transfer-direction">→</span>
                    <div className="guided-transfer-player-card incoming">
                      <PlayerAvatar player={transfer.incoming} />
                      <div>
                        <small>Neuer Kader</small>
                        <strong>{transfer.incoming.name}</strong>
                        <span>{transfer.incoming.club}</span>
                      </div>
                      <b>Neu</b>
                    </div>
                  </div>
                  <footer>
                    <div>
                      <button onClick={() => editTransfer(transfer)} type="button">Bearbeiten</button>
                      <button onClick={() => removeTransfer(transfer)} type="button">Entfernen</button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
            <div className="guided-submit-card">
              <div>
                <span className={`guided-status-dot ${planStatusTone}`} />
                <div>
                  <strong>{planStatus}</strong>
                  <p>
                    {isMandatoryMode
                      ? "Die verbindliche Abgabe schließt nur offene Pflichttransfers ab."
                      : normalTransferOpen
                        ? "Die verbindliche Abgabe wird erst nach vollständiger Validierung möglich."
                        : "Der Transfermarkt ist aktuell geschlossen."}
                  </p>
                </div>
              </div>
              {submitBlockers.length > 0 ? (
                <SubmitBlockerList blockers={submitBlockers} />
              ) : null}
              <button onClick={() => setStep("squad")} type="button">Kader prüfen</button>
            </div>
          </section>
        ) : null}

        {step === "squad" ? (
          <section className="guided-task-card guided-squad-preview">
            <div className="guided-task-heading">
              <button onClick={() => setStep("summary")} type="button">← Zum Transferplan</button>
              <span>Saisonvorschau</span>
              <h2>Dein Team {snapshot.season.name}</h2>
              <p className="guided-plan-intro">
                So sieht deine Mannschaft nach aktuellem Transferplan aus.
              </p>
            </div>
            <div className="guided-squad-kpi-band">
              <article>
                <span>Kadergröße</span>
                <strong>{finalSquad.length}</strong>
                <b>Spieler</b>
              </article>
              <article>
                <span>Transferplan</span>
                <strong>{draftTransfers.length}</strong>
                <b>Transfers geplant</b>
              </article>
              <article>
                <span>Kaderwert</span>
                <strong>
                  {formatMillions(sumMarketValue(finalSquad)).replace(" Mio. €", "")}
                </strong>
                <b>Mio. €</b>
              </article>
              <article>
                <span>Marktwertentwicklung</span>
                <strong>
                  {formatMillions(
                    sumMarketValue(finalSquad) - snapshot.liveSummary.totalMarketValue,
                    true,
                  ).replace(" Mio. €", "")}
                </strong>
                <b>Mio. €</b>
              </article>
              <article>
                <span>Restbudget</span>
                <strong>{formatMillions(remainingBudget).replace(" Mio. €", "")}</strong>
                <b>Mio. € verfügbar</b>
              </article>
              <article>
                <span>Pflichttransfers</span>
                <strong>{mandatoryComplete ? "✓" : openMandatoryPlayers.length}</strong>
                <b>{mandatoryComplete ? "Erledigt" : "Noch offen"}</b>
              </article>
            </div>
            <div className="guided-order-notice">
              <span>18</span>
              <div>
                <strong>Aufstellung für die neue Saison festlegen</strong>
                <p>
                  Die Reihenfolge deiner Spieler legt fest, wer Stammspieler
                  und wer Ersatzspieler ist. Nach verbindlicher Abgabe kann
                  diese Reihenfolge nicht mehr geändert werden.
                </p>
              </div>
            </div>
            <div className="guided-squad-preview-grid">
              {positions.map((position) => {
                const currentPlayers = [...mandatoryPlayers, ...ownSquad].filter(
                  (player) => player.position === position,
                );
                const activeCurrentPlayers = currentPlayers.filter(
                  (player) => (
                    !soldPlayerIds.has(player.id)
                    && !openMandatoryPlayers.some(
                      (openPlayer) => openPlayer.id === player.id,
                    )
                  ),
                );
                const soldPlayers = currentPlayers.filter(
                  (player) => soldPlayerIds.has(player.id),
                );
                const incomingPlayers = draftTransfers
                  .map((transfer) => transfer.incoming)
                  .filter((player) => player.position === position);
                const activePlayers = [...activeCurrentPlayers, ...incomingPlayers];
                const orderedActivePlayers = [...activePlayers].sort(
                  (first, second) => {
                    const firstIndex = playerOrder[position].indexOf(first.id);
                    const secondIndex = playerOrder[position].indexOf(second.id);

                    return (firstIndex === -1 ? 999 : firstIndex)
                      - (secondIndex === -1 ? 999 : secondIndex);
                  },
                );

                return (
                  <section key={position}>
                    <header>
                      <div>
                        <span>{position}</span>
                        <h3>{positionLabels[position]}</h3>
                      </div>
                      <div className="guided-position-metrics">
                        <span>{activeCurrentPlayers.length + incomingPlayers.length} aktiv</span>
                        <span>{incomingPlayers.length} neu</span>
                        {soldPlayers.length > 0 ? <span>{soldPlayers.length} Abgänge</span> : null}
                        <b>{positionMarketValues[position]}</b>
                      </div>
                    </header>
                    <div className="guided-position-squad-content">
                      <div className="guided-active-squad">
                        <span className="guided-squad-subheading">Neuer Kader</span>
                        {positionSlots[position].map((slotId, slotIndex) => {
                          const player = orderedActivePlayers[slotIndex];
                          const role = backupSlots.has(slotId) ? "Ersatz" : "Stamm";
                          const isNew = player
                            ? incomingPlayers.some((incoming) => incoming.id === player.id)
                            : false;

                          return player ? (
                            <article className={isNew ? "new changed" : undefined} key={slotId}>
                              <span className="guided-slot-number">{slotId}</span>
                              <b className={`guided-role-badge ${role.toLowerCase()}`}>{role}</b>
                              <div>
                                <strong>{player.name}</strong>
                                <span>{player.club}</span>
                              </div>
                              <b className={isNew ? "new" : "current"}>
                                {isNew ? "Neu" : "Bleibt"}
                              </b>
                              <div className="guided-order-controls">
                                <button
                                  aria-label={`${player.name} nach oben`}
                                  disabled={slotIndex === 0}
                                  onClick={() => movePlayer(position, orderedActivePlayers, slotIndex, -1)}
                                  type="button"
                                >
                                  ↑
                                </button>
                                <button
                                  aria-label={`${player.name} nach unten`}
                                  disabled={slotIndex === orderedActivePlayers.length - 1}
                                  onClick={() => movePlayer(position, orderedActivePlayers, slotIndex, 1)}
                                  type="button"
                                >
                                  ↓
                                </button>
                              </div>
                            </article>
                          ) : (
                            <article className="open changed" key={slotId}>
                              <span className="guided-slot-number">{slotId}</span>
                              <b className={`guided-role-badge ${role.toLowerCase()}`}>{role}</b>
                              <div>
                                <strong>Kaderplatz offen</strong>
                                <span>Spieler auswählen</span>
                              </div>
                              <b className="open">Offen</b>
                              <div className="guided-order-controls">
                                <button disabled type="button">↑</button>
                                <button disabled type="button">↓</button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
            {draftTransfers.length > 0 ? (
              <section className="guided-global-departures">
                <header>
                  <div>
                    <span>Transferhistorie</span>
                    <h3>Abgegeben</h3>
                    <p>Diese Spieler verlassen deinen Kader mit dem aktuellen Transferplan.</p>
                  </div>
                  <b>{draftTransfers.length} Spieler</b>
                </header>
                <div>
                  {draftTransfers.map((transfer) => (
                    <article key={transfer.id}>
                      <PlayerAvatar player={transfer.outgoing} />
                      <div>
                        <strong>{transfer.outgoing.name}</strong>
                        <span>{transfer.outgoing.club}</span>
                      </div>
                      <span className="guided-position-badge">{transfer.outgoing.position}</span>
                      <dl>
                        <div>
                          <dt>Verkaufswert</dt>
                          <dd>{transfer.outgoing.marketValue}</dd>
                        </div>
                        <div>
                          <dt>Nachfolger</dt>
                          <dd>{transfer.incoming.name}</dd>
                        </div>
                      </dl>
                      <b>Abgegeben</b>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
            <div className="guided-squad-preview-actions">
              {!isMandatoryMode ? (
                <button
                  disabled={transferLimitReached}
                  onClick={() => setStep("start")}
                  type="button"
                >
                  Weiteren Transfer planen
                </button>
              ) : null}
              <button className="primary" onClick={() => setStep("summary")} type="button">Transferplan prüfen</button>
            </div>
          </section>
        ) : null}
      </main>

      <aside className="guided-transfer-sidebar">
        <section
          className={`guided-sidebar-card guided-budget-dashboard ${budgetValid ? "" : "error"}`}
        >
          <div className="guided-sidebar-section-heading">
            <span>Transferbudget</span>
          </div>
          <dl>
            <div><dt>Startbudget</dt><dd>{formatMillions(startingBudget)}</dd></div>
            <div><dt>Verkäufe</dt><dd className="positive">{formatMillions(plannedSales, true)}</dd></div>
            <div><dt>Zugänge</dt><dd className="negative">−{formatMillions(plannedPurchases)}</dd></div>
            <div className="total"><dt>Aktuell verfügbar</dt><dd>{formatMillions(remainingBudget)}</dd></div>
          </dl>
        </section>
        <section className="guided-sidebar-card guided-progress-dashboard">
          <div className="guided-sidebar-section-heading">
            <span>Transferfortschritt</span>
          </div>
          <div className="guided-plan-progress">
            <i>
              <span style={{ width: `${(draftTransfers.length / transferLimit) * 100}%` }} />
            </i>
            <strong>
              {isMandatoryMode
                ? `Pflichttransfer ${mandatoryPlayers.length - openMandatoryPlayers.length} von ${mandatoryPlayers.length}`
                : `${draftTransfers.length} von ${transferLimit} Transfers geplant`}
            </strong>
          </div>
          <dl>
            {isMandatoryMode ? (
              <div>
                <dt>Offene Pflichttransfers</dt>
                <dd>{openMandatoryPlayers.length}</dd>
              </div>
            ) : (
              <>
                <div>
                  <dt>Transferfenster</dt>
                  <dd>{formatTransferMode(transferMode)}</dd>
                </div>
                <div>
                  <dt>Freie Transfers</dt>
                  <dd>{freeTransfersUsed} / {freeTransferLimit}</dd>
                </div>
              </>
            )}
          </dl>
        </section>
        <section className="guided-sidebar-card guided-validation-dashboard">
          <div className="guided-sidebar-section-heading">
            <span>Validierung</span>
          </div>
          {submitBlockers.length > 0 ? (
            <SubmitBlockerList blockers={submitBlockers} />
          ) : (
            <div>
              <span className="guided-status-dot positive" />
              <strong>Keine aktiven Blocker</strong>
            </div>
          )}
        </section>
        <section className="guided-sidebar-card guided-action-dashboard">
          <div className="guided-sidebar-section-heading">
            <span>Aktionen</span>
          </div>
          <button onClick={() => setStep("summary")} type="button">Transferplan öffnen</button>
          <button onClick={() => setStep("squad")} type="button">Kader prüfen</button>
          <button onClick={() => setStep("summary")} type="button">Abgabe prüfen</button>
          <form action={submitTransfersAction}>
            <input
              name="managerSeasonId"
              type="hidden"
              value={snapshot.manager.managerSeasonId ?? ""}
            />
            <input
              name="mandatoryTransfersJson"
              type="hidden"
              value={mandatoryTransferSubmissionJson}
            />
            <input name="transferPlanJson" type="hidden" value={transferPlanJson} />
            <input name="budgetJson" type="hidden" value={budgetJson} />
            <button
              className={isDraftValid ? "primary" : undefined}
              disabled={!isDraftValid || !submitTransfersAction}
              type="submit"
            >
              {isMandatoryMode ? "Pflichttransfer verbindlich abgeben" : "Verbindlich abgeben"}
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}

function SubmitBlockerList({ blockers }: { blockers: readonly string[] }) {
  return (
    <div className="guided-submit-blockers">
      <span>Abgabe blockiert</span>
      <ul>
        {blockers.map((blocker) => (
          <li key={blocker}>{blocker}</li>
        ))}
      </ul>
    </div>
  );
}

function mapSnapshotSquadToPlayers(snapshot: TeamOverviewSnapshot): Player[] {
  return snapshot.squad.map((slot) => ({
    id: slot.playerId,
    name: slot.displayName,
    club: slot.bundesligaClub,
    position: slot.positionGroup,
    slotId: slot.slotId,
    role: backupSlots.has(slot.slotId) ? "Ersatz" : "Stamm",
    marketValue: formatMillions(slot.marketValue),
    marketValueNumber: slot.marketValue,
  }));
}

function mapMandatoryTransfersToPlayers(
  mandatoryTransfers: readonly MandatoryTransferInput[],
  ownSquad: readonly Player[],
): Player[] {
  return mandatoryTransfers.map((transfer) => {
    const squadPlayer = ownSquad.find((player) => (
      player.id === transfer.outgoingPlayerId &&
      player.slotId === transfer.slotId
    ));

    return {
      id: transfer.outgoingPlayerId,
      name: squadPlayer?.name ?? transfer.outgoingPlayerName,
      club: squadPlayer?.club ?? transfer.club,
      position: transfer.positionGroup,
      slotId: transfer.slotId,
      role: backupSlots.has(transfer.slotId) ? "Ersatz" : "Stamm",
      marketValue: squadPlayer?.marketValue ?? formatMillions(0),
      marketValueNumber: squadPlayer?.marketValueNumber ?? 0,
      reason: `Pflichttransfer wegen Bundesliga-Abgang · wirksam ab ST ${transfer.effectiveFromMatchday}`,
      mandatoryTransferId: transfer.id,
      effectiveFromMatchday: transfer.effectiveFromMatchday,
    };
  });
}

function mapTransferMarketPlayers(
  transferMarket: TransferMarketSnapshot,
): Player[] {
  return transferMarket.players.map((player) => ({
    id: player.id,
    name: player.displayName,
    club: player.club,
    position: player.position,
    marketValue: formatMillions(player.marketValue),
    marketValueNumber: player.marketValue,
    status: player.status,
  }));
}

function getClubLimitViolations(players: readonly Player[]) {
  const clubCounts = players.reduce((counts, player) => {
    counts.set(player.club, (counts.get(player.club) ?? 0) + 1);

    return counts;
  }, new Map<string, number>());

  return [...clubCounts.entries()]
    .filter(([, count]) => count > maxPlayersPerClub)
    .map(([club, count]) => ({ club, count }))
    .sort((first, second) => first.club.localeCompare(second.club, "de"));
}

function getDuplicatePlayers(players: readonly Player[]) {
  const playersById = players.reduce((index, player) => {
    index.set(player.id, [...(index.get(player.id) ?? []), player]);

    return index;
  }, new Map<string, Player[]>());

  return [...playersById.values()]
    .filter((duplicates) => duplicates.length > 1)
    .map((duplicates) => duplicates[0].name)
    .sort((first, second) => first.localeCompare(second, "de"));
}

function createSubmitBlockers(input: {
  budgetValid: boolean;
  clubLimitViolations: readonly { club: string; count: number }[];
  duplicatePlayers: readonly string[];
  isMandatoryMode: boolean;
  mandatoryComplete: boolean;
  normalPlanHasTransfers: boolean;
  normalTransferOpen: boolean;
  openMandatoryPlayers: readonly Player[];
  positionStructureValid: boolean;
}) {
  const blockers: string[] = [];

  if (!input.isMandatoryMode && !input.normalTransferOpen) {
    blockers.push("Der Transfermarkt ist aktuell geschlossen.");
  }

  if (
    !input.isMandatoryMode &&
    input.normalTransferOpen &&
    !input.normalPlanHasTransfers
  ) {
    blockers.push("Noch kein freier Transfer geplant");
  }

  if (!input.budgetValid) {
    blockers.push("Budget überschritten");
  }

  if (!input.isMandatoryMode) {
    for (const violation of input.clubLimitViolations) {
      blockers.push(
        `Zu viele Spieler eines Vereins: ${violation.club}: ${violation.count}/${maxPlayersPerClub}`,
      );
    }
  }

  if (input.duplicatePlayers.length > 0) {
    blockers.push(
      `Spieler doppelt im Kader: ${input.duplicatePlayers.join(", ")}`,
    );
  }

  if (!input.mandatoryComplete) {
    blockers.push(
      `Offene Pflichttransfers: ${input.openMandatoryPlayers.length}`,
    );
  }

  if (!input.isMandatoryMode && !input.positionStructureValid) {
    blockers.push("Falsche Positionsstruktur");
  }

  return blockers;
}

function formatTransferMode(mode: TransferMode) {
  if (mode === "MANDATORY_OPEN") {
    return "Pflichttransfer offen";
  }

  if (mode === "SUMMER_OPEN") {
    return "Sommertransfer offen";
  }

  if (mode === "WINTER_OPEN") {
    return "Wintertransfer offen";
  }

  return "Transfermarkt geschlossen";
}

function createPositionMarketValues(
  players: readonly Player[],
): Record<Position, string> {
  return positions.reduce(
    (result, position) => ({
      ...result,
      [position]: formatMillions(
        players
          .filter((player) => player.position === position)
          .reduce((sum, player) => sum + player.marketValueNumber, 0),
      ),
    }),
    {
      TW: formatMillions(0),
      AB: formatMillions(0),
      MF: formatMillions(0),
      ST: formatMillions(0),
    },
  );
}

function sumMarketValue(players: readonly Player[]) {
  return players.reduce((sum, player) => sum + player.marketValueNumber, 0);
}
