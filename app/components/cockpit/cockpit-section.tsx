import type { ReactNode } from "react";

type CockpitSectionProps = {
  index: string;
  title: string;
  children: ReactNode;
};

export function CockpitSection({
  index,
  title,
  children,
}: CockpitSectionProps) {
  return (
    <section className="cockpit-section">
      <header className="cockpit-section-heading">
        <span className="section-step">{index}</span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}
