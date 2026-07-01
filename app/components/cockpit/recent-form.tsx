const results = [
  { matchday: "ST 9", result: "S" },
  { matchday: "ST 10", result: "S" },
  { matchday: "ST 11", result: "U" },
  { matchday: "ST 12", result: "S" },
  { matchday: "ST 13", result: "S" },
  { matchday: "ST 14", result: "N" },
];

export function RecentForm() {
  return (
    <article className="recent-form-card">
      <header>
        <span>Form</span>
        <div>
          <strong>13</strong>
          <small>/ 18 Pkt.</small>
        </div>
      </header>
      <div className="form-sequence">
        {results.map((item) => (
          <div className={item.result === "N" ? "loss" : "positive"} key={item.matchday}>
            <span>{item.result}</span>
            <small>{item.matchday}</small>
          </div>
        ))}
      </div>
      <div className="streak-shift">
        <span>Serie</span>
        <strong>5</strong>
        <b>→</b>
        <strong>0</strong>
        <em>▼ 5</em>
      </div>
    </article>
  );
}
