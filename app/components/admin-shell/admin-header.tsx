export type AdminHeaderContext = {
  activeCompetition: string;
  currentMatchday: string;
  currentSeason: string;
  currentUser: string;
  databaseStatus: "Datenbank aktiv" | "Fixture aktiv";
};

export function AdminHeader({ context }: { context: AdminHeaderContext }) {
  const headerStats = [
    { label: "Saison", value: context.currentSeason },
    { label: "Spieltag", value: context.currentMatchday },
    { label: "Wettbewerb", value: context.activeCompetition },
    { label: "User", value: context.currentUser },
    { label: "Datenbank", value: context.databaseStatus },
  ] as const;

  return (
    <header className="admin-header">
      <div>
        <span>Operations Workspace</span>
        <h1>BMS Office</h1>
      </div>
      <div className="admin-header-grid">
        {headerStats.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </header>
  );
}
