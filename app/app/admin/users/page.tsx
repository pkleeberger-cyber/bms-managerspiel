import { redirect } from "next/navigation";

import {
  createInvitedUser,
  loadUserAdministration,
} from "@/application/user-service";
import type { UserRecord, UserRole } from "@/infrastructure";

export const dynamic = "force-dynamic";

type UserAdministrationPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
  }>;
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  DATA_MAINTAINER: "Datenpflege",
  MANAGER: "Manager",
};

export default async function UserAdministrationPage({
  searchParams,
}: UserAdministrationPageProps) {
  const params = await searchParams;
  const snapshot = await loadUserAdministration();

  return (
    <main className="player-master user-admin-page">
      <header className="player-master-title">
        <span>Administration / Benutzer</span>
        <h1>Benutzer & Manager-Verknüpfung</h1>
        <p>
          Benutzer sind Login-Konten. Manager bleiben die operative Team-Identität
          und können nach der Migration ohne Benutzer existieren.
        </p>
      </header>

      <section className="player-master-hero user-admin-hero" aria-labelledby="user-admin-hero">
        <div>
          <span className="matchday-ops-eyebrow">Account Foundation</span>
          <h2 id="user-admin-hero">Login-Benutzer werden mit Managern verknüpft.</h2>
          <p>
            Admins und Datenpflege können ohne Manager arbeiten. Normale
            Manager-Benutzer werden später exakt einem Manager zugeordnet.
          </p>
        </div>
        <div className="player-master-hero-grid">
          <article>
            <span>Benutzer</span>
            <strong>{snapshot.userCount}</strong>
            <small>Konten</small>
          </article>
          <article>
            <span>Verknüpft</span>
            <strong>{snapshot.linkedManagerCount}</strong>
            <small>User → Manager</small>
          </article>
          <article>
            <span>Unlinked Managers</span>
            <strong>{snapshot.unlinkedManagerCount}</strong>
            <small>Migration offen</small>
          </article>
          <article>
            <span>Database Status</span>
            <strong>
              {snapshot.databaseStatus === "CONNECTED"
                ? "Datenbank"
                : "Nicht verfügbar"}
            </strong>
            <small>Keine Auth aktiv</small>
          </article>
        </div>
      </section>

      {params?.created ? (
        <section className="player-import-success" aria-live="polite">
          <div>
            <span>✓ Benutzer vorbereitet</span>
            <h2>Einladungsplatzhalter wurde erstellt.</h2>
          </div>
        </section>
      ) : null}

      {params?.error ? (
        <section className="player-import-warning" aria-live="assertive">
          <strong>{params.error}</strong>
          <span>Die Benutzeränderung wurde nicht angewendet.</span>
        </section>
      ) : null}

      <section className="user-admin-invite-card" aria-label="Create invited user">
        <article>
          <span>Invited User Placeholder</span>
          <h2>Benutzer vorbereiten</h2>
          <p>
            Kein Passwort, keine Anmeldung, keine Auth-Implementierung. Dieser
            Platzhalter dient nur der späteren Verknüpfung.
          </p>
        </article>
        <form action={createInvitedUserAction} className="user-admin-invite-form">
          <label>
            <span>E-Mail</span>
            <input name="email" required type="email" />
          </label>
          <label>
            <span>Anzeigename</span>
            <input name="displayName" required type="text" />
          </label>
          <label>
            <span>Rolle</span>
            <select defaultValue="MANAGER" name="role" required>
              <option value="ADMIN">Admin</option>
              <option value="DATA_MAINTAINER">Datenpflege</option>
              <option value="MANAGER">Manager</option>
            </select>
          </label>
          <button type="submit">Einladung vorbereiten</button>
        </form>
      </section>

      <section className="user-admin-workspace" aria-label="Users">
        <article className="player-position-section">
          <header>
            <div>
              <span>User Accounts</span>
              <h2>Benutzer</h2>
            </div>
            <strong>{snapshot.users.length}</strong>
          </header>
          {snapshot.users.length > 0 ? (
            <div className="player-card-grid">
              {snapshot.users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          ) : (
            <div className="user-admin-empty-state">
              <strong>Noch keine Benutzer angelegt.</strong>
              <span>
                Erstelle zuerst Einladungsplatzhalter. Authentifizierung wird
                später separat umgesetzt.
              </span>
            </div>
          )}
        </article>

        <article className="player-position-section">
          <header>
            <div>
              <span>Managers ohne User</span>
              <h2>Unlinked Managers</h2>
            </div>
            <strong>{snapshot.unlinkedManagers.length}</strong>
          </header>
          {snapshot.unlinkedManagers.length > 0 ? (
            <div className="player-card-grid">
              {snapshot.unlinkedManagers.slice(0, 12).map((manager) => (
                <article className="player-master-card" key={manager.id}>
                  <header>
                    <div>
                      <span>{manager.shortName}</span>
                      <h3>{manager.displayName}</h3>
                    </div>
                    <strong>Unlinked</strong>
                  </header>
                  <button disabled type="button">Benutzer verknüpfen</button>
                </article>
              ))}
            </div>
          ) : (
            <div className="user-admin-empty-state">
              <strong>Keine offenen Manager-Verknüpfungen.</strong>
              <span>
                Aktuell gibt es keine migrierten Manager ohne User-Link.
              </span>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function UserCard({ user }: { user: UserRecord }) {
  return (
    <article className={`player-master-card ${user.status.toLowerCase()}`}>
      <header>
        <div>
          <span>{roleLabels[user.role]}</span>
          <h3>{user.displayName}</h3>
        </div>
        <strong>{user.status}</strong>
      </header>
      <div className="player-master-card-meta">
        <div>
          <span>E-Mail</span>
          <strong>{user.email}</strong>
        </div>
        <div>
          <span>Linked Manager</span>
          <strong>{user.manager?.displayName ?? "Kein Manager"}</strong>
        </div>
      </div>
      <button disabled type="button">
        {user.manager ? "Verknüpfung lösen" : "Manager verknüpfen"}
      </button>
    </article>
  );
}

async function createInvitedUserAction(formData: FormData) {
  "use server";

  const email = readRequiredFormValue(formData, "email");
  const displayName = readRequiredFormValue(formData, "displayName");
  const role = readRole(formData.get("role"));

  try {
    await createInvitedUser({ email, displayName, role });
  } catch (error) {
    console.error("Create invited user failed", error);
    redirect(
      `/admin/users?error=${encodeURIComponent(
        error instanceof Error
          ? error.message
          : "Benutzer konnte nicht erstellt werden.",
      )}`,
    );
  }

  redirect("/admin/users?created=1");
}

function readRequiredFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} fehlt.`);
  }

  return value.trim();
}

function readRole(value: FormDataEntryValue | null): UserRole {
  if (value === "ADMIN" || value === "DATA_MAINTAINER" || value === "MANAGER") {
    return value;
  }

  return "MANAGER";
}
