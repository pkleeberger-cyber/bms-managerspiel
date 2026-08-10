import Link from "next/link";

type MatchdayOfficeTab =
  | "leitstand"
  | "data-entry"
  | "calculation"
  | "review"
  | "release"
  | "history";

type MatchdayOfficeTabsProps = {
  active: MatchdayOfficeTab;
  matchday: number;
  role?: string;
};

const tabs: readonly {
  id: MatchdayOfficeTab;
  label: string;
  path: string;
}[] = [
  { id: "leitstand", label: "Leitstand", path: "/admin/matchday" },
  { id: "data-entry", label: "Datenerfassung", path: "/admin/matchday/data-entry" },
  { id: "calculation", label: "Berechnung", path: "/admin/matchday/calculate" },
  { id: "review", label: "Review", path: "/admin/matchday/review" },
  { id: "release", label: "Veröffentlichung", path: "/admin/matchday/release" },
  { id: "history", label: "Historie", path: "/admin/matchday" },
];

export function MatchdayOfficeTabs({
  active,
  matchday,
  role,
}: MatchdayOfficeTabsProps) {
  return (
    <nav className="matchday-office-tabs" aria-label="Matchday Office">
      {tabs.map((tab) => {
        const params = new URLSearchParams({ matchday: String(matchday) });

        if (role) {
          params.set("role", role);
        }

        if (tab.id === "history") {
          params.set("tab", "history");
        }

        return (
          <Link
            aria-current={active === tab.id ? "page" : undefined}
            className={active === tab.id ? "active" : undefined}
            href={`${tab.path}?${params.toString()}`}
            key={tab.id}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
