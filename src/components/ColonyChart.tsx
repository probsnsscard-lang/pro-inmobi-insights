import { ExternalLink } from 'lucide-react';

interface ColonyChartProps {
  data: { name: string; count: number; percentage: number }[];
  properties?: { colony: string; price: number; area: number }[];
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const ColonyChart = ({ data, properties = [] }: ColonyChartProps) => {
  if (data.length === 0) return null;

  // Compute avg price per colony
  const colonyAvgPrice: Record<string, number> = {};
  data.forEach((col) => {
    const colProps = properties.filter(
      (p) => p.colony === col.name && p.price > 0
    );
    colonyAvgPrice[col.name] =
      colProps.length > 0
        ? Math.round(colProps.reduce((s, p) => s + p.price, 0) / colProps.length)
        : 0;
  });

  return (
    <div className="bg-card rounded-xl card-shadow p-5">
      <h3 className="font-display font-semibold text-foreground mb-4">
        Distribución por Colonias
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-display font-semibold text-muted-foreground">Colonia</th>
              <th className="text-right py-2 px-3 font-display font-semibold text-muted-foreground">Precio Promedio</th>
              <th className="text-center py-2 px-3 font-display font-semibold text-muted-foreground">Link</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr
                key={item.name}
                className={i % 2 === 0 ? 'bg-muted/20' : ''}
              >
                <td className="py-2.5 px-3 font-medium text-foreground">
                  {item.name}
                </td>
                <td className="py-2.5 px-3 text-right font-display font-bold text-foreground tabular-nums">
                  {colonyAvgPrice[item.name] ? fmt(colonyAvgPrice[item.name]) : '—'}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(item.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline text-xs font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver mapa
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ColonyChart;
