import { loadCurrentTeamOverview } from "@/application/team-service";
import { ManagerCockpit } from "@/components/cockpit/manager-cockpit";

type TeamOverviewPageProps = {
  searchParams?: Promise<{
    managerSeasonId?: string;
  }>;
};

export default async function TeamOverviewPage({
  searchParams,
}: TeamOverviewPageProps) {
  const params = await searchParams;
  const snapshot = await loadCurrentTeamOverview({
    managerSeasonId: params?.managerSeasonId,
  });

  return <ManagerCockpit data={snapshot.overview} snapshot={snapshot} />;
}
