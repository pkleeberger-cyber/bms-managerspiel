import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  archiveManager,
  assignManagerSeasonLeague,
  hardDeleteManager,
  loadManagerDetail,
  reactivateManager,
  updateManagerSeasonBudget,
} from "@/application/manager-service";
import { ManagerProfile } from "@/components/manager-profile/manager-profile";
import type { ManagerLeagueLevel, SquadAssignmentRecord } from "@/infrastructure";

export const dynamic = "force-dynamic";

type ManagerDetailPageProps = {
  params: Promise<{ managerSeasonId: string }>;
  searchParams?: Promise<{
    budgetSaved?: string;
    leagueSaved?: string;
    archived?: string;
    reactivated?: string;
    error?: string;
    matchday?: string;
    tab?: string;
  }>;
};

const leagueLabels = {
  FIRST: "Erste Liga",
  SECOND: "Zweite Liga",
} as const satisfies Record<ManagerLeagueLevel, string>;

const positionLabels = {
  TW: "Torwart",
  AB: "Abwehr",
  MF: "Mittelfeld",
  ST: "Sturm",
} as const;

const managerTabs = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "saison", label: "Saison" },
  { id: "kader", label: "Kader" },
  { id: "historie", label: "Historie" },
  { id: "admin", label: "Admin" },
] as const;

type ManagerDetailTab = (typeof managerTabs)[number]["id"];

export default async function ManagerDetailPage({
  params,
  searchParams,
}: ManagerDetailPageProps) {
  const [{ managerSeasonId }, query] = await Promise.all([params, searchParams]);
  const selectedMatchday = readMatchday(query?.matchday);
  const activeTab = readManagerTab(query?.tab);
  const snapshot = await loadManagerDetail({
    managerSeasonId,
    matchday: selectedMatchday,
  });

  if (!snapshot) {
    notFound();
  }

  const manager = snapshot.manager;

  return (
    <main className="manager-detail-workspace">
      <header className="manager-detail-hero">
        <div className="manager-detail-hero-copy">
          <Link href="/admin/managers">Manager Master</Link>
          <span>Manager Detail Workspace</span>
          <h1>{manager.displayName}</h1>
          <div className="manager-detail-hero-meta" aria-label="Manager Kontext">
            <StatusBadge status={manager.status} />
            <span>{leagueLabels[manager.league]}</span>
            <span>{snapshot.currentSeason}</span>
          </div>
        </div>
        <div className="manager-detail-hero-panel">
          <div className="manager-budget-card hero-budget">
            <span>Budget</span>
            <strong>{formatBudget(manager.budget)}</strong>
            <small>Aktueller ManagerSeason-Stand</small>
          </div>
          <div className="manager-detail-hero-stats">
            <div>
              <span>Kaderwert</span>
              <strong>{formatMarketValue(snapshot.squadValue)}</strong>
            </div>
            <div>
              <span>Offene Pflichttransfers</span>
              <strong>{snapshot.openMandatoryTransfers.length}</strong>
            </div>
          </div>
          <div className="manager-detail-quick-actions" aria-label="Schnellaktionen">
            <Link href={buildTabHref(manager.id, "saison")}>Budget</Link>
            <Link href={buildTabHref(manager.id, "kader")}>Kader</Link>
            <Link href={buildTabHref(manager.id, "admin")}>Admin</Link>
          </div>
        </div>
      </header>

      {query?.budgetSaved || query?.leagueSaved || query?.archived || query?.reactivated ? (
        <section className="player-import-success" aria-live="polite">
          <div>
            <span>✓ Änderung gespeichert</span>
            <h2>{createSuccessMessage(query)}</h2>
          </div>
        </section>
      ) : null}

      {query?.error ? (
        <section className="player-import-warning" aria-live="assertive">
          <strong>Die Manager-Aktion konnte nicht abgeschlossen werden.</strong>
          <span>Die Eingabe wurde geprüft; technische Details stehen im Server-Log.</span>
        </section>
      ) : null}

      <div className="manager-detail-shell">
        <nav className="manager-detail-nav" aria-label="Manager Workspace Tabs">
          {managerTabs.map((tab) => (
            <Link
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={activeTab === tab.id ? "active" : undefined}
              href={buildTabHref(manager.id, tab.id, selectedMatchday)}
              key={tab.id}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="manager-detail-content">
          {activeTab === "uebersicht" ? (
            <ManagerProfile mode="admin" profile={snapshot.profile} />
          ) : null}

          {activeTab === "saison" ? (
          <section className="manager-detail-card season-card" id="saison">
            <header>
              <div>
                <span>Saison</span>
                <h2>Budget, Liga und Status</h2>
              </div>
              <b>{manager.transferStatus}</b>
            </header>
            <div className="manager-season-control-grid">
              <div className="manager-budget-card">
                <span>Budget</span>
                <strong>{formatBudget(manager.budget)}</strong>
                <small>Große KPI mit direkter Korrektur</small>
              </div>
              <form action={updateBudgetAction} className="manager-detail-form">
                <input name="managerSeasonId" type="hidden" value={manager.id} />
                <label>
                  <span>Budget in Mio.</span>
                  <input
                    defaultValue={manager.budget.toFixed(1)}
                    min="0"
                    name="budget"
                    step="0.1"
                    type="number"
                  />
                </label>
                <button type="submit">Speichern</button>
              </form>
              <form action={assignLeagueAction} className="manager-detail-form">
                <input name="managerSeasonId" type="hidden" value={manager.id} />
                <label>
                  <span>Liga</span>
                  <select defaultValue={manager.league} name="league">
                    <option value="FIRST">Erste Liga</option>
                    <option value="SECOND">Zweite Liga</option>
                  </select>
                </label>
                <button type="submit">Speichern</button>
              </form>
            </div>
            <dl className="manager-detail-data-list compact">
              <div><dt>ManagerSeason Status</dt><dd>{manager.status}</dd></div>
              <div><dt>Participation</dt><dd>{manager.participation}</dd></div>
              <div><dt>Transferstatus</dt><dd>{manager.transferStatus}</dd></div>
            </dl>
          </section>
          ) : null}

          {activeTab === "kader" ? (
          <section className="manager-detail-card" id="kader">
            <header>
              <div>
                <span>Kader</span>
                <h2>Aktuelle 18 Slots</h2>
              </div>
              <b>{snapshot.currentSquad.length}/18</b>
            </header>
            <SquadPositionList assignments={snapshot.currentSquad} />
          </section>
          ) : null}

          {activeTab === "historie" ? (
          <section className="manager-detail-card" id="historie">
            <header>
              <div>
                <span>Historie</span>
                <h2>Gültiger Kader nach Spieltag</h2>
              </div>
              <b>ST {snapshot.selectedMatchday}</b>
            </header>
            <form className="manager-matchday-selector">
              <input name="tab" type="hidden" value="historie" />
              <label>
                <span>Spieltag</span>
                <select defaultValue={String(snapshot.selectedMatchday)} name="matchday">
                  {Array.from({ length: 34 }, (_, index) => index + 1).map((matchday) => (
                    <option key={matchday} value={matchday}>
                      Spieltag {matchday}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Kader anzeigen</button>
            </form>
            <SquadPositionList assignments={snapshot.matchdaySquad} />
          </section>
          ) : null}

          {activeTab === "admin" ? (
          <section className="manager-detail-card" id="admin">
            <header>
              <div>
                <span>Admin</span>
                <h2>Stammdaten und Korrekturen</h2>
              </div>
              <b>Safe Mode</b>
            </header>
            <div className="manager-admin-grid">
              <section className="manager-admin-panel">
                <h3>Stammdaten</h3>
                <dl className="manager-detail-data-list compact">
                  <div><dt>Manager ID</dt><dd>{manager.managerId}</dd></div>
                  <div><dt>Manager Status</dt><dd>{manager.managerStatus}</dd></div>
                </dl>
                <ManagerDangerActions manager={manager} />
              </section>
              <section className="manager-admin-panel">
                <h3>Admin-Korrekturen</h3>
                <div className="manager-correction-grid">
                  <CorrectionAction title="Budget ändern" detail="Sicher aktiv" status="Aktiv" />
                  <CorrectionAction title="Liga ändern" detail="ManagerSeason.league" status="Aktiv" />
                  <CorrectionAction title="Spieler im Slot korrigieren" detail="Nächster Sprint" disabled />
                  <CorrectionAction title="SquadAssignment Zeitraum korrigieren" detail="Nächster Sprint" disabled />
                  <CorrectionAction title="Spieltagssquad prüfen" detail="Über Historie vorbereitet" disabled />
                </div>
              </section>
            </div>
          </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`manager-status-badge ${status.toLowerCase()}`}>{status}</span>;
}

function SquadPositionList({ assignments }: { assignments: readonly SquadAssignmentRecord[] }) {
  if (assignments.length === 0) {
    return (
      <div className="manager-detail-empty">
        <strong>Kein Kader für diese Auswahl</strong>
        <span>Für diesen Manager und Spieltag liegen keine SquadAssignments vor.</span>
      </div>
    );
  }

  const groupedAssignments = groupSquadByPosition(assignments);

  return (
    <div className="manager-squad-position-list">
      {groupedAssignments.map((group) => (
        <section className="manager-squad-position-group" key={group.position}>
          <header>
            <div>
              <span>{group.position}</span>
              <strong>{positionLabels[group.position]}</strong>
            </div>
            <b>{group.assignments.length}</b>
          </header>
          <div className="manager-squad-compact-list">
            {group.assignments.map((assignment) => (
              <article className="manager-squad-compact-row" key={assignment.id}>
                <span className="manager-slot-badge">Slot {assignment.slotId}</span>
                <strong>{assignment.playerName}</strong>
                <span>{assignment.bundesligaClub}</span>
                <span>{formatMarketValue(assignment.marketValue)}</span>
                <small>
                  ST {assignment.validFromMatchday} bis{" "}
                  {assignment.validToMatchday ?? "offen"}
                </small>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupSquadByPosition(assignments: readonly SquadAssignmentRecord[]) {
  return (Object.keys(positionLabels) as Array<keyof typeof positionLabels>)
    .map((position) => ({
      position,
      assignments: assignments.filter(
        (assignment) => assignment.positionGroup === position,
      ),
    }))
    .filter((group) => group.assignments.length > 0);
}

function ManagerDangerActions({
  manager,
}: {
  manager: NonNullable<Awaited<ReturnType<typeof loadManagerDetail>>>["manager"];
}) {
  return (
    <div className="manager-card-actions detail-actions">
      {manager.managerStatus === "ARCHIVED" || manager.status === "ARCHIVED" ? (
        <form action={reactivateManagerAction}>
          <input name="managerId" type="hidden" value={manager.managerId} />
          <input name="managerSeasonId" type="hidden" value={manager.id} />
          <button type="submit">Reaktivieren</button>
        </form>
      ) : (
        <form action={archiveManagerAction}>
          <input name="managerId" type="hidden" value={manager.managerId} />
          <input name="managerSeasonId" type="hidden" value={manager.id} />
          <button type="submit">Archivieren</button>
        </form>
      )}
      <details className="manager-danger-zone">
        <summary>Endgültig löschen</summary>
        <div>
          <strong>Nur Admin/Dev: endgültig löschen</strong>
          <p>Diese Aktion entfernt Managerdaten dauerhaft und bleibt bestätigungspflichtig.</p>
          <form action={hardDeleteManagerAction}>
            <input name="managerId" type="hidden" value={manager.managerId} />
            <input name="expectedDisplayName" type="hidden" value={manager.displayName} />
            <label>
              <span>Zur Bestätigung Managername eingeben</span>
              <input
                autoComplete="off"
                name="confirmation"
                placeholder={manager.displayName}
                required
                type="text"
              />
            </label>
            <button type="submit">Endgültig löschen</button>
          </form>
        </div>
      </details>
    </div>
  );
}

function CorrectionAction({
  detail,
  disabled = false,
  status = "Aktiv",
  title,
}: {
  detail: string;
  disabled?: boolean;
  status?: string;
  title: string;
}) {
  return (
    <article className={disabled ? "disabled" : undefined}>
      <span>{status}</span>
      <strong>{title}</strong>
      <p>{detail}</p>
      <button disabled={disabled} type="button">
        {disabled ? "Vorbereitet" : "Verfügbar"}
      </button>
    </article>
  );
}

async function updateBudgetAction(formData: FormData) {
  "use server";

  const managerSeasonId = readRequiredFormValue(formData, "managerSeasonId");
  const budget = Number(String(formData.get("budget") ?? "").replace(",", "."));

  if (!Number.isFinite(budget) || budget < 0) {
    redirect(`/admin/managers/${managerSeasonId}?error=budget`);
  }

  try {
    await updateManagerSeasonBudget({ managerSeasonId, budget });
  } catch (error) {
    console.error("Update manager budget failed", error);
    redirect(`/admin/managers/${managerSeasonId}?error=budget`);
  }

  redirect(`/admin/managers/${managerSeasonId}?budgetSaved=1`);
}

async function assignLeagueAction(formData: FormData) {
  "use server";

  const managerSeasonId = readRequiredFormValue(formData, "managerSeasonId");
  const league = readLeague(formData);

  try {
    await assignManagerSeasonLeague({ managerSeasonId, league });
  } catch (error) {
    console.error("Assign manager league failed", error);
    redirect(`/admin/managers/${managerSeasonId}?error=league`);
  }

  redirect(`/admin/managers/${managerSeasonId}?leagueSaved=1`);
}

async function archiveManagerAction(formData: FormData) {
  "use server";

  const managerId = readRequiredFormValue(formData, "managerId");
  const managerSeasonId = readRequiredFormValue(formData, "managerSeasonId");

  try {
    await archiveManager(managerId);
  } catch (error) {
    console.error("Archive manager failed", error);
    redirect(`/admin/managers/${managerSeasonId}?error=archive`);
  }

  redirect(`/admin/managers/${managerSeasonId}?archived=1`);
}

async function reactivateManagerAction(formData: FormData) {
  "use server";

  const managerId = readRequiredFormValue(formData, "managerId");
  const managerSeasonId = readRequiredFormValue(formData, "managerSeasonId");

  try {
    await reactivateManager(managerId);
  } catch (error) {
    console.error("Reactivate manager failed", error);
    redirect(`/admin/managers/${managerSeasonId}?error=reactivate`);
  }

  redirect(`/admin/managers/${managerSeasonId}?reactivated=1`);
}

async function hardDeleteManagerAction(formData: FormData) {
  "use server";

  const managerId = readRequiredFormValue(formData, "managerId");
  const expectedDisplayName = readRequiredFormValue(formData, "expectedDisplayName");
  const confirmation = readRequiredFormValue(formData, "confirmation");

  if (normalizeConfirmation(confirmation) !== normalizeConfirmation(expectedDisplayName)) {
    redirect(`/admin/managers?error=confirmation`);
  }

  try {
    await hardDeleteManager(managerId);
  } catch (error) {
    console.error("Hard delete manager failed", error);
    redirect(`/admin/managers?error=delete`);
  }

  redirect("/admin/managers?deleted=1");
}

function readRequiredFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    redirect("/admin/managers?error=missing");
  }

  return value.trim();
}

function readLeague(formData: FormData): ManagerLeagueLevel {
  const value = formData.get("league");

  if (value === "FIRST" || value === "SECOND") {
    return value;
  }

  redirect("/admin/managers?error=league");
}

function readMatchday(value: string | undefined) {
  const parsed = Number(value ?? 1);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 34 ? parsed : 1;
}

function readManagerTab(value: string | undefined): ManagerDetailTab {
  return managerTabs.some((tab) => tab.id === value)
    ? (value as ManagerDetailTab)
    : "uebersicht";
}

function buildTabHref(
  managerSeasonId: string,
  tab: ManagerDetailTab,
  matchday?: number,
) {
  const params = new URLSearchParams({ tab });

  if (tab === "historie" && matchday) {
    params.set("matchday", String(matchday));
  }

  return `/admin/managers/${managerSeasonId}?${params.toString()}`;
}

function createSuccessMessage(query: NonNullable<ManagerDetailPageProps["searchParams"]> extends Promise<infer T> ? T : never) {
  if (query?.budgetSaved) {
    return "Budget wurde aktualisiert.";
  }

  if (query?.leagueSaved) {
    return "Liga-Zuordnung wurde aktualisiert.";
  }

  if (query?.archived) {
    return "Manager wurde archiviert.";
  }

  return "Manager wurde reaktiviert.";
}

function normalizeConfirmation(value: string) {
  return value.trim().normalize("NFC");
}

function formatBudget(value: number) {
  return `${value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })} Mio.`;
}

function formatMarketValue(value: number) {
  return `${value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })} Mio.`;
}
