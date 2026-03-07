import { TrendingUp, Home } from 'lucide-react';

interface ProductCardProps {
  title: string;
  type: 'new' | 'used';
  avgPrice: number;
  avgPricePerM2: number;
  construction60: number;
  terrain40: number;
  count: number;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const ProductCard = ({
  title,
  type,
  avgPrice,
  avgPricePerM2,
  construction60,
  terrain40,
  count,
}: ProductCardProps) => {
  const isNew = type === 'new';

  return (
    <div className="bg-card rounded-xl card-shadow-lg overflow-hidden">
      <div className={`px-5 py-3 flex items-center justify-between ${isNew ? 'gradient-navy' : 'gradient-emerald'}`}>
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

      <div className="p-5 space-y-4">
        {/* Main price */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Precio Promedio
          </p>
          <p className="text-4xl font-display font-extrabold text-foreground">
            {fmt(avgPrice)}
          </p>
        </div>

        {/* Price per m2 — white bg, no blue line, bold text */}
        <div className="text-center bg-card rounded-lg py-3 border border-border">
          <p className="text-xs text-muted-foreground font-medium">Precio por m²</p>
          <p className="text-2xl font-display font-extrabold text-foreground">
            {fmt(avgPricePerM2)} <span className="text-base font-bold text-muted-foreground">/m²</span>
          </p>
        </div>

        {/* 60/40 Rule */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Regla 60/40
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-primary/10 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">60% Construcción</p>
              <p className="text-base font-display font-extrabold text-primary">{fmt(construction60)}</p>
            </div>
            <div className="flex-1 bg-secondary/10 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">40% Terreno</p>
              <p className="text-base font-display font-extrabold text-secondary">{fmt(terrain40)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
