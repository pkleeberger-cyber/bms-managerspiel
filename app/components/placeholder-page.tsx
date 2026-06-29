import { Icon, type IconName } from "@/components/icons";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: IconName;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  icon = "document",
}: PlaceholderPageProps) {
  return (
    <div className="placeholder-page">
      <span className="placeholder-icon">
        <Icon name={icon} />
      </span>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="placeholder-badge">In Vorbereitung</span>
    </div>
  );
}
