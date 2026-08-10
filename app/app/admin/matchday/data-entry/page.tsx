import Link from "next/link";
import { redirect } from "next/navigation";

import {
  loadMatchdayZeroDataEntry,
  saveMatchdayZeroPlayerData,
} from "@/application/matchday-zero-service";
import {
  PlayerMatchDataImportService,
  type PlayerMatchDataImportApplyResult,
  type PlayerMatchDataImportPreview,
  type PlayerMatchDataImportRow,
  type PlayerMatchDataValue,
} from "@/application/player-match-data-import-service";
import { parseMatchdayParam } from "@/application/matchday-workflow-service";
import { MatchdayOfficeTabs } from "@/components/matchday-office/matchday-office-tabs";

const ratingOptions = ["", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6"] as const;

export const dynamic = "force-dynamic";

type DataEntryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function savePlayerDataAction(formData: FormData) {
  "use server";

  await saveMatchdayZeroPlayerData(formData);
}

async function previewExcelImportAction(formData: FormData) {
  "use server";

  const matchday = parseMatchdayParam(String(formData.get("matchday") ?? "")) ?? 1;
  const file = formData.get("workbook");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/matchday/data-entry?matchday=${matchday}&importError=missing-file`);
  }

  let preview: PlayerMatchDataImportPreview;

  try {
    preview = await new PlayerMatchDataImportService().createPreview({
      matchday,
      filename: file.name,
      buffer: await file.arrayBuffer(),
    });
  } catch (error) {
    redirectImportError(matchday, error);
  }

  redirect(`/admin/matchday/data-entry?matchday=${matchday}&importPreview=${preview.previewId}`);
}

async function applyExcelImportAction(formData: FormData) {
  "use server";

  const matchday = parseMatchdayParam(String(formData.get("matchday") ?? "")) ?? 1;
  const previewId = String(formData.get("previewId") ?? "");

  if (!previewId) {
    redirect(`/admin/matchday/data-entry?matchday=${matchday}&importError=missing-preview`);
  }

  let result: PlayerMatchDataImportApplyResult;

  try {
    result = await new PlayerMatchDataImportService().applyPreview(previewId);
  } catch (error) {
    redirectImportError(matchday, error);
  }

  console.info(
    `PlayerMatchData Excel-Import: ${result.rowsWritten} Zeilen geschrieben, ${result.rowsVerified} Zeilen verifiziert.`,
  );

  redirect(
    `/admin/matchday/data-entry?matchday=${matchday}&imported=1&appliedRows=${result.rowsWritten}&verifiedRows=${result.rowsVerified}&updatedRows=${result.preview.summary.updatedRows}&newRows=${result.preview.summary.newRows}`,
  );
}

export default async function MatchdayDataEntryPage({
  searchParams,
}: DataEntryPageProps) {
  const params = await searchParams;
  const selectedMatchday = parseMatchdayParam(params?.matchday) ?? 1;
  const selectedClub = readStringParam(params?.club);
  const saved = readStringParam(params?.saved) === "1";
  const savedCount = readStringParam(params?.savedCount);
  const importPreviewId = readStringParam(params?.importPreview);
  const imported = readStringParam(params?.imported) === "1";
  const appliedRows = readStringParam(params?.appliedRows);
  const verifiedRows = readStringParam(params?.verifiedRows);
  const importedUpdatedRows = readStringParam(params?.updatedRows);
  const importedNewRows = readStringParam(params?.newRows);
  const importError = readStringParam(params?.importError);
  const snapshot = await loadMatchdayZeroDataEntry(selectedMatchday);
  const importPreview = importPreviewId
    ? await new PlayerMatchDataImportService().loadPreview(importPreviewId)
    : null;
  const clubs = [...new Set(snapshot.relevantPlayers.map((player) => player.club))]
    .sort((first, second) => first.localeCompare(second, "de"));
  const visiblePlayers = selectedClub
    ? snapshot.relevantPlayers.filter((player) => player.club === selectedClub)
    : snapshot.relevantPlayers;
  const relevantPlayers = snapshot.relevantPlayers
    .filter((player) => !selectedClub || player.club === selectedClub)
    .sort((first, second) => (
      first.club.localeCompare(second.club, "de") ||
      positionOrder(first.position) - positionOrder(second.position) ||
      first.displayName.localeCompare(second.displayName, "de")
    ));
  const query = `matchday=${snapshot.matchday}`;

  return (
    <main className="matchday-data-entry">
      <header className="matchday-ops-title">
        <span>Administration / Spieltag / Datenerfassung</span>
        <h1>Spielerdaten erfassen</h1>
      </header>

      <MatchdayOfficeTabs active="data-entry" matchday={snapshot.matchday} />

      <section className="matchday-data-hero" aria-labelledby="data-entry-hero">
        <div>
          <span className="matchday-ops-eyebrow">
            {snapshot.competitionName} · Spieltag {snapshot.matchday}
          </span>
          <h2 id="data-entry-hero">Living Data Entry</h2>
          <p>
            Der Spielerpool enthält Realspieler, die am Spieltag bei mindestens
            einem aktiven Liga-1-Manager im Kader stehen.
          </p>
        </div>
        <div className="matchday-data-hero-grid">
          <article>
            <span>Fixtures</span>
            <strong>{snapshot.fixtureCount}</strong>
            <small>Aus Prisma</small>
          </article>
          <article>
            <span>Spielerpool</span>
            <strong>{snapshot.relevantPlayers.length}</strong>
            <small>Ohne Abgänge</small>
          </article>
          <article>
            <span>Erfasst</span>
            <strong>{snapshot.savedCount}</strong>
            <small>PlayerMatchData</small>
          </article>
          <article>
            <span>Offen</span>
            <strong>{snapshot.openCount}</strong>
            <small>Blockiert Berechnung</small>
          </article>
        </div>
      </section>

      {saved ? (
        <section className="matchday-data-success">
          <strong>PlayerMatchData gespeichert.</strong>
          <span>
            {savedCount ?? "Die sichtbaren"} Einträge gespeichert, bestehende
            andere Einträge unverändert. Insgesamt sind {snapshot.savedCount}/
            {snapshot.relevantPlayers.length} relevante Spieler gespeichert.
          </span>
        </section>
      ) : null}

      {imported ? (
        <section className="matchday-data-success">
          <strong>{formatImportSuccess(importedUpdatedRows, importedNewRows, appliedRows)}</strong>
          <span>
            Datenbank bestätigt: {verifiedRows ?? appliedRows ?? "0"} Zeilen.
            Nicht hochgeladene Einträge blieben unverändert.
          </span>
        </section>
      ) : null}

      {importError ? (
        <section className="matchday-data-filter-notice">
          <strong>Excel-Import nicht gestartet</strong>
          <span>{importErrorLabel(importError)}</span>
        </section>
      ) : null}

      <form className="matchday-filter-bar" method="get">
        <input name="matchday" type="hidden" value={snapshot.matchday} />
        <label>
          <span>Verein</span>
          <select defaultValue={selectedClub ?? ""} name="club">
            <option value="">Alle Vereine</option>
            {clubs.map((club) => (
              <option key={club} value={club}>
                {club}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Filter anwenden</button>
        <Link href={`/admin/matchday/data-entry?${query}`}>
          Filter zurücksetzen
        </Link>
        <span>
          {visiblePlayers.length} sichtbar · Sortierung Verein, Position, Name
        </span>
      </form>

      <section className="matchday-data-notice">
        <strong>Keine Dummywerte</strong>
        <span>
          Leere Note ist erlaubt. Tore, Karten oder Elf des Tages werden als
          echte Admin-Eingabe gespeichert.
        </span>
      </section>

      <ExcelImportCard
        matchday={snapshot.matchday}
        preview={importPreview}
        query={query}
      />

      {selectedClub ? (
        <section className="matchday-data-filter-notice">
          <strong>Filter aktiv</strong>
          <span>
            Es werden nur die aktuell sichtbaren Spieler gespeichert. Bereits
            vorhandene Einträge anderer Vereine bleiben unverändert.
          </span>
        </section>
      ) : null}

      <form action={savePlayerDataAction}>
        <input name="matchday" type="hidden" value={snapshot.matchday} />
        <input name="club" type="hidden" value={selectedClub ?? ""} />
        <section className="matchday-data-card" aria-labelledby="player-entry-list">
          <header className="matchday-section-heading">
            <div>
              <span>Erfassung</span>
              <h2 id="player-entry-list">Relevante BMS-Spieler</h2>
            </div>
            <b>
              {snapshot.savedCount}/{snapshot.relevantPlayers.length} gespeichert
            </b>
          </header>

          <div className="matchday-player-entry-table">
            <div className="matchday-player-entry-head" aria-hidden="true">
              <span>Spieler</span>
              <span>Verein</span>
              <span>Manager</span>
              <span>Note</span>
              <span>Tore</span>
              <span>Gelb-Rot</span>
              <span>Rot</span>
              <span>Elf d. Tages</span>
              <span>Status</span>
            </div>

            <div className="matchday-player-entry-list">
            {relevantPlayers.map((player) => (
              <article className="matchday-player-entry-row" key={player.playerId}>
                <input name="submittedPlayerId" type="hidden" value={player.playerId} />
                <div className="matchday-player-entry-main">
                  <span className="matchday-player-position">{player.position}</span>
                  <div>
                    <strong>{player.displayName}</strong>
                    <span>{player.position}</span>
                  </div>
                </div>

                <div className="matchday-player-club">
                  <strong>{player.club}</strong>
                </div>

                <div className="matchday-manager-count">
                  <strong>{player.managerCount}</strong>
                </div>

                <label className="matchday-data-field compact">
                  <span>Note</span>
                  <select
                    defaultValue={player.rating?.toString() ?? ""}
                    name={`${player.playerId}:rating`}
                  >
                    {ratingOptions.map((rating) => (
                      <option key={rating || "empty"} value={rating}>
                        {rating ? rating.replace(".", ",") : "—"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="matchday-data-field compact">
                  <span>Tore</span>
                  <input
                    defaultValue={player.goals}
                    min="0"
                    name={`${player.playerId}:goals`}
                    type="number"
                  />
                </label>

                <label className="matchday-toggle-field">
                  <input
                    defaultChecked={player.yellowRed}
                    name={`${player.playerId}:yellowRed`}
                    type="checkbox"
                  />
                  <span>Gelb-Rot</span>
                </label>

                <label className="matchday-toggle-field">
                  <input
                    defaultChecked={player.red}
                    name={`${player.playerId}:red`}
                    type="checkbox"
                  />
                  <span>Rot</span>
                </label>

                <label className="matchday-toggle-field">
                  <input
                    defaultChecked={player.teamOfTheWeek}
                    name={`${player.playerId}:teamOfTheWeek`}
                    type="checkbox"
                  />
                  <span>Elf des Tages</span>
                </label>

                <span
                  className={`matchday-entry-status ${
                    player.status === "SAVED" ? "gespeichert" : "offen"
                  }`}
                >
                  {player.status === "SAVED" ? "Gespeichert" : "Offen"}
                </span>
              </article>
            ))}
            </div>
          </div>
        </section>

        <footer className="matchday-data-actions" aria-label="Aktionen">
          <Link href={`/admin/matchday?${query}`}>Zurück zum Spieltagsleitstand</Link>
          <button className="primary" type="submit">
            PlayerMatchData speichern
          </button>
          <Link className="primary" href={`/admin/matchday/calculate?${query}`}>
            Zur Berechnung
          </Link>
        </footer>
      </form>
    </main>
  );
}

function ExcelImportCard({
  matchday,
  preview,
  query,
}: {
  matchday: number;
  preview: PlayerMatchDataImportPreview | null;
  query: string;
}) {
  return (
    <section className="matchday-data-card" aria-labelledby="excel-import-title">
      <header className="matchday-section-heading">
        <div>
          <span>Excel-Import</span>
          <h2 id="excel-import-title">Bewertungen hochladen</h2>
        </div>
        <Link href={`/admin/matchday/data-entry/template?${query}`}>
          Bewertungsvorlage herunterladen
        </Link>
      </header>

      <form action={previewExcelImportAction} className="matchday-excel-import-form">
        <input name="matchday" type="hidden" value={matchday} />
        <label className="matchday-data-field">
          <span>Bewertungsdatei</span>
          <input accept=".xlsx" name="workbook" required type="file" />
        </label>
        <button className="primary" type="submit">Bewertungen hochladen</button>
      </form>

      {preview ? (
        <div className="matchday-import-preview">
          <div className="matchday-data-hero-grid">
            <article>
              <span>Neu</span>
              <strong>{preview.summary.newRows}</strong>
              <small>Keine bestehende Zeile</small>
            </article>
            <article>
              <span>Aktualisierung</span>
              <strong>{preview.summary.updatedRows}</strong>
              <small>Nur hochgeladene Zeilen</small>
            </article>
            <article>
              <span>Unverändert</span>
              <strong>{preview.summary.unchangedRows}</strong>
              <small>Identische Werte</small>
            </article>
            <article>
              <span>Blockiert</span>
              <strong>{preview.summary.blockedRows}</strong>
              <small>Blockiert Import</small>
            </article>
          </div>

          {preview.summary.blockedRows > 0 ? (
            <section className="matchday-data-filter-notice">
              <strong>Import blockiert</strong>
              <span>
                Unbekannte Spieler, ungültige Werte oder doppelte widersprüchliche
                Excel-Zeilen korrigieren und erneut hochladen.
              </span>
            </section>
          ) : null}

          <div className="matchday-import-conflict-list">
            {sortPreviewRows(preview.rows).slice(0, 20).map((row) => (
              <PreviewRowCard key={`${row.rowNumber}:${row.displayName}`} row={row} />
            ))}
          </div>

          <form action={applyExcelImportAction} className="matchday-data-actions">
            <input name="matchday" type="hidden" value={matchday} />
            <input name="previewId" type="hidden" value={preview.previewId} />
            <Link href={`/admin/matchday/data-entry?${query}`}>Preview verwerfen</Link>
            <button
              className="primary"
              disabled={preview.summary.blockedRows > 0}
              type="submit"
            >
              Import bestätigen
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function PreviewRowCard({ row }: { row: PlayerMatchDataImportRow }) {
  return (
    <article className={`matchday-import-conflict-card ${row.status.toLowerCase()}`}>
      <div className="matchday-import-conflict-player">
        <span>{formatStatusLabel(row.status)}</span>
        <strong>{row.displayName}</strong>
        <small>
          Zeile {row.rowNumber}
          {row.club ? ` · ${row.club}` : ""}
          {row.position ? ` · ${row.position}` : ""}
        </small>
      </div>

      <div className="matchday-import-conflict-values">
        <ValueBlock label="Excel" value={formatImportValue(row.uploadedValue)} />
        <ValueBlock label="DB" value={row.existingValue ? formatImportValue(row.existingValue) : "Kein Eintrag"} />
        <ValueBlock label="Differenz" value={formatDifference(row)} />
      </div>

      <div className="matchday-import-conflict-action">
        <span>Aktion</span>
        <strong>{importActionLabel(row)}</strong>
      </div>
    </article>
  );
}

function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function readStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positionOrder(position: string) {
  const order: Record<string, number> = { TW: 0, AB: 1, MF: 2, ST: 3 };

  return order[position] ?? 99;
}

function importErrorLabel(error: string) {
  if (error === "missing-file") {
    return "Bitte eine .xlsx-Datei auswählen.";
  }
  if (error === "missing-preview") {
    return "Import-Preview fehlt. Bitte Datei erneut hochladen.";
  }
  return `Excel-Import konnte nicht gespeichert werden: ${error}`;
}

function formatImportSuccess(
  updatedRows: string | undefined,
  newRows: string | undefined,
  appliedRows: string | undefined,
) {
  const updates = Number(updatedRows ?? 0);
  const created = Number(newRows ?? 0);

  if (updates > 0 && created === 0) {
    return `✓ ${updates} Bewertungen aktualisiert.`;
  }

  return `✓ ${appliedRows ?? "0"} Bewertungen übernommen.`;
}

function redirectImportError(matchday: number, error: unknown): never {
  const message = error instanceof Error
    ? error.message
    : "Excel-Import konnte nicht vorbereitet werden.";

  redirect(
    `/admin/matchday/data-entry?matchday=${matchday}&importError=${encodeURIComponent(message)}`,
  );
}

function sortPreviewRows(rows: readonly PlayerMatchDataImportRow[]) {
  const statusOrder: Record<PlayerMatchDataImportRow["status"], number> = {
    UPDATE: 0,
    DUPLICATE_CONFLICT: 1,
    INVALID: 2,
    UNKNOWN: 3,
    NEW: 4,
    UNCHANGED: 5,
  };

  return [...rows].sort((first, second) => (
    statusOrder[first.status] - statusOrder[second.status] ||
    first.displayName.localeCompare(second.displayName, "de")
  ));
}

function formatImportValue(value: PlayerMatchDataValue) {
  const events = [
    value.goals > 0 ? `${value.goals} Tore` : null,
    value.yellowRed ? "Gelb-Rot" : null,
    value.red ? "Rot" : null,
    value.teamOfTheWeek ? "Elf d. Tages" : null,
  ].filter(Boolean);

  return [`Note ${formatRating(value.rating)}`, ...events].join(" · ");
}

function formatDifference(row: PlayerMatchDataImportRow) {
  if (row.status === "UNKNOWN" || row.status === "INVALID" || row.status === "DUPLICATE_CONFLICT") {
    return row.issue ?? "Spieler nicht zugeordnet";
  }
  if (!row.existingValue) {
    return "Neuer PlayerMatchData-Eintrag";
  }

  const differences = [
    row.existingValue.rating !== row.uploadedValue.rating
      ? `Note ${formatRating(row.existingValue.rating)} → ${formatRating(row.uploadedValue.rating)}`
      : null,
    row.existingValue.goals !== row.uploadedValue.goals
      ? `Tore ${row.existingValue.goals} → ${row.uploadedValue.goals}`
      : null,
    row.existingValue.yellowRed !== row.uploadedValue.yellowRed
      ? `Gelb-Rot ${formatBoolean(row.existingValue.yellowRed)} → ${formatBoolean(row.uploadedValue.yellowRed)}`
      : null,
    row.existingValue.red !== row.uploadedValue.red
      ? `Rot ${formatBoolean(row.existingValue.red)} → ${formatBoolean(row.uploadedValue.red)}`
      : null,
    row.existingValue.teamOfTheWeek !== row.uploadedValue.teamOfTheWeek
      ? `Elf ${formatBoolean(row.existingValue.teamOfTheWeek)} → ${formatBoolean(row.uploadedValue.teamOfTheWeek)}`
      : null,
  ].filter(Boolean);

  return differences.length > 0 ? differences.join(" · ") : "Keine Änderung";
}

function importActionLabel(row: PlayerMatchDataImportRow) {
  if (row.status === "UNKNOWN" || row.status === "INVALID" || row.status === "DUPLICATE_CONFLICT") {
    return "Blockiert";
  }
  if (row.status === "UNCHANGED") {
    return "Keine Änderung";
  }
  if (row.status === "NEW") {
    return "Neu anlegen";
  }
  return "Excel überschreibt bestehenden Wert";
}

function formatStatusLabel(status: PlayerMatchDataImportRow["status"]) {
  const labels: Record<PlayerMatchDataImportRow["status"], string> = {
    NEW: "Neu",
    UNCHANGED: "Unverändert",
    UPDATE: "Aktualisierung",
    UNKNOWN: "Unbekannt",
    INVALID: "Ungültig",
    DUPLICATE_CONFLICT: "Doppelkonflikt",
  };

  return labels[status];
}

function formatRating(value: number | null) {
  return value === null ? "—" : value.toString().replace(".", ",");
}

function formatBoolean(value: boolean) {
  return value ? "ja" : "nein";
}
