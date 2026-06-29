import { NextResponse } from "next/server";

import packageJson from "@/package.json";
import { getMongoDbDatabaseName } from "@/lib/environment";
import { getDatabase } from "@/services/mongodb";
import type { HealthResponse } from "@/types/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString();

  try {
    const database = await getDatabase();
    await database.command({ ping: 1 });

    return NextResponse.json({
      application: {
        status: "healthy",
        version: packageJson.version,
      },
      mongodb: {
        status: "connected",
        databaseName: database.databaseName,
      },
      timestamp,
    });
  } catch (error: unknown) {
    console.error("MongoDB health check failed", error);

    return NextResponse.json(
      {
        application: {
          status: "unhealthy",
          version: packageJson.version,
        },
        mongodb: {
          status: "disconnected",
          databaseName: getMongoDbDatabaseName(),
        },
        timestamp,
      },
      { status: 503 },
    );
  }
}
