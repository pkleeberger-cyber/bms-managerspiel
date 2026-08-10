import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import {
  applyManagerImport,
  createManagerImportPreview,
} from "@/application/manager-import-service";
import type {
  ManagerImportContextInput,
  ManagerImportChange,
  ManagerImportResult,
  ManagerImportValidationIssue,
  NormalizedImportedManagerSeason,
} from "@/application/manager-import-service";
import type { ManagerSeasonRecord } from "@/infrastructure";

type ManagerImportReviewPageProps = {
  searchParams?: Promise<{
    workbook?: string;
    filename?: string;
    seasonId?: string;
    result?: string;
    imported?: string;
    existing?: string;
    leagueChanges?: string;
    budgetChanges?: string;
    pausedManagers?: string;
    errors?: string;
    duration?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ManagerImportReviewPage({
  searchParams,
}: ManagerImportReviewPageProps) {
  const params = await searchParams;
  const importContext: ManagerImportContextInput = {
    seasonId: params?.seasonId,
    filename: params?.filename,
  };
  const preview = await createManagerImportPreview(params?.workbook, {
    allowDiscovery: false,
    context: importContext,
  });
  const importResult =
    params?.result === "success"
      ? {
          imported: Number(params.imported ?? 0),
          existing: Number(params.existing ?? 0),
          leagueChanges: Number(params.leagueChanges ?? 0),
          budgetChanges: Number(params.budgetChanges ?? 0),
          pausedManagers: Number(params.pausedManagers ?? 0),
          errors: Number(params.errors ?? 0),
          duration: Number(params.duration ?? 0),
        }
      : null;
  const importError =
    params?.result === "error"
      ? params.message || "Manager Import konnte nicht abgeschlossen werden."
      : null;
  const summaryCards = [
    {
      label: "New Managers",
      value: preview.newManagers.length,
      detail: "Neue Identitäten",
      tone: "ready",
    },
    {
      label: "Existing Managers",
      value: preview.existingManagers.length,
      detail: "Bereits bekannt",
      tone: "ready",
    },
    {
      label: "League Changes",
      value: preview.leagueChanges.length,
      detail: "Ligawechsel",
      tone: "attention",
    },
    {
      label: "Budget Changes",
      value: preview.budgetChanges.length,
      detail: "Budgetänderungen",
      tone: "attention",
    },
    {
      label: "Active Managers",
      value: preview.activeManagers.length,
      detail: "ACTIVE im Workbook",
      tone: "ready",
    },
    {
      label: "Paused / Archived",
      value:
        preview.pausedImportedManagers.length +
        preview.archivedImportedManagers.length,
      detail: "Status aus Quelle",
      tone: "waiting",
    },
    {
      label: "Missing Required",
      value: preview.missingRequiredData.length,
      detail: "Pflichtdaten",
      tone: preview.missingRequiredData.length > 0 ? "attention" : "ready",
    },
  ] as const;

  return (
    <main className="player-import-review">
      <header className="player-import-title">
        <span>Administration / Import / Manager Season · Migration Tool</span>
        <h1>Manager Season Import Review</h1>
        <p>
          Prüfe Manager-Identitäten und saisonale Teilnahmen für Initialmigration
          oder Ausnahmefälle. Der produktive Betrieb erfolgt später direkt im
          BMS Office.
        </p>
      </header>

      <section className="player-import-hero" aria-labelledby="manager-import-hero">
        <div>
          <span className="matchday-ops-eyebrow">Migration Preview vor Apply</span>
          <h2 id="manager-import-hero">
            Welche ManagerSeason-Daten ändern sich?
          </h2>
          <p>
            Manager bleiben permanente Identitäten. Dieser Import ist kein
            wiederkehrender Jahresprozess, sondern ein kontrolliertes
            Migrationswerkzeug.
          </p>
        </div>
        <div className="player-import-hero-grid">
          <article>
            <span>Workbook</span>
            <strong>{preview.workbookName ?? "Nicht gefunden"}</strong>
            <small>{preview.workbookPath ?? "MANAGER_IMPORT_WORKBOOK_PATH"}</small>
          </article>
          <article>
            <span>Season</span>
            <strong>{preview.seasonName ?? "Keine aktive Saison"}</strong>
            <small>ManagerSeason Ziel</small>
          </article>
          <article>
            <span>Parsed Managers</span>
            <strong>{preview.parsedManagers}</strong>
            <small>Normalisiert</small>
          </article>
        </div>
      </section>

      {importResult ? (
        <section className="player-import-success" aria-live="polite">
          <div>
            <span>✓ Import erfolgreich</span>
            <h2>{preview.parsedManagers} Manager geprüft</h2>
          </div>
          <div className="player-import-success-grid">
            <strong>{importResult.imported} neue Manager</strong>
            <strong>{importResult.existing} bestehend</strong>
            <strong>{importResult.leagueChanges} Ligawechsel</strong>
            <strong>{importResult.budgetChanges} Budgetänderungen</strong>
            <strong>{importResult.pausedManagers} pausiert</strong>
            <strong>{importResult.errors} Fehler</strong>
          </div>
        </section>
      ) : null}

      {importError ? (
        <section className="player-import-warning" aria-live="assertive">
          <strong>{importError}</strong>
          <span>
            Die Migration wurde nicht angewendet. Details stehen im Server-Log.
          </span>
        </section>
      ) : null}

      <form
        action={createManagerImportPreviewAction}
        className="player-import-upload"
      >
        <label>
          <span>Datei auswählen</span>
          <input accept=".xlsx" name="workbookFile" required type="file" />
          <small>{params?.filename ?? "Keine Datei ausgewählt"}</small>
        </label>
        <label>
          <span>Saison</span>
          <select defaultValue={preview.seasonId ?? ""} name="seasonId" required>
            {preview.seasons.length > 0 ? (
              preview.seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))
            ) : (
              <option value="">Keine Saison verfügbar</option>
            )}
          </select>
        </label>
        <button type="submit">Vorschau erstellen</button>
        <span>
          Manager-Import ist ein Migrationstool. Neue Manager werden später
          direkt im BMS Office angelegt.
        </span>
      </form>

      {preview.warnings.length > 0 ? (
        <section className="player-import-warning">
          {preview.warnings.map((warning) => (
            <strong key={warning}>{warning}</strong>
          ))}
        </section>
      ) : null}

      <section className="player-import-summary" aria-label="Manager Import Summary">
        {summaryCards.map((card) => (
          <article className={card.tone} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>

      <form
        action={applyManagerImportAction}
        className="player-import-actions"
        aria-label="Manager Import Aktionen"
      >
        <input name="workbookPath" type="hidden" value={preview.workbookPath ?? ""} />
        <input name="seasonId" type="hidden" value={preview.seasonId ?? ""} />
        <input name="filename" type="hidden" value={preview.workbookName ?? ""} />
        <label className="player-import-confirmation">
          <input name="confirmed" required type="checkbox" value="yes" />
          <span>You are about to update Manager Seasons.</span>
        </label>
        <button
          className="primary"
          disabled={
            !preview.workbookPath ||
            preview.warnings.length > 0 ||
            !preview.seasonId
          }
          type="submit"
        >
          Import übernehmen
        </button>
        <a href="/admin/import">Abbrechen</a>
        <span>Apply schreibt Manager, ManagerSeason und Audit transaktional.</span>
      </form>

      <div className="player-import-review-grid">
        <ManagerPreviewSection
          emptyLabel="Keine neuen Manager."
          items={preview.newManagers.slice(0, 12)}
          title="New Managers"
        />
        <ManagerPreviewSection
          emptyLabel="Keine bestehenden Manager erkannt."
          items={preview.existingManagers.slice(0, 12)}
          title="Existing Managers"
        />
        <ManagerChangeSection
          emptyLabel="Keine Ligawechsel."
          items={preview.leagueChanges.slice(0, 12)}
          title="League Changes"
        />
        <ManagerChangeSection
          emptyLabel="Keine Budgetänderungen."
          items={preview.budgetChanges.slice(0, 12)}
          title="Budget Changes"
        />
        <PausedManagerSection
          emptyLabel="Keine pausierten Manager."
          items={preview.pausedManagers.slice(0, 12)}
          title="Paused Managers"
        />
        <ManagerPreviewSection
          emptyLabel="Keine archivierten Manager in der Quelle."
          items={preview.archivedImportedManagers.slice(0, 12)}
          title="Archived Managers"
        />
        <MissingManagerDataSection
          emptyLabel="Keine fehlenden Pflichtdaten."
          items={preview.missingRequiredData.slice(0, 12)}
          title="Missing Required Data"
        />
      </div>
    </main>
  );
}

async function applyManagerImportAction(formData: FormData) {
  "use server";

  const confirmed = formData.get("confirmed") === "yes";
  const workbookPathValue = formData.get("workbookPath");
  const workbookPath =
    typeof workbookPathValue === "string" && workbookPathValue.length > 0
      ? workbookPathValue
      : undefined;
  const seasonId = readStringFormValue(formData.get("seasonId"));
  const filename = readStringFormValue(formData.get("filename"));

  if (!confirmed) {
    throw new Error("Manager Import erfordert die finale Bestätigung.");
  }

  let result: ManagerImportResult;

  try {
    result = await applyManagerImport(workbookPath, {
      seasonId,
      filename,
    });
  } catch (error) {
    console.error("Manager import failed", error);

    const params = new URLSearchParams({
      result: "error",
      message: "Manager Import konnte nicht abgeschlossen werden.",
    });
    appendSearchParam(params, "workbook", workbookPath);
    appendSearchParam(params, "filename", filename);
    appendSearchParam(params, "seasonId", seasonId);

    redirect(`/admin/import/managers?${params.toString()}`);
  }

  const params = new URLSearchParams({
    result: "success",
    imported: String(result.imported),
    existing: String(result.existing),
    leagueChanges: String(result.leagueChanges),
    budgetChanges: String(result.budgetChanges),
    pausedManagers: String(result.pausedManagers),
    errors: String(result.errors),
    duration: String(result.durationMs),
  });
  appendSearchParam(params, "workbook", workbookPath);
  appendSearchParam(params, "filename", filename);
  appendSearchParam(params, "seasonId", seasonId);

  redirect(`/admin/import/managers?${params.toString()}`);
}

async function createManagerImportPreviewAction(formData: FormData) {
  "use server";

  const workbookFile = formData.get("workbookFile");
  const seasonId = readStringFormValue(formData.get("seasonId"));
  let previewUrl: string;

  if (!(workbookFile instanceof File) || workbookFile.size === 0) {
    const params = new URLSearchParams({
      result: "error",
      message: "Bitte eine .xlsx-Datei auswählen.",
    });

    redirect(`/admin/import/managers?${params.toString()}`);
  }

  try {
    const upload = await saveUploadedWorkbook(workbookFile);
    const params = new URLSearchParams({
      workbook: upload.path,
      filename: upload.filename,
    });
    appendSearchParam(params, "seasonId", seasonId);
    previewUrl = `/admin/import/managers?${params.toString()}`;
  } catch (error) {
    console.error("Manager import preview upload failed", error);

    const params = new URLSearchParams({
      result: "error",
      message: "Vorschau konnte nicht erstellt werden.",
    });
    appendSearchParam(params, "seasonId", seasonId);

    redirect(`/admin/import/managers?${params.toString()}`);
  }

  redirect(previewUrl);
}

async function saveUploadedWorkbook(file: File) {
  const filename = path.basename(file.name);

  if (path.extname(filename).toLowerCase() !== ".xlsx") {
    throw new Error("Only .xlsx manager import files are supported.");
  }

  const uploadDirectory = path.join(os.tmpdir(), "bms-manager-imports");
  await fs.mkdir(uploadDirectory, { recursive: true });
  const uploadPath = path.join(
    uploadDirectory,
    `${Date.now()}-${randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
  );
  await fs.writeFile(uploadPath, Buffer.from(await file.arrayBuffer()));

  return {
    filename,
    path: uploadPath,
  };
}

function ManagerPreviewSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly NormalizedImportedManagerSeason[];
  title: string;
}) {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Preview</span>
        <h2>{title}</h2>
      </header>
      {items.length > 0 ? (
        <div className="player-import-list">
          {items.map((manager) => (
            <article key={`${manager.sourceSheet}-${manager.sourceRow}`}>
              <strong>{manager.displayName}</strong>
              <span>
                {manager.league} · Budget {formatBudget(manager.budget)} ·{" "}
                {manager.participation}
              </span>
              <small>
                {manager.sourceSheet} · Zeile {manager.sourceRow}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function ManagerChangeSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly ManagerImportChange[];
  title: string;
}) {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Changes</span>
        <h2>{title}</h2>
      </header>
      {items.length > 0 ? (
        <div className="player-import-list">
          {items.map((change) => (
            <article key={`${change.imported.shortName}-${title}`}>
              <strong>{change.imported.displayName}</strong>
              <span>
                {change.changes
                  .map((item) => `${item.field}: ${item.before} → ${item.after}`)
                  .join(" · ")}
              </span>
              <small>{change.existing.shortName}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function PausedManagerSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly ManagerSeasonRecord[];
  title: string;
}) {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Paused</span>
        <h2>{title}</h2>
      </header>
      {items.length > 0 ? (
        <div className="player-import-list">
          {items.map((manager) => (
            <article key={manager.id}>
              <strong>{manager.displayName}</strong>
              <span>{manager.league} · wird auf PAUSED gesetzt</span>
              <small>{manager.shortName}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function MissingManagerDataSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly ManagerImportValidationIssue[];
  title: string;
}) {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Validation</span>
        <h2>{title}</h2>
      </header>
      {items.length > 0 ? (
        <div className="player-import-list">
          {items.map((issue) => (
            <article key={`${issue.sourceSheet}-${issue.sourceRow}-${issue.field}`}>
              <strong>{issue.field}</strong>
              <span>{issue.message}</span>
              <small>
                {issue.sourceSheet} · Zeile {issue.sourceRow}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function formatBudget(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)} Mio.`;
}

function readStringFormValue(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function appendSearchParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
) {
  if (value && value.length > 0) {
    params.set(key, value);
  }
}
