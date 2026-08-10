import {
  archiveManager,
  hardDeleteManager,
  loadManagerMaster,
  reactivateManager,
} from "@/application/manager-service";
import type { ManagerSeasonRecord } from "@/infrastructure";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ManagerMasterPageProps = {
  searchParams?: Promise<{
    created?: string;
    archived?: string;
    deleted?: string;
    reactivated?: string;
    error?: string;
  }>;
};

const leagueLabels = {
  FIRST: "Erste Liga",
  SECOND: "Zweite Liga",
} as const;

export default async function ManagerMasterPage({ searchParams }: ManagerMasterPageProps) {
  const params = await searchParams;
  const snapshot = await loadManagerMaster();

  return (
    <main className="player-master">
      <header className="player-master-title">
        <span>Administration / Manager</span>
        <h1>Manager Master</h1>
        <p>
          Manager sind permanente Identitäten. Die aktuelle Saison wird über
          ManagerSeason als Teilnahme verwaltet.
        </p>
      </header>

      <section className="player-master-hero" aria-labelledby="manager-master-hero">
        <div>
          <span className="matchday-ops-eyebrow">Manager Season</span>
          <h2 id="manager-master-hero">Ein Manager entspricht genau einem Team.</h2>
          <p>
            Die saisonale Teilnahme enthält Liga, Budget, Status und Transferstand.
            Es gibt keine separaten Club- oder Team-Identitäten.
          </p>
        </div>
        <div className="player-master-hero-grid">
          <article>
            <span>Current Season</span>
            <strong>{snapshot.currentSeason}</strong>
            <small>Aktive Saison</small>
          </article>
          <article>
            <span>Manager</span>
            <strong>{snapshot.managerCount}</strong>
            <small>Aktive Manager</small>
          </article>
          <article>
            <span>Active Participants</span>
            <strong>{snapshot.activeParticipants}</strong>
            <small>ManagerSeason</small>
          </article>
          <article>
            <span>Database Status</span>
            <strong>
              {snapshot.databaseStatus === "CONNECTED"
                ? "Datenbank"
                : "Nicht verfügbar"}
            </strong>
            <small>Keine Fixtures</small>
          </article>
        </div>
      </section>

      {snapshot.databaseStatus === "UNAVAILABLE" ? (
        <section className="player-master-warning">
          <strong>Prisma nicht verfügbar.</strong>
          <span>
            Der Manager Master rendert ohne Fixture-Fallback. Nach dem Import
            erscheinen ManagerSeason-Daten automatisch.
          </span>
        </section>
      ) : null}

      {params?.created ? (
        <section className="player-import-success" aria-live="polite">
          <div>
            <span>✓ Manager angelegt</span>
            <h2>Manager und ManagerSeason wurden erstellt.</h2>
          </div>
        </section>
      ) : null}

      {params?.archived ? (
        <section className="player-import-success" aria-live="polite">
          <div>
            <span>✓ Manager archiviert</span>
            <h2>Manager und ManagerSeason wurden archiviert.</h2>
          </div>
        </section>
      ) : null}

      {params?.deleted ? (
        <section className="player-import-success" aria-live="polite">
          <div>
            <span>✓ Manager gelöscht</span>
            <h2>Testmanager wurde endgültig entfernt.</h2>
          </div>
        </section>
      ) : null}

      {params?.reactivated ? (
        <section className="player-import-success" aria-live="polite">
          <div>
            <span>✓ Manager reaktiviert</span>
            <h2>Manager und ManagerSeason wurden wieder aktiviert.</h2>
          </div>
        </section>
      ) : null}

      {params?.error ? (
        <section className="player-import-warning" aria-live="assertive">
          <strong>Die Manager-Aktion konnte nicht abgeschlossen werden.</strong>
          <span>
            Es wurden keine Rohdatenbankfehler angezeigt. Technische Details
            stehen im Server-Log.
          </span>
        </section>
      ) : null}

      {snapshot.verification.orphanedManagerSeasons.length > 0 ? (
        <section className="player-master-warning" aria-live="polite">
          <strong>Verwaiste Saison-Teilnahmen gefunden.</strong>
          <span>
            {snapshot.verification.orphanedManagerSeasons.length} ManagerSeason
            {snapshot.verification.orphanedManagerSeasons.length === 1
              ? " verweist"
              : " verweisen"}{" "}
            auf gelöschte Manager. Gültige Manager werden weiter angezeigt.
            Nutze `npm run repair:manager-seasons` für eine trockene Prüfung.
          </span>
        </section>
      ) : null}

      <section className="player-import-summary" aria-label="Manager Verification">
        <article className="ready">
          <span>Managers Imported</span>
          <strong>{snapshot.verification.managersImported}</strong>
          <small>Manager Identitäten</small>
        </article>
        <article className="ready">
          <span>Active</span>
          <strong>{snapshot.verification.activeManagers}</strong>
          <small>Aktive ManagerSeason</small>
        </article>
        <article className="waiting">
          <span>Paused</span>
          <strong>{snapshot.verification.pausedManagers}</strong>
          <small>Status PAUSED</small>
        </article>
        <article
          className={snapshot.verification.archivedManagers > 0 ? "waiting" : "ready"}
        >
          <span>Archived</span>
          <strong>{snapshot.verification.archivedManagers}</strong>
          <small>Separat geführt</small>
        </article>
        <article
          className={
            snapshot.verification.missingSeasonAssignments.length > 0
              ? "attention"
              : "ready"
          }
        >
          <span>Missing Season</span>
          <strong>{snapshot.verification.missingSeasonAssignments.length}</strong>
          <small>Ohne ManagerSeason</small>
        </article>
        <article
          className={
            snapshot.verification.duplicateNames.length > 0
              ? "attention"
              : "ready"
          }
        >
          <span>Duplicate Names</span>
          <strong>{snapshot.verification.duplicateNames.length}</strong>
          <small>DisplayName</small>
        </article>
        <article
          className={
            snapshot.verification.orphanedManagerSeasons.length > 0
              ? "attention"
              : "ready"
          }
        >
          <span>Orphaned Seasons</span>
          <strong>{snapshot.verification.orphanedManagerSeasons.length}</strong>
          <small>ManagerSeason ohne Manager</small>
        </article>
      </section>

      <section
        className="manager-operations-panel"
        aria-label="Manager Operations Prepared"
      >
        <article>
          <span>Operational Management</span>
          <h2>Direkte Verwaltung im BMS Office</h2>
          <p>
            Der Import bleibt ein Migration Tool. Neue Manager, Pausen,
            Archivierung und Liga-Zuordnung werden künftig direkt hier
            gesteuert.
          </p>
        </article>
        <div>
          <Link href="/admin/managers/new">Manager anlegen</Link>
          <button disabled type="button">Manager pausieren</button>
          <button disabled type="button">Archivieren</button>
          <button disabled type="button">Liga zuweisen</button>
        </div>
      </section>

      <section className="player-master-groups" aria-label="Manager Seasons">
        {snapshot.managers.length === 0 ? (
          <article className="player-position-section">
            <header>
              <div>
                <span>Active Managers</span>
                <h2>Aktive Manager</h2>
              </div>
              <strong>0</strong>
            </header>
            <div className="player-master-empty">
              Keine aktiven Manager vorhanden.
            </div>
          </article>
        ) : (
          snapshot.leagues.map((league) => {
            const managers = snapshot.managers.filter(
              (manager) => manager.league === league,
            );

            return (
              <article className="player-position-section" key={league}>
                <header>
                  <div>
                    <span>League</span>
                    <h2>{leagueLabels[league]}</h2>
                  </div>
                  <strong>{managers.length}</strong>
                </header>

                {managers.length > 0 ? (
                  <div className="player-card-grid">
                    {managers.map((manager) => (
                      <ManagerCard key={manager.id} manager={manager} />
                    ))}
                  </div>
                ) : (
                  <div className="player-master-empty">
                    Keine aktiven Manager in dieser Liga.
                  </div>
                )}
              </article>
            );
          })
        )}

        <article
          className="player-position-section archived-manager-section"
          aria-labelledby="archived-managers"
        >
          <header>
            <div>
              <span>Archiv</span>
              <h2 id="archived-managers">Archivierte Manager</h2>
            </div>
            <strong>{snapshot.archivedManagers.length}</strong>
          </header>

          {snapshot.archivedManagers.length > 0 ? (
            <div className="player-card-grid">
              {snapshot.archivedManagers.map((manager) => (
                <ArchivedManagerCard
                  currentSeason={snapshot.currentSeason}
                  key={manager.id}
                  manager={manager}
                />
              ))}
            </div>
          ) : (
            <div className="player-master-empty">Keine archivierten Manager.</div>
          )}
        </article>
      </section>
    </main>
  );
}

function ManagerCard({ manager }: { manager: ManagerSeasonRecord }) {
  return (
    <article className={`player-master-card ${manager.status.toLowerCase()}`}>
      <header>
        <div>
          <span>{manager.shortName}</span>
          <h3>{manager.displayName}</h3>
        </div>
        <strong>{manager.participation}</strong>
      </header>
      <div className="player-master-card-meta">
        <div>
          <span>Status</span>
          <strong>{manager.managerStatus}</strong>
        </div>
        <div>
          <span>Current League</span>
          <strong>{leagueLabels[manager.league]}</strong>
        </div>
        <div>
          <span>Season</span>
          <strong>{manager.status}</strong>
        </div>
        <div>
          <span>Budget</span>
          <strong>{formatBudget(manager.budget)}</strong>
        </div>
        <div>
          <span>Participation</span>
          <strong>{manager.participation}</strong>
        </div>
        <div>
          <span>Titles</span>
          <strong>Placeholder</strong>
        </div>
        <div>
          <span>Linked User</span>
          <strong>
            {manager.linkedUser
              ? manager.linkedUser.displayName
              : "Kein Benutzer verknüpft"}
          </strong>
        </div>
      </div>
      <ManagerCardActions manager={manager} showArchiveAction />
    </article>
  );
}

function ArchivedManagerCard({
  currentSeason,
  manager,
}: {
  currentSeason: string;
  manager: ManagerSeasonRecord;
}) {
  return (
    <article className="player-master-card archived">
      <header>
        <div>
          <span>{manager.shortName}</span>
          <h3>{manager.displayName}</h3>
        </div>
        <strong>{manager.managerStatus}</strong>
      </header>
      <div className="player-master-card-meta">
        <div>
          <span>Status</span>
          <strong>{manager.managerStatus}</strong>
        </div>
        <div>
          <span>Letzte Liga</span>
          <strong>{leagueLabels[manager.league]}</strong>
        </div>
        <div>
          <span>Letzte Saison</span>
          <strong>{currentSeason}</strong>
        </div>
        <div>
          <span>Season Status</span>
          <strong>{manager.status}</strong>
        </div>
      </div>
      <ManagerCardActions
        manager={manager}
        showArchiveAction={false}
        showReactivateAction
      />
    </article>
  );
}

function ManagerCardActions({
  manager,
  showArchiveAction,
  showReactivateAction = false,
}: {
  manager: ManagerSeasonRecord;
  showArchiveAction: boolean;
  showReactivateAction?: boolean;
}) {
  return (
    <div className="manager-card-actions">
      <Link href={`/admin/managers/${manager.id}`}>Workspace öffnen</Link>
      {showArchiveAction ? (
        <form action={archiveManagerAction}>
          <input name="managerId" type="hidden" value={manager.managerId} />
          <button type="submit">Archivieren</button>
        </form>
      ) : null}
      {showReactivateAction ? (
        <details className="manager-reactivate-zone">
          <summary>Reaktivieren</summary>
          <div>
            <strong>Manager wieder aktivieren?</strong>
            <p>
              Der Manager wird in der aktuellen Saison wieder als aktiv geführt.
              Historische Daten bleiben erhalten.
            </p>
            <form action={reactivateManagerAction}>
              <input name="managerId" type="hidden" value={manager.managerId} />
              <button type="submit">Reaktivieren</button>
            </form>
          </div>
        </details>
      ) : null}
      <details className="manager-danger-zone">
        <summary>Endgültig löschen</summary>
        <div>
          <strong>Nur Admin/Dev: endgültig löschen</strong>
          <p>
            Diese Aktion ist nur für Test- und Korrekturfälle gedacht.
            Historische Daten können dadurch verloren gehen.
          </p>
          <form action={hardDeleteManagerAction}>
            <input name="managerId" type="hidden" value={manager.managerId} />
            <input
              name="expectedDisplayName"
              type="hidden"
              value={manager.displayName}
            />
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

async function archiveManagerAction(formData: FormData) {
  "use server";

  const managerId = readFormValue(formData, "managerId");

  if (!managerId) {
    redirect("/admin/managers?error=archive");
  }

  try {
    await archiveManager(managerId);
  } catch (error) {
    console.error("Archive manager failed", error);
    redirect("/admin/managers?error=archive");
  }

  redirect("/admin/managers?archived=1");
}

async function reactivateManagerAction(formData: FormData) {
  "use server";

  const managerId = readFormValue(formData, "managerId");

  if (!managerId) {
    redirect("/admin/managers?error=reactivate");
  }

  try {
    await reactivateManager(managerId);
  } catch (error) {
    console.error("Reactivate manager failed", error);
    redirect("/admin/managers?error=reactivate");
  }

  redirect("/admin/managers?reactivated=1");
}

async function hardDeleteManagerAction(formData: FormData) {
  "use server";

  const managerId = readFormValue(formData, "managerId");
  const expectedDisplayName = readFormValue(formData, "expectedDisplayName");
  const confirmation = readFormValue(formData, "confirmation");

  if (!managerId || !expectedDisplayName || !confirmation) {
    redirect("/admin/managers?error=confirmation");
  }

  if (
    normalizeConfirmation(confirmation) !==
    normalizeConfirmation(expectedDisplayName)
  ) {
    redirect("/admin/managers?error=confirmation");
  }

  try {
    await hardDeleteManager(managerId);
  } catch (error) {
    console.error("Hard delete manager failed", error);
    redirect("/admin/managers?error=delete");
  }

  redirect("/admin/managers?deleted=1");
}

function readFormValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function normalizeConfirmation(value: string): string {
  return value.trim().normalize("NFC");
}

function formatBudget(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)} Mio.`;
}
