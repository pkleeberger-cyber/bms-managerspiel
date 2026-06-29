import { notFound } from "next/navigation";

import { PlaceholderPage } from "@/components/placeholder-page";

const competitions = {
  "erste-liga": "Erste Liga",
  "zweite-liga": "Zweite Liga",
  pokal: "Pokal",
  europapokal: "Europapokal",
  supercup: "Supercup",
} as const;

export function generateStaticParams() {
  return Object.keys(competitions).map((competition) => ({ competition }));
}

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ competition: string }>;
}) {
  const { competition } = await params;
  const title = competitions[competition as keyof typeof competitions];

  if (!title) {
    notFound();
  }

  return (
    <PlaceholderPage
      eyebrow="Wettbewerbe"
      title={title}
      description={`Die Übersicht für ${title} wird in einem zukünftigen Sprint ergänzt.`}
      icon="trophy"
    />
  );
}
