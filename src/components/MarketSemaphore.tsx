import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MarketSemaphoreProps {
  newAvgPrice: number;
  usedAvgPrice: number;
  newCount: number;
  usedCount: number;
}

const MarketSemaphore = ({ newAvgPrice, usedAvgPrice, newCount, usedCount }: MarketSemaphoreProps) => {
  // Determine market condition based on new vs used premium
  let level: 'hot' | 'warm' | 'cool' = 'warm';
  let label = 'Mercado Estable';
  let description = 'Condiciones normales de mercado';

  if (newCount > 0 && usedCount > 0 && usedAvgPrice > 0) {
    const premium = ((newAvgPrice - usedAvgPrice) / usedAvgPrice) * 100;
    if (premium > 30) {
      level = 'hot';
      label = 'Mercado Caliente';
      description = `Prima del ${premium.toFixed(0)}% en producto nuevo`;
    } else if (premium < 10) {
      level = 'cool';
      label = 'Mercado Frío';
      description = `Baja diferencia entre nuevo y usado (${premium.toFixed(0)}%)`;
    } else {
      label = 'Mercado Estable';
      description = `Prima moderada del ${premium.toFixed(0)}%`;
    }
  } else if (newCount === 0 && usedCount > 0) {
    level = 'cool';
    label = 'Solo Producto Usado';
    description = 'No se detectó oferta nueva';
  } else if (usedCount === 0 && newCount > 0) {
    level = 'hot';
    label = 'Solo Producto Nuevo';
    description = 'No se detectó oferta usada';
  }

  const colors = {
    hot: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', dot: 'bg-destructive' },
    warm: { bg: 'bg-gold/10', border: 'border-gold/30', text: 'text-gold', dot: 'bg-gold' },
    cool: { bg: 'bg-secondary/10', border: 'border-secondary/30', text: 'text-secondary', dot: 'bg-secondary' },
  };

  const c = colors[level];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex flex-col gap-1.5">
          <div className={`w-4 h-4 rounded-full ${level === 'hot' ? 'bg-destructive' : 'bg-destructive/20'}`} />
          <div className={`w-4 h-4 rounded-full ${level === 'warm' ? 'bg-gold' : 'bg-gold/20'}`} />
          <div className={`w-4 h-4 rounded-full ${level === 'cool' ? 'bg-secondary' : 'bg-secondary/20'}`} />
        </div>
        <div>
          <h3 className={`font-display font-bold text-lg ${c.text}`}>
            {level === 'hot' && <TrendingUp className="inline w-5 h-5 mr-1" />}
            {level === 'warm' && <Minus className="inline w-5 h-5 mr-1" />}
            {level === 'cool' && <TrendingDown className="inline w-5 h-5 mr-1" />}
            {label}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <p className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
        Semáforo de Mercado
      </p>
    </div>
  );
};

export default MarketSemaphore;
