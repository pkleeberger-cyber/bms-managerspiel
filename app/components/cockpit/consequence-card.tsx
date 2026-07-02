type ConsequenceCardProps = {
  label: string;
  current: string;
  reference: string;
  referenceLabel: string;
  change: string;
  insight: string;
  direction: "up" | "down" | "neutral";
};

export function ConsequenceCard({
  label,
  current,
  reference,
  referenceLabel,
  change,
  insight,
  direction,
}: ConsequenceCardProps) {
  return (
    <article className={`consequence-card ${direction}`}>
      <span className="consequence-label">{label}</span>
      <div className="consequence-current">
        <strong>{current}</strong>
        <span className="consequence-delta">
          {direction === "up" ? "▲" : direction === "down" ? "▼" : "–"} {change}
        </span>
      </div>
      <div className="consequence-reference">
        <span>{referenceLabel}</span>
        <strong>{reference}</strong>
      </div>
      <span className="consequence-insight">{insight}</span>
    </article>
  );
}
