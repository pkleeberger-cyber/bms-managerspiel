import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import {
  applyPlayerImport,
  createPlayerImportPreview,
} from "@/application/player-import-service";
import type {
  NormalizedImportedPlayer,
  PlayerImportChange,
  PlayerImportContextInput,
  PlayerImportDuplicateWarning,
  PlayerImportResult,
} from "@/application/player-import-service";

type PlayerImportReviewPageProps = {
  searchParams?: Promise<{
    workbook?: string;
    filename?: string;
    seasonId?: string;
    phase?: string;
    note?: string;
    version?: string;
    result?: string;
    imported?: string;
    updated?: string;
    unchanged?: string;
    departures?: string;
    errors?: string;
    duration?: string;
    prismaPlayers?: string;
    duplicateNames?: string;
    missingClubs?: string;
    missingPositions?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function PlayerImportReviewPage({
  searchParams,
}: PlayerImportReviewPageProps) {
  const params = await searchParams;
  const phase = normalizePlayerImportPhase(params?.phase);
  const importContext: PlayerImportContextInput = {
    seasonId: params?.seasonId,
    phase,
    note: params?.note,
    filename: params?.filename,
  };
  const preview = await createPlayerImportPreview(params?.workbook, {
    allowDiscovery: false,
    context: importContext,
  });
  const importResult =
    params?.result === "success"
      ? {
          imported: Number(params.imported ?? 0),
          updated: Number(params.updated ?? 0),
          unchanged: Number(params.unchanged ?? 0),
          departures: Number(params.departures ?? 0),
          errors: Number(params.errors ?? 0),
          duration: Number(params.duration ?? 0),
          prismaPlayers: Number(params.prismaPlayers ?? 0),
          duplicateNames: Number(params.duplicateNames ?? 0),
          missingClubs: Number(params.missingClubs ?? 0),
          missingPositions: Number(params.missingPositions ?? 0),
          version: Number(params.version ?? 0),
        }
      : null;
  const importError =
    params?.result === "error"
      ? params.message || "Import konnte nicht abgeschlossen werden."
      : null;
  const activePhaseLabel =
    preview.importContext.phase === "SUMMER" ? "Sommer-Liste" : "Winter-Liste";
  const summaryCards = [
    {
      label: "New Players",
      value: preview.newPlayers.length,
      detail: "Neu im Workbook",
      tone: "ready",
    },
    {
      label: "Market Value Changes",
      value: preview.marketValueChanges.length,
      detail: "Wertänderungen",
      tone: "attention",
    },
    {
      label: "Club Changes",
      value: preview.clubChanges.length,
      detail: "Vereinswechsel",
      tone: "attention",
    },
    {
      label: "Bundesliga Departures",
      value: preview.leftBundesliga.length,
      detail: "Nicht mehr im Workbook",
      tone: "waiting",
    },
    {
      label: "Duplicates",
      value: preview.duplicateWarnings.length,
      detail: "Review erforderlich",
      tone: preview.duplicateWarnings.length > 0 ? "attention" : "ready",
    },
  ] as const;

  return (
    <main className="player-import-review">
      <header className="player-import-title">
        <span>Administration / Import / Player Master</span>
        <h1>Player Master Import Review</h1>
        <p>
          Prüfe den offiziellen Transfer-Workbook-Import, bevor Player-Daten in
          Prisma übernommen werden.
        </p>
      </header>

      <section className="player-import-hero" aria-labelledby="player-import-hero">
        <div>
          <span className="matchday-ops-eyebrow">Preview vor Apply</span>
          <h2 id="player-import-hero">Was ändert sich am Bundesliga-Spielerpool?</h2>
          <p>
            Der Import liest das Workbook, normalisiert die Spieler und vergleicht
            sie gegen den aktuellen Prisma Player Master. Es werden noch keine
            Daten geschrieben.
          </p>
        </div>
        <div className="player-import-hero-grid">
          <article>
            <span>Workbook</span>
            <strong>{preview.workbookName ?? "Nicht gefunden"}</strong>
            <small>{preview.workbookPath ?? "PLAYER_IMPORT_WORKBOOK_PATH"}</small>
          </article>
          <article>
            <span>Sheet</span>
            <strong>{preview.selectedSheet ?? "Automatisch"}</strong>
            <small>
              {preview.importContext.phase === "SUMMER"
                ? "Sommer · Vorrunde"
                : "Winter · Rückrunde"}
            </small>
          </article>
          <article>
            <span>Parsed Players</span>
            <strong>{preview.parsedPlayers}</strong>
            <small>Normalisiert</small>
          </article>
          <article>
            <span>Existing Prisma</span>
            <strong>{preview.existingPlayers}</strong>
            <small>Player Master</small>
          </article>
        </div>
      </section>

      {importResult ? (
        <section className="player-import-success" aria-live="polite">
          <div>
            <span>✓ Import erfolgreich</span>
            <h2>
              {preview.parsedPlayers} Spieler geprüft
              {importResult.version > 0 ? ` · Version ${importResult.version}` : ""}
            </h2>
          </div>
          <div className="player-import-success-grid">
            <strong>{importResult.imported} neue Spieler</strong>
            <strong>{importResult.updated} aktualisiert</strong>
            <strong>{importResult.unchanged} unverändert</strong>
            <strong>{importResult.departures} Bundesliga-Abgänge</strong>
            <strong>{importResult.errors} Fehler</strong>
            <strong>{importResult.duration} ms</strong>
          </div>
          <div className="player-import-success-grid">
            <strong>{importResult.prismaPlayers} Prisma Players</strong>
            <strong>{importResult.duplicateNames} Duplikate</strong>
            <strong>{importResult.missingClubs} Missing Clubs</strong>
            <strong>{importResult.missingPositions} Missing Positions</strong>
          </div>
        </section>
      ) : null}

      {importError ? (
        <section className="player-import-warning" aria-live="assertive">
          <strong>{importError}</strong>
          <span>
            Der Import wurde nicht angewendet. Details stehen im Server-Log.
          </span>
        </section>
      ) : null}

      <form
        action={createPlayerImportPreviewAction}
        className="player-import-upload"
      >
        <label>
          <span>Datei auswählen</span>
          <input accept=".xlsx" name="workbookFile" required type="file" />
          <small>{params?.filename ?? "Keine Datei ausgewählt"}</small>
        </label>
        <label>
          <span>Saison</span>
          <select
            defaultValue={preview.importContext.selectedSeasonId ?? ""}
            name="seasonId"
            required
          >
            {preview.importContext.seasons.length > 0 ? (
              preview.importContext.seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))
            ) : (
              <option value="">Keine Saison verfügbar</option>
            )}
          </select>
        </label>
        <label>
          <span>Transferphase</span>
          <select defaultValue={phase} name="phase">
            <option value="SUMMER">Sommer</option>
            <option value="WINTER">Winter</option>
          </select>
        </label>
        <label>
          <span>Notiz</span>
          <input
            defaultValue={params?.note ?? ""}
            name="note"
            placeholder="Optionaler Grund"
            type="text"
          />
        </label>
        <button type="submit">Vorschau erstellen</button>
      </form>

      {preview.warnings.length > 0 ? (
        <section className="player-import-warning">
          {preview.warnings.map((warning) => (
            <strong key={warning}>{warning}</strong>
          ))}
        </section>
      ) : null}

      <section className="player-import-summary" aria-label="Import Summary">
        {summaryCards.map((card) => (
          <article className={card.tone} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>

      <section className="player-import-summary" aria-label="Import Verification">
        <article className="ready">
          <span>Saison</span>
          <strong>{preview.importContext.selectedSeasonName ?? "—"}</strong>
          <small>Kontext</small>
        </article>
        <article className="ready">
          <span>Transferphase</span>
          <strong>{preview.importContext.phase === "SUMMER" ? "Sommer" : "Winter"}</strong>
          <small>Versioniert</small>
        </article>
        <article className="ready">
          <span>Ausgewähltes Sheet</span>
          <strong>{preview.selectedSheet ?? "—"}</strong>
          <small>
            {preview.importContext.phase === "SUMMER"
              ? "Vorrunde"
              : "Rückrunde"}
          </small>
        </article>
        <article className="ready">
          <span>Version Candidate</span>
          <strong>{preview.importContext.versionCandidate ?? "—"}</strong>
          <small>
            Vorher aktiv:{" "}
            {preview.importContext.previousVersion?.versionNumber ?? "keine"}
          </small>
        </article>
        <article className="ready">
          <span>Imported Players</span>
          <strong>{preview.verification.importedPlayers}</strong>
          <small>Workbook</small>
        </article>
        <article className="ready">
          <span>Prisma Players</span>
          <strong>{preview.verification.prismaPlayers}</strong>
          <small>Vor Apply</small>
        </article>
        <article
          className={
            preview.verification.duplicateNames.length > 0 ? "attention" : "ready"
          }
        >
          <span>Duplicates</span>
          <strong>{preview.verification.duplicateNames.length}</strong>
          <small>displayName</small>
        </article>
        <article
          className={
            preview.verification.missingClubs.length > 0 ? "attention" : "ready"
          }
        >
          <span>Missing Clubs</span>
          <strong>{preview.verification.missingClubs.length}</strong>
          <small>Verein leer</small>
        </article>
        <article
          className={
            preview.verification.missingPositions.length > 0
              ? "attention"
              : "ready"
          }
        >
          <span>Missing Positions</span>
          <strong>{preview.verification.missingPositions.length}</strong>
          <small>Position</small>
        </article>
      </section>

      <form
        action={applyPlayerImportAction}
        className="player-import-actions"
        aria-label="Import Aktionen"
      >
        <input name="workbookPath" type="hidden" value={preview.workbookPath ?? ""} />
        <input
          name="filename"
          type="hidden"
          value={preview.importContext.filename ?? preview.workbookName ?? ""}
        />
        <input
          name="seasonId"
          type="hidden"
          value={preview.importContext.selectedSeasonId ?? ""}
        />
        <input name="phase" type="hidden" value={preview.importContext.phase} />
        <input name="note" type="hidden" value={preview.importContext.note ?? ""} />
        {preview.importContext.previousVersion ? (
          <strong>
            Diese Version ersetzt die aktuell aktive {activePhaseLabel}.
          </strong>
        ) : null}
        <label className="player-import-confirmation">
          <input name="confirmed" required type="checkbox" value="yes" />
          <span>You are about to update the Player Master.</span>
        </label>
        <button
          className="primary"
          disabled={
            !preview.workbookPath ||
            preview.warnings.length > 0 ||
            !preview.importContext.selectedSeasonId
          }
          type="submit"
        >
          Import übernehmen
        </button>
        <a href="/admin/import">Abbrechen</a>
        <span>
          Apply schreibt transaktional nach Prisma, erstellt ein Audit und
          superseded ältere aktive Versionen derselben Saison und Phase.
        </span>
      </form>

      <div className="player-import-review-grid">
        <PreviewSection
          emptyLabel="Keine neuen Spieler."
          items={preview.newPlayers.slice(0, 12)}
          title="New Players"
        />
        <OfficialMappingSection />
        <ChangeSection
          emptyLabel="Keine Marktwertänderungen."
          items={preview.marketValueChanges.slice(0, 12)}
          title="Market Value Changes"
        />
        <ChangeSection
          emptyLabel="Keine Vereinswechsel."
          items={preview.clubChanges.slice(0, 12)}
          title="Club Changes"
        />
        <ExistingSection
          emptyLabel="Keine Bundesliga-Abgänge erkannt."
          items={preview.leftBundesliga.slice(0, 12)}
          title="Bundesliga Departures"
        />
        <DuplicateSection
          emptyLabel="Keine Duplikate erkannt."
          items={preview.duplicateWarnings.slice(0, 12)}
          title="Duplicates"
        />
        <PreviewSection
          emptyLabel="Keine unveränderten Spieler."
          items={preview.unchangedPlayers.slice(0, 12)}
          title="Unchanged Players"
        />
      </div>
    </main>
  );
}

async function applyPlayerImportAction(formData: FormData) {
  "use server";

  const confirmed = formData.get("confirmed") === "yes";
  const workbookPathValue = formData.get("workbookPath");
  const workbookPath =
    typeof workbookPathValue === "string" && workbookPathValue.length > 0
      ? workbookPathValue
      : undefined;
  const seasonId = readStringFormValue(formData.get("seasonId"));
  const phase = normalizePlayerImportPhase(readStringFormValue(formData.get("phase")));
  const note = readStringFormValue(formData.get("note"));
  const filename = readStringFormValue(formData.get("filename"));

  if (!confirmed) {
    throw new Error("Player Import erfordert die finale Bestätigung.");
  }

  let result: PlayerImportResult;

  try {
    result = await applyPlayerImport(workbookPath, {
      seasonId,
      phase,
      note,
      filename,
    });
  } catch (error) {
    console.error("Player import failed", error);

    const params = new URLSearchParams({
      result: "error",
      message: "Import konnte nicht abgeschlossen werden.",
    });
    appendSearchParam(params, "workbook", workbookPath);
    appendSearchParam(params, "filename", filename);
    appendSearchParam(params, "seasonId", seasonId);
    appendSearchParam(params, "phase", phase);
    appendSearchParam(params, "note", note);

    redirect(`/admin/import/player-master?${params.toString()}`);
  }

  const params = new URLSearchParams({
    result: "success",
    imported: String(result.imported),
    updated: String(result.updated),
    unchanged: String(result.unchanged),
    departures: String(result.departures),
    errors: String(result.errors),
    duration: String(result.durationMs),
    prismaPlayers: String(result.verification.prismaPlayers),
    duplicateNames: String(result.verification.duplicateNames.length),
    missingClubs: String(result.verification.missingClubs.length),
    missingPositions: String(result.verification.missingPositions.length),
    version: String(result.versionNumber ?? 0),
  });
  appendSearchParam(params, "workbook", workbookPath);
  appendSearchParam(params, "filename", filename);
  appendSearchParam(params, "seasonId", seasonId);
  appendSearchParam(params, "phase", phase);
  appendSearchParam(params, "note", note);

  redirect(`/admin/import/player-master?${params.toString()}`);
}

async function createPlayerImportPreviewAction(formData: FormData) {
  "use server";

  const workbookFile = formData.get("workbookFile");
  const seasonId = readStringFormValue(formData.get("seasonId"));
  const phase = normalizePlayerImportPhase(readStringFormValue(formData.get("phase")));
  const note = readStringFormValue(formData.get("note"));
  let previewUrl: string;

  if (!(workbookFile instanceof File) || workbookFile.size === 0) {
    const params = new URLSearchParams({
      result: "error",
      message: "Bitte eine .xlsx-Datei auswählen.",
    });

    redirect(`/admin/import/player-master?${params.toString()}`);
  }

  try {
    const upload = await saveUploadedWorkbook(workbookFile);
    const params = new URLSearchParams({
      workbook: upload.path,
      filename: upload.filename,
      phase,
    });
    appendSearchParam(params, "seasonId", seasonId);
    appendSearchParam(params, "note", note);

    previewUrl = `/admin/import/player-master?${params.toString()}`;
  } catch (error) {
    console.error("Player import preview upload failed", error);

    const params = new URLSearchParams({
      result: "error",
      message: "Vorschau konnte nicht erstellt werden.",
    });
    appendSearchParam(params, "seasonId", seasonId);
    appendSearchParam(params, "phase", phase);
    appendSearchParam(params, "note", note);

    redirect(`/admin/import/player-master?${params.toString()}`);
  }

  redirect(previewUrl);
}

async function saveUploadedWorkbook(file: File) {
  const filename = path.basename(file.name);

  if (path.extname(filename).toLowerCase() !== ".xlsx") {
    throw new Error("Only .xlsx player import files are supported.");
  }

  const uploadDirectory = path.join(os.tmpdir(), "bms-player-imports");
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

function normalizePlayerImportPhase(value: string | undefined) {
  return value === "WINTER" ? "WINTER" : "SUMMER";
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

function OfficialMappingSection() {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Official Format</span>
        <h2>Imported / Ignored Fields</h2>
      </header>
      <div className="player-import-list">
        <article>
          <strong>Imported Fields</strong>
          <span>Name · Club · Position · Market Value · Status</span>
          <small>Spieler, Verein, Position, Verkaufspreis</small>
        </article>
        <article>
          <strong>Ignored Fields</strong>
          <span>Unter Vertrag · Kaufpreis</span>
          <small>
            Diese Werte werden später automatisch aus den SquadAssignments
            berechnet.
          </small>
        </article>
      </div>
    </section>
  );
}

function PreviewSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly NormalizedImportedPlayer[];
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
          {items.map((player) => (
            <article key={`${player.sourceSheet}-${player.sourceRow}`}>
              <strong>{player.displayName}</strong>
              <span>
                {player.bundesligaClub} · {player.positionGroup} ·{" "}
                {formatMarketValue(player.marketValue)} · {player.status}
              </span>
              <small>
                {player.sourceSheet} · Zeile {player.sourceRow} · Ignoriert:
                Unter Vertrag {player.ignoredFields.unterVertrag || "leer"},
                Kaufpreis {player.ignoredFields.kaufpreis || "leer"}
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

function ChangeSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly PlayerImportChange[];
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
            <article key={`${change.imported.displayName}-${title}`}>
              <strong>{change.imported.displayName}</strong>
              <span>
                {change.changes
                  .map((item) => `${item.field}: ${item.before} → ${item.after}`)
                  .join(" · ")}
              </span>
              <small>{change.imported.bundesligaClub}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function ExistingSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly { displayName: string; bundesligaClub: string; status: string }[];
  title: string;
}) {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Departures</span>
        <h2>{title}</h2>
      </header>
      {items.length > 0 ? (
        <div className="player-import-list">
          {items.map((player) => (
            <article key={`${player.displayName}-${player.bundesligaClub}`}>
              <strong>{player.displayName}</strong>
              <span>
                {player.bundesligaClub} · Status wird später auf LEFT_BUNDESLIGA
                geprüft
              </span>
              <small>{player.status}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function DuplicateSection({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: readonly PlayerImportDuplicateWarning[];
  title: string;
}) {
  return (
    <section className="player-import-list-card">
      <header>
        <span>Warnings</span>
        <h2>{title}</h2>
      </header>
      {items.length > 0 ? (
        <div className="player-import-list">
          {items.map((warning) => (
            <article key={warning.key}>
              <strong>{warning.key}</strong>
              <span>{warning.players.length} Workbook-Zeilen</span>
              <small>Vor Apply manuell prüfen</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="player-import-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function formatMarketValue(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)} Mio.`;
}
