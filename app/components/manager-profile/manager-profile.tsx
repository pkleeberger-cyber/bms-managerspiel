import type {
  ManagerProfileSnapshot,
  ManagerProfileStatistics,
} from "@/application/manager-service";
import type { ManagerLeagueLevel, SquadAssignmentRecord } from "@/infrastructure";

type ManagerProfileProps = {
  mode: "team" | "admin";
  profile: ManagerProfileSnapshot;
};

const leagueLabels = {
  FIRST: "Erste Liga",
  SECOND: "Zweite Liga",
} as const satisfies Record<ManagerLeagueLevel, string>;

const positionLabels = {
  TW: "Torwart",
  AB: "Abwehr",
  MF: "Mittelfeld",
  ST: "Sturm",
} as const;

export function ManagerProfile({ mode, profile }: ManagerProfileProps) {
  const identity = profile.identity;

  return (
    <div className={`manager-profile manager-profile-${mode}`}>
      <section className="manager-profile-hero" aria-labelledby="manager-profile-title">
        <div>
          <span>Manager Identity</span>
          <h1 id="manager-profile-title">{identity.name}</h1>
          <div className="manager-profile-meta">
            <StatusChip status={identity.status} />
            <span>{leagueLabels[identity.league]}</span>
            <span>{identity.currentSeason}</span>
            <span>Seit {formatDate(identity.since)}</span>
          </div>
        </div>
        <div className="manager-profile-hero-grid" aria-label="Manager Kennzahlen">
          <ProfileKpi label="Titel" value={formatNullableNumber(identity.titles)} detail="Noch nicht berechnet" />
          <ProfileKpi label="Kaderwert" value={formatMoney(identity.squadValue)} detail="Aktueller Kader" />
          <ProfileKpi label="Budget" value={formatMoney(identity.budget)} detail="ManagerSeason" />
        </div>
      </section>

      <section className="manager-profile-section" aria-labelledby="profile-statistics">
        <SectionHeader
          eyebrow="Statistik"
          title="Leistungsprofil"
          action={
            profile.statistics.status === "READY"
              ? "Aus offiziellen Ergebnissen"
              : "Noch nicht berechnet"
          }
        />
        <StatisticsGrid statistics={profile.statistics} />
      </section>

      <section className="manager-profile-two-column">
        <article className="manager-profile-card" aria-labelledby="profile-career">
          <SectionHeader
            eyebrow="Karriere"
            title="Season Timeline"
            action={
              profile.career.leagueHistoryStatus === "READY"
                ? "Historie verfügbar"
                : "Teilweise verfügbar"
            }
          />
          <div className="manager-profile-timeline">
            {profile.career.seasons.map((season) => (
              <article key={season.managerSeasonId}>
                <div>
                  <strong>{season.seasonName}</strong>
                  <span>{leagueLabels[season.league]}</span>
                </div>
                <div>
                  <span>{season.status}</span>
                  <span>{season.participation}</span>
                  <span>{formatMoney(season.budget)}</span>
                  <span>{season.squadValue === null ? "Kaderwert offen" : formatMoney(season.squadValue)}</span>
                </div>
                {season.note ? <small>{season.note}</small> : null}
              </article>
            ))}
          </div>
        </article>

        <article className="manager-profile-card" aria-labelledby="profile-achievements">
          <SectionHeader
            eyebrow="Achievements"
            title="Titel und Erfolge"
            action="Reserviert"
          />
          <div className="manager-achievement-grid">
            {profile.achievements.map((achievement) => (
              <article key={achievement.id}>
                <span>{achievement.label}</span>
                <strong>{formatNullableNumber(achievement.value)}</strong>
                <small>
                  {achievement.status === "READY"
                    ? "Berechnet"
                    : "Noch nicht berechnet"}
                </small>
              </article>
            ))}
          </div>
          <div className="manager-profile-placeholder-list">
            <div>
              <span>Promotions</span>
              <strong>Noch nicht berechnet</strong>
            </div>
            <div>
              <span>Relegations</span>
              <strong>Noch nicht berechnet</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="manager-profile-section" aria-labelledby="profile-current-team">
        <SectionHeader
          eyebrow="Current Team"
          title="Kompakte Kader-Vorschau"
          action={`${profile.currentTeam.totalPlayers}/18 Slots`}
        />
        <CurrentTeamPreview players={profile.currentTeam.players} />
      </section>

      <section className="manager-profile-section" aria-labelledby="profile-future">
        <SectionHeader eyebrow="Future" title="Reservierte Profilbereiche" action="Vorbereitet" />
        <div className="manager-profile-future-grid">
          {profile.future.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  action,
  eyebrow,
  title,
}: {
  action?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="manager-profile-section-header">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action ? <b>{action}</b> : null}
    </header>
  );
}

function ProfileKpi({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function StatisticsGrid({
  statistics,
}: {
  statistics: ManagerProfileStatistics;
}) {
  const items = [
    { label: "Matches", value: formatStat(statistics.matches) },
    { label: "Wins", value: formatStat(statistics.wins) },
    { label: "Draws", value: formatStat(statistics.draws) },
    { label: "Losses", value: formatStat(statistics.losses) },
    {
      label: "Goals",
      value:
        statistics.goalsFor === null || statistics.goalsAgainst === null
          ? "—"
          : `${statistics.goalsFor}:${statistics.goalsAgainst}`,
    },
    { label: "Points", value: formatStat(statistics.points) },
    {
      label: "Win %",
      value:
        statistics.winPercentage === null
          ? "—"
          : `${statistics.winPercentage}%`,
    },
  ];

  return (
    <div className="manager-profile-stat-grid">
      {items.map((item) => (
        <ProfileKpi
          detail={
            statistics.status === "READY"
              ? "Offizielle Ergebnisse"
              : "Noch nicht berechnet"
          }
          key={item.label}
          label={item.label}
          value={item.value}
        />
      ))}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`manager-status-badge ${status.toLowerCase()}`}>
      {status}
    </span>
  );
}

function CurrentTeamPreview({
  players,
}: {
  players: readonly SquadAssignmentRecord[];
}) {
  if (players.length === 0) {
    return (
      <div className="manager-detail-empty">
        <strong>Kein aktueller Kader</strong>
        <span>Für diesen Manager liegen noch keine aktuellen SquadAssignments vor.</span>
      </div>
    );
  }

  return (
    <div className="manager-profile-team-list">
      {players.map((player) => (
        <article key={player.id}>
          <span className="manager-slot-badge">Slot {player.slotId}</span>
          <strong>{player.playerName}</strong>
          <span>{positionLabels[player.positionGroup]}</span>
          <span>{player.bundesligaClub}</span>
          <b>{formatMoney(player.marketValue)}</b>
        </article>
      ))}
    </div>
  );
}

function formatDate(value: Date) {
  return value.toLocaleDateString("de-DE", {
    month: "2-digit",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return `${value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })} Mio. €`;
}

function formatNullableNumber(value: number | null) {
  return value === null ? "—" : String(value);
}

function formatStat(value: number | null) {
  return value === null ? "—" : String(value);
}
