import path from "node:path";

import { config } from "dotenv";
import { MongoClient } from "mongodb";

import { getConfiguredDatabaseUrl } from "../infrastructure/prisma";

config({ path: path.resolve(process.cwd(), ".env.local") });
config();

const validStatuses = new Set([
  "DRAFT",
  "DATA_ENTRY_OPEN",
  "DATA_ENTERED",
  "DATA_ENTRY_COMPLETE",
  "CALCULATED",
  "PRELIMINARY_PUBLISHED",
  "PUBLISHED_PRELIMINARY",
  "MANUAL_REVIEW_CONFIRMED",
  "CORRECTIONS_CONFIRMED",
  "OFFICIALLY_CLOSED",
  "REOPENED",
  "PUBLISHED_OFFICIAL",
  "ARCHIVED",
]);

const legacyStatusMap = new Map<string, string>([
  ["DATA_COMPLETE", "DATA_ENTERED"],
  ["DATA_ENTRY_DONE", "DATA_ENTERED"],
  ["PRELIMINARY", "PRELIMINARY_PUBLISHED"],
  ["PRELIMINARY_PUBLICATION", "PRELIMINARY_PUBLISHED"],
  ["MANUAL_REVIEW_DONE", "MANUAL_REVIEW_CONFIRMED"],
  ["CORRECTIONS_DONE", "CORRECTIONS_CONFIRMED"],
  ["OFFICIAL", "OFFICIALLY_CLOSED"],
  ["OFFICIAL_CLOSED", "OFFICIALLY_CLOSED"],
]);

type LifecycleDocument = {
  _id: unknown;
  status?: unknown;
  matchday?: unknown;
};

async function repairMatchdayLifecycleStatus() {
  const apply = process.argv.includes("--apply");
  const configuredUrl = getConfiguredDatabaseUrl();

  if (!configuredUrl) {
    console.log(
      "MatchdayLifecycle status repair skipped: set DATABASE_URL, MONGODB_URI, or MONGDODB_URI.",
    );
    return;
  }

  const client = new MongoClient(configuredUrl);

  await client.connect();

  try {
    const db = client.db();

    await reportAndRepairCollection(db, "MatchdayLifecycle", apply);
    await reportAndRepairCollection(db, "MatchdayVersion", apply);
  } finally {
    await client.close();
  }
}

async function reportAndRepairCollection(
  db: ReturnType<MongoClient["db"]>,
  collectionName: "MatchdayLifecycle" | "MatchdayVersion",
  apply: boolean,
) {
  const collection = db.collection<LifecycleDocument>(collectionName);
  const documents = await collection
    .find({}, { projection: { status: 1, matchday: 1 } })
    .sort({ matchday: 1 })
    .toArray();
  const counts = new Map<string, number>();
  const invalid = documents.filter((document) => {
    const status = String(document.status ?? "MISSING");

    counts.set(status, (counts.get(status) ?? 0) + 1);

    return !validStatuses.has(status);
  });

  console.log(`\n${collectionName}: ${documents.length} documents`);
  for (const [status, count] of [...counts.entries()].sort()) {
    console.log(`- ${status}: ${count}`);
  }

  if (invalid.length === 0) {
    console.log(`${collectionName}: no invalid statuses found.`);
    return;
  }

  console.log(`${collectionName}: ${invalid.length} invalid statuses found.`);

  for (const document of invalid) {
    const status = String(document.status ?? "MISSING");
    const replacement = legacyStatusMap.get(status) ?? null;

    console.log(
      `- matchday=${String(document.matchday ?? "?")} id=${String(document._id)} status=${status} replacement=${replacement ?? "none"}`,
    );

    if (apply && replacement) {
      await collection.updateOne(
        { _id: document._id },
        { $set: { status: replacement } },
      );
    }
  }

  if (!apply) {
    console.log(
      `No changes written. Run npm run repair:matchday-lifecycle-status -- --apply to normalize known legacy statuses.`,
    );
    return;
  }

  const unrepaired = invalid.filter((document) => {
    const status = String(document.status ?? "MISSING");

    return !legacyStatusMap.has(status);
  });

  console.log(
    `${collectionName}: repaired ${invalid.length - unrepaired.length}, unrepaired ${unrepaired.length}.`,
  );
}

void repairMatchdayLifecycleStatus().catch((error) => {
  console.error("MatchdayLifecycle status repair failed", error);
  process.exitCode = 1;
});
