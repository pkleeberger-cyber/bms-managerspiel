type ComparisonCardProps = {
  label: string;
  managerValue: number;
  opponentValue: number;
  difference: number;
  winner: "HOME" | "AWAY" | "TIED";
};

export function ComparisonCard({
  label,
  managerValue,
  opponentValue,
  difference,
  winner,
}: ComparisonCardProps) {
  return (
    <article className="comparison-card">
      <header>
        <span>{label}</span>
      </header>
      <div className="team-part-comparison">
        <div className="team-part-value">
          <span>Dein Team</span>
          <strong>{managerValue}</strong>
        </div>
        <div className="team-part-value">
          <span>Gegner</span>
          <strong>{opponentValue}</strong>
        </div>
        <div
          className={`team-part-difference ${
            winner === "HOME" ? "positive" : winner === "AWAY" ? "negative" : "neutral"
          }`}
        >
          <span>Differenz</span>
          <strong>
            {difference > 0 ? "▲" : difference < 0 ? "▼" : "–"}{" "}
            {difference > 0 ? "+" : ""}
            {difference}
          </strong>
        </div>
      </div>
    </article>
  );
}
