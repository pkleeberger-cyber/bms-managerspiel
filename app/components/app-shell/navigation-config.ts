export type NavigationItem = {
  label: string;
  href: string;
};

export const mainNavigation: NavigationItem[] = [
  { label: "Mein Team", href: "/" },
  { label: "Wettbewerbe", href: "/competitions/erste-liga" },
  { label: "News", href: "/news" },
  { label: "Forum", href: "/forum" },
  { label: "Administration", href: "/administration" },
];

export const teamNavigation: NavigationItem[] = [
  { label: "Übersicht", href: "/" },
  { label: "Kader", href: "/team/squad" },
  { label: "Transfers", href: "/team/transfers" },
  { label: "Spiele", href: "/team/matches" },
  { label: "Historie", href: "/team/history" },
];

export const competitionNavigation: NavigationItem[] = [
  { label: "Erste Liga", href: "/competitions/erste-liga" },
  { label: "Zweite Liga", href: "/competitions/zweite-liga" },
  { label: "Pokal", href: "/competitions/pokal" },
  { label: "Europapokal", href: "/competitions/europapokal" },
  { label: "Supercup", href: "/competitions/supercup" },
];
