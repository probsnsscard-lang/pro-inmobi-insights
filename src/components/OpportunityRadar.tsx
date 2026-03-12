import { ExternalLink, Search, AlertTriangle } from 'lucide-react';
import { PropertyData } from '@/lib/calculationEngine';
import { Button } from '@/components/ui/button';

interface OpportunityRadarProps {
  properties: PropertyData[];
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const OpportunityRadar = ({ properties }: OpportunityRadarProps) => {
  if (properties.length === 0) return null;

  // Get 2 cheapest properties with valid price
  const sorted = [...properties]
    .filter(p => p.price > 0 && p.area > 0)
    .sort((a, b) => a.price - b.price);

  const cheapest = sorted.slice(0, 2);

  if (cheapest.length === 0) return null;

  return (
    <div className="bg-card rounded-xl card-shadow p-5">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-gold" />
        <h3 className="font-display font-semibold text-foreground">
          Radar de Oportunidades
        </h3>
      </div>

      <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg bg-gold/10 border border-gold/20">
        <AlertTriangle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Precios por debajo del promedio. Investiga la fuente original para descartar fraudes.
        </p>
      </div>

      <div className="space-y-3">
        {cheapest.map((prop, i) => {
          const pricePerM2 = prop.area > 0 ? Math.round(prop.price / prop.area) : 0;
          return (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-display font-bold text-muted-foreground uppercase">
                    {prop.type === 'new' ? '🏠 Nuevo' : '🏠 Usado'}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{prop.colony}</span>
                </div>
                <p className="text-lg font-display font-extrabold text-foreground">{fmt(prop.price)}</p>
                <p className="text-xs text-muted-foreground">
                  {prop.area} m² — {fmt(pricePerM2)}/m²
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-secondary/40 text-secondary hover:bg-secondary/5"
                onClick={() => {
                  const query = encodeURIComponent(`casa ${prop.colony} ${fmt(prop.price)}`);
                  window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noreferrer');
                }}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Investigar
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OpportunityRadar;
