import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/icons";

type DashboardCardProps = {
  title: string;
  eyebrow?: string;
  icon: IconName;
  children: ReactNode;
  className?: string;
};

export function DashboardCard({
  title,
  eyebrow,
  icon,
  children,
  className = "",
}: DashboardCardProps) {
  return (
    <section className={`dashboard-card ${className}`}>
      <header className="card-heading">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        <span className="card-icon">
          <Icon name={icon} />
        </span>
      </header>
      {children}
    </section>
  );
}
