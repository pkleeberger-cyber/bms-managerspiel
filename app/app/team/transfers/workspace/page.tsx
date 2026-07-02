"use client";

import { useMemo, useState } from "react";

type Position = "TW" | "AB" | "MF" | "ST";
type WorkflowKind = "mandatory" | "free";
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
  marketValue: string;
  purchaseValue: string;
  reason?: string;
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

const mandatoryPlayers: Player[] = [
  {
    id: "mandatory-anton",
    name: "Anton Fischer",
    club: "Bayer Leverkusen",
    position: "ST",
    marketValue: "11,2 Mio. €",
    purchaseValue: "9,8 Mio. €",
    reason: "Bundesliga verlassen",
  },
  {
    id: "mandatory-mats",
    name: "Mats Lorenz",
    club: "Werder Bremen",
    position: "AB",
    marketValue: "5,4 Mio. €",
    purchaseValue: "4,9 Mio. €",
    reason: "Bundesliga verlassen",
  },
];

const ownSquad: Player[] = [
  { id: "own-nils", name: "Nils Berger", club: "1. FC Köln", position: "TW", marketValue: "4,2 Mio. €", purchaseValue: "3,8 Mio. €" },
  { id: "own-jonas", name: "Jonas Hartmann", club: "Mainz 05", position: "TW", marketValue: "3,1 Mio. €", purchaseValue: "3,0 Mio. €" },
  { id: "own-david", name: "David König", club: "Borussia Dortmund", position: "AB", marketValue: "7,8 Mio. €", purchaseValue: "6,5 Mio. €" },
  { id: "own-luca", name: "Luca Brandt", club: "Union Berlin", position: "AB", marketValue: "4,6 Mio. €", purchaseValue: "4,2 Mio. €" },
  { id: "own-noah", name: "Noah Seidel", club: "VfB Stuttgart", position: "AB", marketValue: "8,1 Mio. €", purchaseValue: "7,5 Mio. €" },
  { id: "own-robin", name: "Robin Kühn", club: "FC Augsburg", position: "AB", marketValue: "3,9 Mio. €", purchaseValue: "3,7 Mio. €" },
  { id: "own-milan", name: "Milan Becker", club: "RB Leipzig", position: "MF", marketValue: "9,6 Mio. €", purchaseValue: "8,1 Mio. €" },
  { id: "own-felix", name: "Felix Winter", club: "SC Freiburg", position: "MF", marketValue: "6,8 Mio. €", purchaseValue: "6,2 Mio. €" },
  { id: "own-elias", name: "Elias Krüger", club: "VfL Wolfsburg", position: "MF", marketValue: "7,4 Mio. €", purchaseValue: "7,0 Mio. €" },
  { id: "own-timo", name: "Timo Arnold", club: "TSG Hoffenheim", position: "MF", marketValue: "5,7 Mio. €", purchaseValue: "5,1 Mio. €" },
  { id: "own-samuel", name: "Samuel Peters", club: "FC St. Pauli", position: "MF", marketValue: "4,8 Mio. €", purchaseValue: "4,4 Mio. €" },
  { id: "own-mika", name: "Mika Engel", club: "Eintracht Frankfurt", position: "MF", marketValue: "8,9 Mio. €", purchaseValue: "8,3 Mio. €" },
  { id: "own-louis", name: "Louis Jäger", club: "Werder Bremen", position: "MF", marketValue: "5,2 Mio. €", purchaseValue: "4,9 Mio. €" },
  { id: "own-max", name: "Maximilian Wolf", club: "FC Augsburg", position: "ST", marketValue: "5,1 Mio. €", purchaseValue: "5,5 Mio. €" },
  { id: "own-fabian", name: "Fabian Stein", club: "1. FC Heidenheim", position: "ST", marketValue: "4,5 Mio. €", purchaseValue: "4,3 Mio. €" },
  { id: "own-julian", name: "Julian Kern", club: "Borussia M'gladbach", position: "ST", marketValue: "6,4 Mio. €", purchaseValue: "6,0 Mio. €" },
];

const marketPlayers: Player[] = [
  { id: "market-ole", name: "Ole Schwarz", club: "VfL Wolfsburg", position: "TW", marketValue: "3,9 Mio. €", purchaseValue: "4,1 Mio. €" },
  { id: "market-paul", name: "Paul Neumann", club: "Eintracht Frankfurt", position: "AB", marketValue: "8,4 Mio. €", purchaseValue: "9,1 Mio. €" },
  { id: "market-jan", name: "Jan Keller", club: "Borussia M'gladbach", position: "AB", marketValue: "6,7 Mio. €", purchaseValue: "7,0 Mio. €" },
  { id: "market-finn", name: "Finn Werner", club: "FC Bayern München", position: "MF", marketValue: "12,8 Mio. €", purchaseValue: "14,2 Mio. €" },
  { id: "market-emil", name: "Emil Schuster", club: "FC St. Pauli", position: "MF", marketValue: "5,6 Mio. €", purchaseValue: "5,9 Mio. €" },
  { id: "market-ben", name: "Ben Richter", club: "TSG Hoffenheim", position: "ST", marketValue: "7,3 Mio. €", purchaseValue: "7,9 Mio. €" },
  { id: "market-leon", name: "Leon Vogt", club: "1. FC Heidenheim", position: "ST", marketValue: "4,8 Mio. €", purchaseValue: "5,2 Mio. €" },
];

const startingBudget = 25.4;
const freeTransferLimit = 4;
const transferLimit = freeTransferLimit + mandatoryPlayers.length;
const positions: Position[] = ["TW", "AB", "MF", "ST"];
const requiredPositionCounts: Record<Position, number> = {
  TW: 2,
  AB: 5,
  MF: 7,
  ST: 4,
};
const positionMarketValues: Record<Position, string> = {
  TW: "7,3 Mio. €",
  AB: "31,8 Mio. €",
  MF: "49,1 Mio. €",
  ST: "22,6 Mio. €",
};
const positionSlots: Record<Position, number[]> = {
  TW: [1, 2],
  AB: [3, 4, 5, 6, 7],
  MF: [8, 9, 10, 11, 12, 13, 14],
  ST: [15, 16, 17, 18],
};
const backupSlots = new Set([2, 6, 7, 13, 14, 17, 18]);

function parseMillions(value: string) {
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
      <span>Kaufwert <strong>{player.purchaseValue}</strong></span>
    </div>
  );
}

export default function GuidedTransferWorkspacePage() {
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
    TW: [...mandatoryPlayers, ...ownSquad].filter((player) => player.position === "TW").map((player) => player.id),
    AB: [...mandatoryPlayers, ...ownSquad].filter((player) => player.position === "AB").map((player) => player.id),
    MF: [...mandatoryPlayers, ...ownSquad].filter((player) => player.position === "MF").map((player) => player.id),
    ST: [...mandatoryPlayers, ...ownSquad].filter((player) => player.position === "ST").map((player) => player.id),
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
  const filteredMarketPlayers = useMemo(() => {
    if (!outgoingPlayer) {
      return [];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const purchasedPlayerIds = new Set(
      draftTransfers.map((transfer) => transfer.incoming.id),
    );

    return marketPlayers
      .filter((player) => (
        player.position === outgoingPlayer.position
        && !purchasedPlayerIds.has(player.id)
        && (
          normalizedSearch === ""
          || player.name.toLowerCase().includes(normalizedSearch)
          || player.club.toLowerCase().includes(normalizedSearch)
        )
      ))
      .sort((first, second) => (
        sortOrder === "alphabetical"
          ? first.name.localeCompare(second.name, "de")
          : first.marketValue.localeCompare(second.marketValue, "de")
      ));
  }, [draftTransfers, outgoingPlayer, searchTerm, sortOrder]);
  const latestTransfer = draftTransfers.at(-1) ?? null;
  const mandatoryComplete = openMandatoryPlayers.length === 0;
  const plannedSales = draftTransfers.reduce(
    (total, transfer) => total + parseMillions(transfer.outgoing.marketValue),
    0,
  );
  const plannedPurchases = draftTransfers.reduce(
    (total, transfer) => total + parseMillions(transfer.incoming.purchaseValue),
    0,
  );
  const remainingBudget = startingBudget + plannedSales - plannedPurchases;
  const transferLimitValid = draftTransfers.length <= transferLimit;
  const finalSquad = [...mandatoryPlayers, ...ownSquad]
    .filter((player) => (
      !soldPlayerIds.has(player.id)
      && !openMandatoryPlayers.some((openPlayer) => openPlayer.id === player.id)
    ))
    .concat(draftTransfers.map((transfer) => transfer.incoming));
  const squadCountValid = finalSquad.length === 18;
  const positionStructureValid = positions.every((position) => (
    finalSquad.filter((player) => player.position === position).length
    === requiredPositionCounts[position]
  ));
  const finalSquadIds = finalSquad.map((player) => player.id);
  const duplicatePlayersValid = new Set(finalSquadIds).size === finalSquadIds.length;
  const budgetValid = remainingBudget >= 0;
  const hasValidationError = !budgetValid
    || !transferLimitValid
    || !duplicatePlayersValid
    || (
      mandatoryComplete
      && (!squadCountValid || !positionStructureValid)
    );
  const isDraftValid = !hasValidationError && mandatoryComplete;
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

  function beginWorkflow(kind: WorkflowKind) {
    if (
      transferLimitReached
      || (kind === "free" && freeTransferLimitReached)
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
      || !workflowKind
      || !outgoingPlayer
      || !selectedReplacement
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
            <p>Schritt für Schritt zu deinem neuen Kader.</p>
          </div>
          <div className="guided-workspace-phase">
            <i aria-hidden="true" />
            <div>
              <strong>Transferphase geöffnet</strong>
              <span>Sommer 2026/27</span>
            </div>
          </div>
        </header>

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

        {step === "start" ? (
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
                  ✓ Pflichttransfers abgeschlossen
                </b>
              ) : null}
            </div>
            <div className="guided-action-grid">
              <button
                className="guided-action-card mandatory"
                disabled={mandatoryComplete || transferLimitReached}
                onClick={() => beginWorkflow("mandatory")}
                type="button"
              >
                <span className="guided-action-index">01</span>
                <div>
                  <strong>Pflichttransfer durchführen</strong>
                  <p>Ersetze Spieler, die die Bundesliga verlassen haben.</p>
                </div>
                <b>{mandatoryComplete ? "Abgeschlossen" : `${openMandatoryPlayers.length} offen`}</b>
              </button>
              <button
                className={`guided-action-card free ${mandatoryComplete ? "highlighted" : ""}`}
                disabled={transferLimitReached || freeTransferLimitReached}
                onClick={() => beginWorkflow("free")}
                type="button"
              >
                <span className="guided-action-index">02</span>
                <div>
                  <strong>Freien Transfer durchführen</strong>
                  <p>Verbessere deinen Kader freiwillig.</p>
                </div>
                <b>Transfer starten →</b>
              </button>
            </div>
            {transferLimitReached ? (
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
              {openMandatoryPlayers.map((player) => (
                <article key={player.id}>
                  <PlayerAvatar player={player} />
                  <div>
                    <span className="guided-position-badge">{player.position}</span>
                    <strong>{player.name}</strong>
                    <small>{player.club}</small>
                  </div>
                  <b>{player.reason}</b>
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
              {availableOwnSquad.map((player) => (
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
                        <span>{player.purchaseValue}</span>
                        <b>{isSelected ? "Ausgewählt" : "Auswählen"}</b>
                      </button>
                    );
                  })}
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
                            - parseMillions(selectedReplacement.purchaseValue),
                            true,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Transferwirkung</dt>
                        <dd>1 Transfer</dd>
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
                    +{latestTransfer.outgoing.marketValue} / −{latestTransfer.incoming.purchaseValue}
                  </dd>
                </div>
                <div>
                  <dt>Saldo</dt>
                  <dd>
                    {formatMillions(
                      parseMillions(latestTransfer.outgoing.marketValue)
                      - parseMillions(latestTransfer.incoming.purchaseValue),
                      true,
                    )}
                  </dd>
                </div>
                <div><dt>Transferwirkung</dt><dd>1 Transfer verwendet</dd></div>
              </dl>
            </article>

            <div className="guided-success-actions">
              <button onClick={undoLatestTransfer} type="button">
                Rückgängig machen
              </button>
              <button
                disabled={transferLimitReached}
                onClick={planAnotherTransfer}
                type="button"
              >
                Weiteren Transfer planen
              </button>
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
            {transferLimitReached ? (
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
                Prüfe alle geplanten Bewegungen. Zwischenstände dürfen
                unvollständig sein.
              </p>
            </div>
            <div className="guided-summary-grid">
              <article>
                <span>Transfers geplant</span>
                <strong>{draftTransfers.length}</strong>
                <b>von {transferLimit}</b>
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
                    <strong>Beginne mit einem Pflichttransfer oder einem freien Transfer.</strong>
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
                          - parseMillions(transfer.incoming.purchaseValue),
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
                  <p>Die verbindliche Abgabe wird erst nach vollständiger Validierung möglich.</p>
                </div>
              </div>
              <button onClick={() => setStep("squad")} type="button">Kader prüfen</button>
            </div>
          </section>
        ) : null}

        {step === "squad" ? (
          <section className="guided-task-card guided-squad-preview">
            <div className="guided-task-heading">
              <button onClick={() => setStep("summary")} type="button">← Zum Transferplan</button>
              <span>Saisonvorschau</span>
              <h2>Dein Team 2026/27</h2>
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
                <strong>110,8</strong>
                <b>Mio. €</b>
              </article>
              <article>
                <span>Marktwertentwicklung</span>
                <strong>+8,7</strong>
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
              <button
                disabled={transferLimitReached}
                onClick={() => setStep("start")}
                type="button"
              >
                Weiteren Transfer planen
              </button>
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
            <div><dt>Käufe</dt><dd className="negative">−{formatMillions(plannedPurchases)}</dd></div>
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
            <strong>{draftTransfers.length} von {transferLimit} Transfers geplant</strong>
          </div>
          <dl>
            <div>
              <dt>Pflichttransfers</dt>
              <dd>{mandatoryPlayers.length - openMandatoryPlayers.length} / {mandatoryPlayers.length}</dd>
            </div>
            <div>
              <dt>Freie Transfers</dt>
              <dd>{freeTransfersUsed} / {freeTransferLimit}</dd>
            </div>
          </dl>
        </section>
        <section className="guided-sidebar-card guided-validation-dashboard">
          <div className="guided-sidebar-section-heading">
            <span>Validierung</span>
          </div>
          <div>
            <span className={`guided-status-dot ${budgetValid ? "positive" : "negative"}`} />
            <strong>{budgetValid ? "Budget im Rahmen" : "Budget überschritten"}</strong>
          </div>
          <div>
            <span className={`guided-status-dot ${transferLimitValid ? "positive" : "negative"}`} />
            <strong>{transferLimitValid ? "Transferlimit eingehalten" : "Transferlimit überschritten"}</strong>
          </div>
          <div>
            <span className={`guided-status-dot ${mandatoryComplete ? "positive" : "warning"}`} />
            <strong>{mandatoryComplete ? "Pflichttransfers erledigt" : `${openMandatoryPlayers.length} Pflichttransfers offen`}</strong>
          </div>
          <div>
            <span className={`guided-status-dot ${positionStructureValid ? "positive" : "negative"}`} />
            <strong>{positionStructureValid ? "Positionsstruktur korrekt" : "Positionsstruktur fehlerhaft"}</strong>
          </div>
          <div>
            <span className={`guided-status-dot ${duplicatePlayersValid ? "positive" : "negative"}`} />
            <strong>{duplicatePlayersValid ? "Keine Doppelspieler" : "Doppelspieler vorhanden"}</strong>
          </div>
          <div>
            <span className={`guided-status-dot ${squadCountValid ? "positive" : "negative"}`} />
            <strong>{squadCountValid ? "18 Spieler vorhanden" : `${finalSquad.length} von 18 Spielern vorhanden`}</strong>
          </div>
        </section>
        <section className="guided-sidebar-card guided-action-dashboard">
          <div className="guided-sidebar-section-heading">
            <span>Aktionen</span>
          </div>
          <button onClick={() => setStep("summary")} type="button">Transferplan öffnen</button>
          <button onClick={() => setStep("squad")} type="button">Kader prüfen</button>
          <button onClick={() => setStep("summary")} type="button">Abgabe prüfen</button>
          <button
            className={isDraftValid ? "primary" : undefined}
            disabled={!isDraftValid}
            type="button"
          >
            Verbindlich abgeben
          </button>
        </section>
      </aside>
    </div>
  );
}
