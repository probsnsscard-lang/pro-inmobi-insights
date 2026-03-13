interface GaugeChartProps {
  value: number;
  label: string;
  min?: number;
  max?: number;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const GaugeChart = ({ value, label, min = 5000, max = 60000 }: GaugeChartProps) => {
  const clamped = Math.max(min, Math.min(max, value));
  const pct = (clamped - min) / (max - min);

  const cx = 100, cy = 95, r = 72;
  const strokeW = 18;

  const polarToXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToXY(startAngle);
    const end = polarToXY(endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Background arc: green → yellow → red
  const segments = [
    { start: 180, end: 240, color: 'hsl(160, 84%, 39%)' },
    { start: 240, end: 300, color: 'hsl(45, 93%, 50%)' },
    { start: 300, end: 360, color: 'hsl(0, 84%, 55%)' },
  ];

  // Needle angle
  const needleAngle = 180 + pct * 180;
  const needleTip = polarToXY(needleAngle);

  // Tick marks
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  let valueColor = 'text-secondary';
  if (pct > 0.66) valueColor = 'text-destructive';
  else if (pct > 0.33) valueColor = 'text-gold';

  return (
    <div className="bg-card rounded-xl card-shadow p-5 flex flex-col items-center">
      <p className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
        {/* Background segments (dimmed) */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={describeArc(seg.start, seg.end)}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeLinecap="butt"
            opacity={0.2}
          />
        ))}

        {/* Active arc up to needle */}
        <path
          d={describeArc(180, needleAngle)}
          fill="none"
          stroke={pct > 0.66 ? 'hsl(0, 84%, 55%)' : pct > 0.33 ? 'hsl(45, 93%, 50%)' : 'hsl(160, 84%, 39%)'}
          strokeWidth={strokeW}
          strokeLinecap="butt"
        />

        {/* Tick marks */}
        {ticks.map((t, i) => {
          const angle = 180 + t * 180;
          const inner = polarToXY(angle);
          const outerR = r + strokeW / 2 + 3;
          const outerPt = {
            x: cx + outerR * Math.cos((angle * Math.PI) / 180),
            y: cy + outerR * Math.sin((angle * Math.PI) / 180),
          };
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outerPt.x}
              y2={outerPt.y}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1"
              opacity={0.4}
            />
          );
        })}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="hsl(213, 56%, 24%)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Needle hub */}
        <circle cx={cx} cy={cy} r="7" fill="hsl(213, 56%, 24%)" />
        <circle cx={cx} cy={cy} r="3" fill="hsl(var(--card))" />

        {/* Min / Max labels */}
        <text x="18" y="108" fontSize="9" fill="hsl(var(--muted-foreground))" textAnchor="middle">{fmt(min)}</text>
        <text x="182" y="108" fontSize="9" fill="hsl(var(--muted-foreground))" textAnchor="middle">{fmt(max)}</text>
        {/* Zone labels */}
        <text x="48" y="50" fontSize="7" fill="hsl(160, 84%, 39%)" textAnchor="middle" opacity={0.7}>Bajo</text>
        <text x="100" y="30" fontSize="7" fill="hsl(45, 93%, 50%)" textAnchor="middle" opacity={0.7}>Promedio</text>
        <text x="152" y="50" fontSize="7" fill="hsl(0, 84%, 55%)" textAnchor="middle" opacity={0.7}>Alto</text>
      </svg>
      <p className={`text-3xl font-display font-extrabold ${valueColor} -mt-1`}>
        {fmt(value)}
      </p>
      <p className="text-xs text-muted-foreground">/m²</p>
    </div>
  );
};

export default GaugeChart;
