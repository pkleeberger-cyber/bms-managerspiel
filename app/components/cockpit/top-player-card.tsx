type TopPlayerCardProps = {
  name: string;
  position: string;
  initials: string;
  points: number;
  seasonAverage: number;
};

export function TopPlayerCard({
  name,
  position,
  initials,
  points,
  seasonAverage,
}: TopPlayerCardProps) {
  const difference = points - seasonAverage;
  const positive = difference >= 0;

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
        <span>Saison-Ø</span>
        <strong>{seasonAverage.toFixed(1)}</strong>
      </div>
      <span className={`top-player-trend ${positive ? "positive" : "negative"}`}>
        {positive ? "▲" : "▼"} {positive ? "+" : ""}
        {difference.toFixed(1)}
      </span>
    </article>
  );
}
