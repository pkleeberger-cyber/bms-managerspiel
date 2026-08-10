import { loadManagerContext } from "@/application/manager-context-service";
import { loadManagerDetail } from "@/application/manager-service";
import { ManagerProfile } from "@/components/manager-profile/manager-profile";

type TeamProfilePageProps = {
  searchParams?: Promise<{
    managerSeasonId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function TeamProfilePage({
  searchParams,
}: TeamProfilePageProps) {
  const params = await searchParams;
  const context = await loadManagerContext(params?.managerSeasonId);
  const managerSeasonId = context.selectedManagerSeasonId;

  if (!managerSeasonId) {
    return (
      <main className="manager-profile-page">
        <div className="manager-detail-empty">
          <strong>Kein Manager ausgewählt</strong>
          <span>
            Für das Profil wird eine aktive ManagerSeason benötigt.
          </span>
        </div>
      </main>
    );
  }

  const snapshot = await loadManagerDetail({ managerSeasonId });

  if (!snapshot) {
    return (
      <main className="manager-profile-page">
        <div className="manager-detail-empty">
          <strong>Profil nicht verfügbar</strong>
          <span>
            Die ManagerSeason konnte nicht aus Prisma geladen werden.
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="manager-profile-page">
      <ManagerProfile mode="team" profile={snapshot.profile} />
    </main>
  );
}
