import { NextResponse } from "next/server";

import { PlayerMatchDataImportService } from "@/application/player-match-data-import-service";
import { parseMatchdayParam } from "@/application/matchday-workflow-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const matchday = parseMatchdayParam(url.searchParams.get("matchday") ?? undefined) ?? 1;
  const buffer = await new PlayerMatchDataImportService().exportTemplate(matchday);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="player-match-data-st${matchday}.xlsx"`,
    },
  });
}
