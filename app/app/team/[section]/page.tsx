import { notFound } from "next/navigation";

import { PlaceholderPage } from "@/components/placeholder-page";

const sections = {
  squad: {
    title: "Kader",
    description: "Die Kaderübersicht wird in einem zukünftigen Sprint ergänzt.",
    icon: "team",
  },
  transfers: {
    title: "Transfers",
    description: "Der Transferbereich wird in einem zukünftigen Sprint ergänzt.",
    icon: "coins",
  },
  matches: {
    title: "Spiele",
    description: "Spielplan und Begegnungen werden in einem zukünftigen Sprint ergänzt.",
    icon: "calendar",
  },
  history: {
    title: "Historie",
    description: "Die Managerhistorie wird in einem zukünftigen Sprint ergänzt.",
    icon: "chart",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function TeamSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const page = sections[section as keyof typeof sections];

  if (!page) {
    notFound();
  }

  return (
    <PlaceholderPage
      eyebrow="Mein Team"
      title={page.title}
      description={page.description}
      icon={page.icon}
    />
  );
}
