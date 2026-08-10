import Link from "next/link";

import type { MandatoryTransferRecord } from "@/application/player-departure-service";
import { loadOpenMandatoryTransfers } from "@/application/player-departure-service";
import type { TeamOverviewSnapshot } from "@/application/team-service";
import { loadCurrentTeamOverview } from "@/application/team-service";
import type { TransferPeriodSnapshot } from "@/application/transfer-period-service";
import { loadTransferPeriodSnapshot } from "@/application/transfer-period-service";

type TransferCenterPageProps = {
  searchParams?: Promise<{
    mandatorySuccess?: string;
    managerSeasonId?: string;
    normalSuccess?: string;
  }>;
};

type TransferState = "CLOSED" | "MANDATORY" | "SUMMER" | "WINTER";

export default async function TransferCenterPage({
  searchParams,
}: TransferCenterPageProps) {
  const params = await searchParams;
  const snapshot = await loadCurrentTeamOverview({
    managerSeasonId: params?.managerSeasonId,
  });
  const [mandatoryTransfers, transferPeriod] = await Promise.all([
    loadOpenMandatoryTransfers(snapshot.manager.managerSeasonId),
    loadTransferPeriodSnapshot(),
  ]);
  const state = resolveTransferState(mandatoryTransfers, transferPeriod);
  const workspaceHref = withManagerContext(
    "/team/transfers/workspace",
    snapshot.manager.managerSeasonId ?? params?.managerSeasonId,
    transferPeriod.activePhase,
  );
  const successMessage = params?.mandatorySuccess === "1"
    ? "Pflichttransfer erfolgreich durchgeführt."
    : params?.normalSuccess === "1"
      ? "Transferplan verbindlich abgegeben."
      : null;

  return (
    <div className={`transfer-state-page ${state.toLowerCase()}`}>
      {successMessage ? (
        <section className="transfer-success-card">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Transfer erfolgreich</strong>
            <p>
              {successMessage} Der Transferstatus wurde neu geladen.
            </p>
          </div>
        </section>
      ) : null}

      {state === "CLOSED" ? (
        <ClosedTransferState
          snapshot={snapshot}
          transferPeriod={transferPeriod}
        />
      ) : null}

      {state === "MANDATORY" ? (
        <MandatoryTransferState
          mandatoryTransfers={mandatoryTransfers}
          snapshot={snapshot}
          workspaceHref={workspaceHref}
        />
      ) : null}

      {state === "SUMMER" || state === "WINTER" ? (
        <OpenTransferState
          snapshot={snapshot}
          state={state}
          workspaceHref={workspaceHref}
        />
      ) : null}
    </div>
  );
}

function ClosedTransferState({
  snapshot,
  transferPeriod,
}: {
  snapshot: TeamOverviewSnapshot;
  transferPeriod: TransferPeriodSnapshot;
}) {
  return (
    <>
      <TransferStateHero
        badge="Geschlossen"
        eyebrow="Mein Team / Transfers"
        icon="🔒"
        metrics={[
          { label: "Aktuelle Phase", value: currentTransferPeriodLabel(transferPeriod) },
          { label: "Nächste Phase", value: nextExpectedTransferPeriodLabel(transferPeriod) },
          { label: "Pflichttransfers", value: "Keine offenen" },
          { label: "Handlungsbedarf", value: "Nein" },
        ]}
        subtitle="Der Transfermarkt ist aktuell geschlossen."
        title="Transfermarkt geschlossen"
        tone="closed"
      />

      <section className="transfer-closed-empty-card">
        <div className="transfer-closed-identity">
          <span>Manager</span>
          <strong>{snapshot.manager.displayName}</strong>
          <small>{snapshot.season.name}</small>
        </div>
        <div className="transfer-closed-task">
          <span aria-hidden="true">✓</span>
          <div>
            <p>Aktuelle Aufgabe</p>
            <h2>Kein Handlungsbedarf</h2>
            <small>
              Du hast keine offenen Pflichttransfers. Sobald der Transfermarkt
              geöffnet wird, erscheint hier dein Transferarbeitsplatz.
            </small>
          </div>
        </div>
      </section>
    </>
  );
}

function MandatoryTransferState({
  mandatoryTransfers,
  snapshot,
  workspaceHref,
}: {
  mandatoryTransfers: readonly MandatoryTransferRecord[];
  snapshot: TeamOverviewSnapshot;
  workspaceHref: string;
}) {
  const primaryTransfer = mandatoryTransfers[0];

  return (
    <>
      <TransferStateHero
        badge="Pflicht"
        eyebrow="Mein Team / Transfers"
        icon="⚠"
        metrics={[
          { label: "Offen", value: String(mandatoryTransfers.length) },
          {
            label: "Budget",
            value: snapshot.manager.budget === null
              ? "—"
              : formatMarketValue(snapshot.manager.budget),
          },
        ]}
        subtitle={`${snapshot.manager.displayName} · ${snapshot.season.name}`}
        title="Pflichttransfer erforderlich"
        tone="mandatory"
      />

      <section className="transfer-state-task warning">
        <span>Aktuelle Aufgabe</span>
        <h2>Pflichttransfer durchführen</h2>
        <p>
          {primaryTransfer.outgoingPlayerName} muss ersetzt werden, weil der
          Spieler nicht mehr regulär im Kader gewertet werden kann.
        </p>
        <Link className="primary" href={workspaceHref}>
          Pflichttransfer durchführen
        </Link>
      </section>

      <section className="transfer-state-workspace mandatory">
        <header>
          <span>Pflichttransfer</span>
          <h2>Zu ersetzende Spieler</h2>
        </header>
        <div className="transfer-mandatory-card-grid">
          {mandatoryTransfers.map((transfer) => (
            <article className="transfer-mandatory-player-card" key={transfer.id}>
              <div>
                <span>Abgang</span>
                <strong>{transfer.outgoingPlayerName}</strong>
                <small>Slot {transfer.slotId} · {transfer.positionGroup}</small>
              </div>
              <div>
                <span>Grund</span>
                <strong>{transfer.reason || "Bundesliga verlassen"}</strong>
                <small>Ein Ersatz muss positionsgleich gewählt werden.</small>
              </div>
              <div className="transfer-mandatory-action">
                <span>Budget</span>
                <strong>
                  {snapshot.manager.budget === null
                    ? "—"
                    : formatMarketValue(snapshot.manager.budget)}
                </strong>
                <Link href={workspaceHref}>Pflichttransfer durchführen</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function OpenTransferState({
  snapshot,
  state,
  workspaceHref,
}: {
  snapshot: TeamOverviewSnapshot;
  state: "SUMMER" | "WINTER";
  workspaceHref: string;
}) {
  const title = state === "SUMMER"
    ? "Sommertransfer geöffnet"
    : "Wintertransfer geöffnet";

  return (
    <>
      <TransferStateHero
        badge="Offen"
        eyebrow="Mein Team / Transfers"
        icon={state === "SUMMER" ? "☀" : "❄"}
        metrics={[
          { label: "Resttransfers", value: "Im Arbeitsplatz" },
          {
            label: "Budget",
            value: snapshot.manager.budget === null
              ? "—"
              : formatMarketValue(snapshot.manager.budget),
          },
          { label: "Kaderwert", value: formatMarketValue(snapshot.liveSummary.totalMarketValue) },
        ]}
        subtitle={`${snapshot.manager.displayName} · ${snapshot.season.name}`}
        title={title}
        tone="open"
      />

      <section className="transfer-state-task open">
        <span>Aktuelle Aufgabe</span>
        <h2>Transferphase geöffnet</h2>
        <p>
          Normale Transfers können geplant, validiert und verbindlich abgegeben
          werden.
        </p>
        <Link className="primary" href={workspaceHref}>
          Transfer planen
        </Link>
      </section>

      <section className="transfer-state-workspace normal">
        <header>
          <span>Workspace</span>
          <h2>Normaler Transfer</h2>
        </header>
        <div className="transfer-normal-grid">
          <article>
            <span>Transferworkspace</span>
            <strong>Spieler verkaufen und Ersatz wählen</strong>
          </article>
          <article>
            <span>Transferplan</span>
            <strong>Abgänge, Zugänge und Budget prüfen</strong>
          </article>
          <article>
            <span>Validierung</span>
            <strong>Aktive Blocker im Arbeitsplatz</strong>
          </article>
        </div>
      </section>
    </>
  );
}

function TransferStateHero({
  badge,
  eyebrow,
  icon,
  metrics,
  subtitle,
  title,
  tone = "open",
}: {
  badge: string;
  eyebrow: string;
  icon?: string;
  metrics: readonly { label: string; value: string }[];
  subtitle: string;
  title: string;
  tone?: "closed" | "mandatory" | "open";
}) {
  return (
    <header className={`transfer-state-hero ${tone}`}>
      <div className="transfer-state-hero-copy">
        {icon ? (
          <span className="transfer-state-hero-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="transfer-state-meta">
        <b>{badge}</b>
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>
    </header>
  );
}

function resolveTransferState(
  mandatoryTransfers: readonly MandatoryTransferRecord[],
  transferPeriod: TransferPeriodSnapshot,
): TransferState {
  if (mandatoryTransfers.length > 0) {
    return "MANDATORY";
  }

  if (transferPeriod.status === "OPEN" && transferPeriod.activePhase === "SUMMER") {
    return "SUMMER";
  }

  if (transferPeriod.status === "OPEN" && transferPeriod.activePhase === "WINTER") {
    return "WINTER";
  }

  return "CLOSED";
}

function currentTransferPeriodLabel(transferPeriod: TransferPeriodSnapshot) {
  if (transferPeriod.status === "OPEN" && transferPeriod.activePhase === "SUMMER") {
    return "Sommer offen";
  }

  if (transferPeriod.status === "OPEN" && transferPeriod.activePhase === "WINTER") {
    return "Winter offen";
  }

  return "Geschlossen";
}

function nextExpectedTransferPeriodLabel(transferPeriod: TransferPeriodSnapshot) {
  if (transferPeriod.activePhase === "SUMMER") {
    return "Winter nach Freigabe";
  }

  if (transferPeriod.activePhase === "WINTER") {
    return "Sommer nach Freigabe";
  }

  return "Nach Öffnung durch Spielleitung";
}

function withManagerContext(
  href: string,
  managerSeasonId?: string | null,
  phase?: "SUMMER" | "WINTER" | null,
) {
  if (!managerSeasonId && !phase) {
    return href;
  }

  const params = new URLSearchParams();

  if (managerSeasonId) {
    params.set("managerSeasonId", managerSeasonId);
  }

  if (phase) {
    params.set("phase", phase);
  }

  return `${href}?${params.toString()}`;
}

function formatMarketValue(value: number): string {
  return `${value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} Mio. €`;
}
