import { TrendingUp, Home, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  title: string;
  type: 'new' | 'used';
  avgPrice: number;
  avgPricePerM2: number;
  constructionPct: number;
  count: number;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const ProductCard = ({
  title,
  type,
  avgPrice,
  avgPricePerM2,
  constructionPct,
  count,
}: ProductCardProps) => {
  const isNew = type === 'new';
  const hasData = count > 0 && avgPrice > 0;
  const terrainPct = 100 - constructionPct;
  const constructionVal = avgPrice * (constructionPct / 100);
  const terrainVal = avgPrice * (terrainPct / 100);

  return (
    <div className="bg-card rounded-xl card-shadow-lg overflow-hidden">
      <div className={`px-5 py-3 flex items-center justify-between ${isNew ? 'gradient-emerald' : 'gradient-navy'}`}>
        <div className="flex items-center gap-2">
          {isNew ? (
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          ) : (
            <Home className="w-5 h-5 text-primary-foreground" />
          )}
          <h3 className="font-display font-bold text-primary-foreground">{title}</h3>
        </div>
        <span className="text-sm text-primary-foreground/80 font-bold">
          {count} propiedades
        </span>
      </div>

      {hasData ? (
        <div className="p-5 space-y-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Precio Promedio
            </p>
            <p className="text-4xl font-display font-extrabold text-foreground">
              {fmt(avgPrice)}
            </p>
          </div>

          <div className="text-center bg-card rounded-lg py-3 border border-border">
            <p className="text-xs text-muted-foreground font-medium">Precio por m²</p>
            <p className="text-2xl font-display font-extrabold text-foreground">
              {fmt(avgPricePerM2)} <span className="text-base font-bold text-muted-foreground">/m²</span>
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Distribución {constructionPct}/{terrainPct}
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">🏠 {constructionPct}% Construcción</p>
                <p className="text-base font-display font-extrabold text-primary">{fmt(constructionVal)}</p>
              </div>
              <div className="flex-1 bg-secondary/10 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">🌳 {terrainPct}% Terreno</p>
                <p className="text-base font-display font-extrabold text-secondary">{fmt(terrainVal)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            Sin oferta detectada en este segmento
          </p>
          <p className="text-xs text-muted-foreground/70">
            No se encontraron propiedades de tipo "{isNew ? 'nuevo' : 'usado'}" en los datos cargados.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
