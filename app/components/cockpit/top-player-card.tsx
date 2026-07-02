type TopPlayerCardProps = {
  name: string;
  position: string;
  initials: string;
  points: number;
  detailLabel: string;
  detailValue: string;
  tone: "positive" | "negative" | "neutral";
  status: string;
};

export function TopPlayerCard({
  name,
  position,
  initials,
  points,
  detailLabel,
  detailValue,
  tone,
  status,
}: TopPlayerCardProps) {
  return (
    <article className="top-player-card">
      <span className="top-player-avatar">{initials}</span>
      <div className="top-player-name">
        <strong>{name}</strong>
        <span>{position}</span>
      </div>
      <div className="top-player-score">
        <strong>{points}</strong>
        <span>Punkte</span>
      </div>
      <div className="top-player-average">
        <span>{detailLabel}</span>
        <strong>{detailValue}</strong>
      </div>
      <span className={`top-player-trend ${tone}`}>
        {tone === "positive" ? "▲" : tone === "negative" ? "▼" : "–"}{" "}
        {status}
      </span>
    </article>
  );
}
