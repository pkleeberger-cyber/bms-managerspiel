type ChartPoint = {
  label: string;
  value: number;
};

type TrendChartProps = {
  title: string;
  currentValue: string;
  change: string;
  points: ChartPoint[];
  lowerIsBetter?: boolean;
  valueSuffix?: string;
};

const chartWidth = 560;
const chartHeight = 180;
const paddingX = 24;
const paddingY = 22;

function getCoordinates(points: ChartPoint[], lowerIsBetter: boolean) {
  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;

  return points.map((point, index) => {
    const x =
      paddingX +
      (index / Math.max(points.length - 1, 1)) * (chartWidth - paddingX * 2);
    const normalized = (point.value - minimum) / range;
    const direction = lowerIsBetter ? normalized : 1 - normalized;
    const y = paddingY + direction * (chartHeight - paddingY * 2);

    return { ...point, x, y };
  });
}

export function TrendChart({
  title,
  currentValue,
  change,
  points,
  lowerIsBetter = false,
  valueSuffix = "",
}: TrendChartProps) {
  const coordinates = getCoordinates(points, lowerIsBetter);
  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const areaPoints = `${paddingX},${chartHeight - paddingY} ${linePoints} ${
    chartWidth - paddingX
  },${chartHeight - paddingY}`;
  const latest = coordinates.at(-1);

  return (
    <article className="trend-chart-card">
      <header>
        <h3>{title}</h3>
        <div className="chart-summary">
          <strong>{currentValue}</strong>
          <span>{change}</span>
        </div>
      </header>

      <div className="chart-canvas">
        <svg
          role="img"
          aria-label={`${title}: ${points
            .map((point) => `${point.label} ${point.value}${valueSuffix}`)
            .join(", ")}`}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <defs>
            <linearGradient id={`area-${title.replaceAll(" ", "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((line) => {
            const y = paddingY + (line / 3) * (chartHeight - paddingY * 2);

            return (
              <line
                className="chart-grid-line"
                x1={paddingX}
                x2={chartWidth - paddingX}
                y1={y}
                y2={y}
                key={line}
              />
            );
          })}
          <polygon
            className="chart-area"
            fill={`url(#area-${title.replaceAll(" ", "-")})`}
            points={areaPoints}
          />
          <polyline className="chart-line" points={linePoints} />
          {coordinates.map((point, index) => (
            <circle
              className={index === coordinates.length - 1 ? "latest" : ""}
              cx={point.x}
              cy={point.y}
              r={index === coordinates.length - 1 ? 5 : 3}
              key={point.label}
            />
          ))}
          {latest ? (
            <text className="chart-latest-value" x={latest.x - 4} y={latest.y - 13}>
              {latest.value}
              {valueSuffix}
            </text>
          ) : null}
        </svg>
        <div className="chart-labels">
          {points.map((point) => (
            <span key={point.label}>{point.label}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
