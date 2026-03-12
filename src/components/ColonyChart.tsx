import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ColonyChartProps {
  data: { name: string; count: number; percentage: number }[];
}

// Pastel palette with clear contrast
const COLORS = [
  'hsl(200, 70%, 72%)',
  'hsl(160, 55%, 68%)',
  'hsl(40, 80%, 72%)',
  'hsl(280, 45%, 75%)',
  'hsl(20, 70%, 74%)',
  'hsl(340, 55%, 75%)',
  'hsl(120, 40%, 70%)',
  'hsl(220, 50%, 78%)',
];

const ColonyChart = ({ data }: ColonyChartProps) => {
  if (data.length === 0) return null;

  return (
    <div className="bg-card rounded-xl card-shadow p-5">
      <h3 className="font-display font-semibold text-foreground mb-4">
        Distribución por Colonias
      </h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-full md:w-1/2 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                stroke="hsl(0 0% 100%)"
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} props`, name]}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 space-y-2">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(item.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 hover:underline truncate"
                >
                  {item.name}
                </a>
              </div>
              <span className="text-muted-foreground font-bold">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColonyChart;
