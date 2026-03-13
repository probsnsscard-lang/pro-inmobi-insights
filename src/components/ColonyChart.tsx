interface ColonyChartProps {
  data: { name: string; count: number; percentage: number }[];
}

const BAR_COLORS = [
  'bg-secondary',
  'bg-primary',
  'bg-gold',
  'bg-emerald-500',
  'bg-blue-400',
  'bg-orange-400',
  'bg-purple-400',
  'bg-teal-400',
];

const ColonyChart = ({ data }: ColonyChartProps) => {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-card rounded-xl card-shadow p-5">
      <h3 className="font-display font-semibold text-foreground mb-4">
        Distribución por Colonias
      </h3>
      <div className="space-y-0">
        {data.map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md ${
              i % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-sm shrink-0 ${BAR_COLORS[i % BAR_COLORS.length]}`}
            />
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(item.name)}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-500 hover:underline min-w-[140px] shrink-0"
            >
              {item.name}
            </a>
            <div className="flex-1 h-4 bg-muted/40 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} opacity-70`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-muted-foreground w-12 text-right shrink-0">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColonyChart;
