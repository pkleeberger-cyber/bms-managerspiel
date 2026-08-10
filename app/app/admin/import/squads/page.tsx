import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import {
  applySquadImport,
  createSquadImportPreview,
} from "@/application/squad-import-service";
import type {
  ManagerSquadPreview,
  NormalizedImportedSquadSlot,
  SquadValidationIssue,
} from "@/application/squad-import-service";

type SquadImportReviewPageProps = {
  searchParams?: Promise<{
    workbook?: string;
    filename?: string;
    result?: string;
    importedManagers?: string;
    importedSlots?: string;
    warnings?: string;
    duration?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SquadImportReviewPage({
  searchParams,
}: SquadImportReviewPageProps) {
  const params = await searchParams;
  const preview = await createSquadImportPreview(params?.workbook);
  const result =
    params?.result === "success"
      ? {
          importedManagers: Number(params.importedManagers ?? 0),
          importedSlots: Number(params.importedSlots ?? 0),
          warnings: Number(params.warnings ?? 0),
          duration: Number(params.duration ?? 0),
        }
      : null;
  const importError =
    params?.result === "error"
      ? params.message || "Anfangskader-Migration konnte nicht abgeschlossen werden."
      : null;
  const blockingIssueCount =
    preview.missingPlayers.length +
    preview.missingManagers.length +
    preview.duplicateSlotAssignments.length +
    preview.validationIssues.length +
    preview.warnings.length;
  const summaryCards = [
    {
      label: "Managers",
      value: preview.parsedManagers,
      detail: "Im Workbook",
      tone: "ready",
    },
    {
      label: "Anfangskader gültig",
      value: preview.squadsValid,
      detail: "18 Slots geprüft",
      tone: blockingIssueCount === 0 ? "ready" : "attention",
    },
    {
      label: "Missing Players",
      value: preview.missingPlayers.length,
      detail: "Player Master",
      tone: preview.missingPlayers.length > 0 ? "attention" : "ready",
    },
    {
      label: "Missing Managers",
      value: preview.missingManagers.length,
      detail: "ManagerSeason",
      tone: preview.missingManagers.length > 0 ? "attention" : "ready",
    },
    {
      label: "Duplicate Slots",
      value: preview.duplicateSlotAssignments.length,
      detail: "Slot IDs",
      tone: preview.duplicateSlotAssignments.length > 0 ? "attention" : "ready",
    },
    {
      label: "Validation Issues",
      value: preview.validationIssues.length,
      detail: "18 Slots · Positionen",
      tone: preview.validationIssues.length > 0 ? "attention" : "ready",
    },
  ] as const;

  return (
    <main className="player-import-review">
      <header className="player-import-title">
        <span>Administration / Import / Anfangskader</span>
        <h1>Anfangskader-Migration</h1>
        <p>
          Prüfe den offiziellen Anfangskader aus Spieltag 1 des Saisonworkbooks,
          bevor historische Anfangskader-Zuweisungen geschrieben werden.
        </p>
      </header>

      <section className="player-import-hero" aria-labelledby="squad-import-hero">
        <div>
          <span className="matchday-ops-eyebrow">Preview vor Apply</span>
          <h2 id="squad-import-hero">Spieltag 1 → Manager → Slots → Spieler.</h2>
          <p>
            Die Migration importiert ausschließlich den Zustand aus Matchday 1.
            Spätere Kaderstände entstehen später durch Transfers, nicht durch
            Import aller Spieltage.
          </p>
        </div>
        <div className="player-import-hero-grid">
          <article>
            <span>Workbook</span>
            <strong>{preview.workbookName ?? "Nicht gefunden"}</strong>
            <small>{preview.workbookPath ?? "Saisonworkbook hochladen"}</small>
          </article>
          <article>
            <span>Season</span>
            <strong>{preview.seasonName ?? "Keine aktive Saison"}</strong>
            <small>ManagerSeason Ziel</small>
          </article>
          <article>
            <span>Slots</span>
            <strong>{preview.parsedSlots}</strong>
            <small>Nur Spieltag 1</small>
          </article>
        </div>
      </section>

      {result ? (
        <section className="player-import-success" aria-live="polite">
          <div>
            <span>✓ Import erfolgreich</span>
            <h2>{result.importedManagers} Anfangskader übernommen</h2>
          </div>
          <div className="player-import-success-grid">
            <strong>{result.importedSlots} Slots importiert</strong>
            <strong>{result.warnings} Warnungen</strong>
            <strong>{result.duration} ms</strong>
          </div>
        </section>
      ) : null}

      {importError ? (
        <section className="player-import-warning" aria-live="assertive">
          <strong>{importError}</strong>
          <span>Technische Details stehen im Server-Log.</span>
        </section>
      ) : null}

      {preview.warnings.length > 0 ? (
        <section className="player-import-warning">
          {preview.warnings.map((warning) => (
            <strong key={warning}>{warning}</strong>
          ))}
        </section>
      ) : null}

      <form
        action={createSquadImportPreviewAction}
        className="player-import-actions"
        aria-label="Anfangskader Workbook Auswahl"
      >
        <label>
          <span>Datei auswählen</span>
          <input
            accept=".xlsx"
            name="workbookFile"
            required
            type="file"
          />
          <small>{params?.filename ?? "Keine Datei ausgewählt"}</small>
        </label>
        <button type="submit">Vorschau erstellen</button>
        <span>
          Die Vorschau liest nur `1.Spieltag` beziehungsweise Matchday 1 aus dem
          offiziellen Saisonworkbook.
        </span>
      </form>

      <section className="player-import-summary" aria-label="Anfangskader Summary">
        {summaryCards.map((card) => (
          <article className={card.tone} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>

      <form
        action={applySquadImportAction}
        className="player-import-actions"
        aria-label="Anfangskader Migration Aktionen"
      >
        <input name="workbookPath" type="hidden" value={preview.workbookPath ?? ""} />
        <label className="player-import-confirmation">
          <input name="confirmed" required type="checkbox" value="yes" />
          <span>You are about to create INITIAL_SQUAD assignments from matchday 1.</span>
        </label>
        <button
          className="primary"
          disabled={!preview.workbookPath || blockingIssueCount > 0}
          type="submit"
        >
          Import übernehmen
        </button>
        <a href="/admin/import">Abbrechen</a>
        <span>Apply schreibt transaktional und erstellt ein Audit.</span>
      </form>

      <div className="player-import-review-grid">
        <SquadSection
          emptyLabel="Keine neuen Anfangskader."
          items={preview.newSquads.slice(0, 8)}
          title="Neue Anfangskader"
        />
        <SquadSection
          emptyLabel="Keine geänderten Anfangskader."
          items={preview.changedSquads.slice(0, 8)}
          title="Geänderte Anfangskader"
        />
        <SquadSection
          emptyLabel="Keine unveränderten Anfangskader."
          items={preview.unchangedSquads.slice(0, 8)}
          title="Unveränderte Anfangskader"
        />
        <SlotIssueSection
          emptyLabel="Keine fehlenden Spieler."
          items={preview.missingPlayers.slice(0, 12)}
          title="Missing Players"
        />
        <TextIssueSection
          emptyLabel="Keine fehlenden Manager."
          items={preview.missingManagers.slice(0, 12)}
          title="Missing Managers"
        />
        <ValidationIssueSection
          emptyLabel="Keine Validierungsfehler."
          items={[
            ...preview.duplicateSlotAssignments,
            ...preview.validationIssues,
          ].slice(0, 12)}
          title="Validation"
        />
      </div>
    </main>
  );
}

async function applySquadImportAction(formData: FormData) {
  "use server";

  const confirmed = formData.get("confirmed") === "yes";
  const workbookPathValue = formData.get("workbookPath");
  const workbookPath =
    typeof workbookPathValue === "string" && workbookPathValue.length > 0
      ? workbookPathValue
      : undefined;

  if (!confirmed) {
    throw new Error("Anfangskader-Migration erfordert die finale Bestätigung.");
  }

  let result;

  try {
    result = await applySquadImport(workbookPath);
  } catch (error) {
    console.error("Initial squad migration failed", error);
    const params = new URLSearchParams({
      result: "error",
      message: "Anfangskader-Migration konnte nicht abgeschlossen werden.",
    });

    if (workbookPath) {
      params.set("workbook", workbookPath);
    }

    redirect(`/admin/import/squads?${params.toString()}`);
  }

  const params = new URLSearchParams({
    result: "success",
    importedManagers: String(result.importedManagers),
    importedSlots: String(result.importedSlots),
    warnings: String(result.warnings),
    duration: String(result.durationMs),
  });

  if (workbookPath) {
    params.set("workbook", workbookPath);
  }

  redirect(`/admin/import/squads?${params.toString()}`);
}

async function createSquadImportPreviewAction(formData: FormData) {
  "use server";

  const workbookFile = formData.get("workbookFile");

  if (!(workbookFile instanceof File) || workbookFile.size === 0) {
    const params = new URLSearchParams({
      result: "error",
      message: "Bitte eine .xlsx-Datei auswählen.",
    });

    redirect(`/admin/import/squads?${params.toString()}`);
  }

  let previewUrl: string;

  try {
    const upload = await saveUploadedWorkbook(workbookFile);
    const params = new URLSearchParams({
      workbook: upload.path,
      filename: upload.filename,
    });

    previewUrl = `/admin/import/squads?${params.toString()}`;
  } catch (error) {
    console.error("Initial squad migration preview upload failed", error);

    const params = new URLSearchParams({
      result: "error",
      message: "Vorschau konnte nicht erstellt werden.",
    });

    redirect(`/admin/import/squads?${params.toString()}`);
  }

  redirect(previewUrl);
}

async function saveUploadedWorkbook(file: File) {
  const filename = path.basename(file.name);

  if (path.extname(filename).toLowerCase() !== ".xlsx") {
    throw new Error("Only .xlsx initial squad migration files are supported.");
  }

  const uploadDirectory = path.join(os.tmpdir(), "bms-initial-squad-imports");
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

function SquadSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly ManagerSquadPreview[];
  title: string;
}) {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Anfangskader</span>
        <h2>{title}</h2>
      </header>
      {items.length > 0 ? (
        <div className="player-import-list">
          {items.map((squad) => (
            <article key={squad.managerSeasonId}>
              <strong>{squad.managerName}</strong>
              <span>
                {squad.league} · {squad.slots.length} Slots ·{" "}
                {squad.slots
                  .slice(0, 3)
                  .map((slot) => `${slot.slotId}: ${slot.player.displayName}`)
                  .join(" · ")}
              </span>
              <small>validFromMatchday 1 · validToMatchday offen</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function SlotIssueSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly NormalizedImportedSquadSlot[];
  title: string;
}) {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Mappings</span>
        <h2>{title}</h2>
      </header>
      {items.length > 0 ? (
        <div className="player-import-list">
          {items.map((slot) => (
            <article key={`${slot.managerShortName}-${slot.slotId}-${slot.sourceRow}`}>
              <strong>{slot.playerName}</strong>
              <span>
                {slot.managerName} · Slot {slot.slotId} · erwartet{" "}
                {slot.expectedPosition}
              </span>
              <small>
                {slot.sourceSheet} · Zeile {slot.sourceRow}
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

function TextIssueSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly string[];
  title: string;
}) {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Managers</span>
        <h2>{title}</h2>
      </header>
      {items.length > 0 ? (
        <div className="player-import-list">
          {items.map((item) => (
            <article key={item}>
              <strong>{item}</strong>
              <span>Keine ManagerSeason in Prisma gefunden.</span>
              <small>Manager Import zuerst ausführen</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function ValidationIssueSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly SquadValidationIssue[];
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
          {items.map((item) => (
            <article key={`${item.managerName}-${item.message}`}>
              <strong>{item.managerName}</strong>
              <span>{item.message}</span>
              <small>Apply blockiert</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}
