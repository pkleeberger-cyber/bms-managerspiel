import { ManagerCockpit } from "@/components/cockpit/manager-cockpit";
import { teamOverviewExcelFixture } from "@/domain/team-overview/fixture";

export default function TeamOverviewPage() {
  return <ManagerCockpit data={teamOverviewExcelFixture} />;
}
