interface RadarDim {
  label: string;
  value: number; // 0-100
}

interface RadarProps {
  dims: RadarDim[];
  compare?: number[];      // optional overlay (e.g. opening scores), same order as dims
  size?: number;
}

/** Lightweight SVG spider/radar chart. No external deps. */
export function Radar({ dims, compare, size = 220 }: RadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const n = dims.length;

  const pointAt = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = (Math.max(0, Math.min(100, value)) / 100) * r;
    return [cx + rr * Math.cos(angle), cy + rr * Math.sin(angle)] as const;
  };

  const polygon = (values: number[]) =>
    values.map((v, i) => pointAt(i, v).join(',')).join(' ');

  const rings = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* grid rings */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={polygon(dims.map(() => ring))}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {/* axes + labels */}
      {dims.map((d, i) => {
        const [x, y] = pointAt(i, 100);
        const [lx, ly] = pointAt(i, 122);
        return (
          <g key={d.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              fontSize={11}
              fill="var(--text-3)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {d.label}
            </text>
          </g>
        );
      })}
      {/* compare overlay (opening) */}
      {compare && (
        <polygon
          points={polygon(compare)}
          fill="var(--text-3)"
          fillOpacity={0.08}
          stroke="var(--text-3)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      {/* main values */}
      <polygon
        points={polygon(dims.map((d) => d.value))}
        fill="var(--purple)"
        fillOpacity={0.18}
        stroke="var(--purple)"
        strokeWidth={2}
      />
      {dims.map((d, i) => {
        const [x, y] = pointAt(i, d.value);
        return <circle key={d.label} cx={x} cy={y} r={3} fill="var(--purple)" />;
      })}
    </svg>
  );
}
