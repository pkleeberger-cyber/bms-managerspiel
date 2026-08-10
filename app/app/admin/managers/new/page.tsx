import Link from "next/link";
import { redirect } from "next/navigation";

import { createManager } from "@/application/manager-service";
import type { ManagerLeagueLevel, ManagerSeasonStatus } from "@/infrastructure";

export const dynamic = "force-dynamic";

type NewManagerPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewManagerPage({ searchParams }: NewManagerPageProps) {
  const params = await searchParams;

  return (
    <main className="player-master manager-create-page">
      <header className="player-master-title">
        <span>Administration / Manager / Neu</span>
        <h1>Manager anlegen</h1>
        <p>
          Erstellt eine permanente Manager-Identität und die ManagerSeason für
          die aktive Saison. Kein Benutzerkonto wird automatisch erzeugt.
        </p>
      </header>

      <section className="player-master-hero manager-create-hero" aria-labelledby="new-manager-hero">
        <div>
          <span className="matchday-ops-eyebrow">Operational Management</span>
          <h2 id="new-manager-hero">Manager und Saison-Teilnahme gemeinsam anlegen.</h2>
          <p>
            Manager ist die Team-Identität. Liga, Budget und Status gehören zur
            aktuellen ManagerSeason.
          </p>
        </div>
        <div className="player-master-hero-grid">
          <article>
            <span>Write Scope</span>
            <strong>Manager</strong>
            <small>Permanente Identität</small>
          </article>
          <article>
            <span>Write Scope</span>
            <strong>ManagerSeason</strong>
            <small>Aktive Saison</small>
          </article>
          <article>
            <span>User Account</span>
            <strong>Nicht automatisch</strong>
            <small>Später verknüpfen</small>
          </article>
        </div>
      </section>

      {params?.error ? (
        <section className="player-import-warning" aria-live="assertive">
          <strong>Der Manager konnte nicht angelegt werden.</strong>
          <span>Der Manager wurde nicht angelegt.</span>
        </section>
      ) : null}

      <section className="manager-create-layout" aria-label="Create Manager">
        <article className="manager-create-copy-card">
          <span>New Manager</span>
          <h2>Basisdaten</h2>
          <p>
            Diese Form ist bewusst klein. Kader, Benutzerkonto und Titel werden
            separat gepflegt.
          </p>
          <div>
            <strong>Schreibt genau zwei Objekte</strong>
            <small>Manager · ManagerSeason der aktiven Saison</small>
          </div>
          <div>
            <strong>Kein Login-Konto</strong>
            <small>Benutzer werden separat vorbereitet und verknüpft.</small>
          </div>
        </article>
        <form action={createManagerAction} className="manager-create-form-card">
          <div className="manager-create-form-grid">
            <label className="wide">
              <span>DisplayName</span>
              <input name="displayName" required type="text" />
            </label>
            <label>
              <span>ShortName</span>
              <input name="shortName" required type="text" />
            </label>
            <label>
              <span>Liga</span>
              <select defaultValue="FIRST" name="league" required>
                <option value="FIRST">Erste Liga</option>
                <option value="SECOND">Zweite Liga</option>
              </select>
            </label>
            <label>
              <span>Budget</span>
              <input name="budget" required step="0.1" type="number" />
            </label>
            <label>
              <span>Status</span>
              <select defaultValue="ACTIVE" name="status" required>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
          </div>
          <div className="manager-create-actions">
            <button type="submit">Manager anlegen</button>
            <Link href="/admin/managers">Zurück zum Manager Master</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

async function createManagerAction(formData: FormData) {
  "use server";

  const displayName = readRequiredFormValue(formData, "displayName");
  const shortName = normalizeShortName(readRequiredFormValue(formData, "shortName"));
  const league = readLeague(formData.get("league"));
  const budget = readBudget(formData.get("budget"));
  const status = readStatus(formData.get("status"));

  try {
    await createManager({
      displayName,
      shortName,
      league,
      budget,
      status,
    });
  } catch (error) {
    console.error("Create manager failed", error);
    redirect("/admin/managers/new?error=1");
  }

  redirect("/admin/managers?created=1");
}

function readRequiredFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} fehlt.`);
  }

  return value.trim();
}

function normalizeShortName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readLeague(value: FormDataEntryValue | null): ManagerLeagueLevel {
  return value === "SECOND" ? "SECOND" : "FIRST";
}

function readStatus(value: FormDataEntryValue | null): ManagerSeasonStatus {
  if (value === "PAUSED" || value === "ARCHIVED") {
    return value;
  }

  return "ACTIVE";
}

function readBudget(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}
