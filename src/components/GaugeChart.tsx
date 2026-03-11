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
  const angle = -90 + pct * 180; // -90 to 90 degrees

  // SVG arc
  const cx = 100, cy = 90, r = 70;

  const polarToXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  // Background arc segments (green -> yellow -> red)
  const segments = [
    { start: 180, end: 240, color: 'hsl(160, 84%, 39%)' },  // green (cheap)
    { start: 240, end: 300, color: 'hsl(40, 90%, 55%)' },    // yellow (moderate)
    { start: 300, end: 360, color: 'hsl(0, 84%, 60%)' },     // red (expensive)
  ];

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToXY(startAngle);
    const end = polarToXY(endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Needle
  const needleAngle = 180 + pct * 180;
  const needleTip = polarToXY(needleAngle);

  // Color based on value position
  let valueColor = 'text-secondary';
  if (pct > 0.66) valueColor = 'text-destructive';
  else if (pct > 0.33) valueColor = 'text-gold';

  return (
    <div className="bg-card rounded-xl card-shadow p-5 flex flex-col items-center">
      <p className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      <svg viewBox="0 10 200 110" className="w-full max-w-[220px]">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={describeArc(seg.start, seg.end)}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            strokeLinecap="round"
            opacity={0.25}
          />
        ))}
        {/* Active arc up to needle */}
        <path
          d={describeArc(180, needleAngle)}
          fill="none"
          stroke={pct > 0.66 ? 'hsl(0, 84%, 60%)' : pct > 0.33 ? 'hsl(40, 90%, 55%)' : 'hsl(160, 84%, 39%)'}
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="hsl(213, 56%, 24%)" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="hsl(213, 56%, 24%)" />
        {/* Min / Max labels */}
        <text x="25" y="105" fontSize="9" fill="#888" textAnchor="middle">{fmt(min)}</text>
        <text x="175" y="105" fontSize="9" fill="#888" textAnchor="middle">{fmt(max)}</text>
      </svg>
      <p className={`text-3xl font-display font-extrabold ${valueColor} -mt-2`}>
        {fmt(value)}
      </p>
      <p className="text-xs text-muted-foreground">/m²</p>
    </div>
  );
};

export default GaugeChart;
