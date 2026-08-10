import { redirect } from "next/navigation";

type FullMatchdayEvaluationPageProps = {
  params: Promise<{ matchday: string }>;
  searchParams?: Promise<{
    fixtureId?: string;
    managerSeasonId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function FullMatchdayEvaluationPage({
  params,
  searchParams,
}: FullMatchdayEvaluationPageProps) {
  const { matchday } = await params;
  const query = await searchParams;
  const target = new URLSearchParams();

  if (query?.fixtureId) {
    target.set("fixtureId", query.fixtureId);
  }

  if (query?.managerSeasonId) {
    target.set("managerSeasonId", query.managerSeasonId);
  }

  redirect(
    `/team/spiele/${matchday}/analyse${target.size > 0 ? `?${target.toString()}` : ""}`,
  );
}
