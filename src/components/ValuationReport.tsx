import { ValuationResult } from '@/lib/calculationEngine';
import { Building2, Ruler, Target, FileCheck, MapPin } from 'lucide-react';

interface ValuationReportProps {
  valuation: ValuationResult;
  subjectConstructionM2: number;
  subjectTerrainM2: number;
  municipality: string;
  isTerrain?: boolean;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const ValuationReport = ({ valuation, subjectConstructionM2, subjectTerrainM2, municipality, isTerrain }: ValuationReportProps) => {
  return (
    <div className="space-y-5">
      {/* 1. Características del Sujeto */}
      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="gradient-navy px-5 py-3 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-foreground" />
          <h3 className="font-display font-bold text-primary-foreground">Características del Sujeto</h3>
        </div>
        <div className="p-5">
          <div className={`grid ${isTerrain ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'} gap-4`}>
            {!isTerrain && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Construcción</p>
                <p className="text-2xl font-display font-extrabold text-foreground">{subjectConstructionM2} <span className="text-sm text-muted-foreground">m²</span></p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Terreno</p>
              <p className="text-2xl font-display font-extrabold text-foreground">{subjectTerrainM2} <span className="text-sm text-muted-foreground">m²</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Municipio</p>
              <p className="text-lg font-display font-bold text-foreground">{municipality}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                {isTerrain ? '$/m² Corazón del Mercado' : 'Costo Constr./m²'}
              </p>
              <p className="text-lg font-display font-bold text-foreground">
                {isTerrain ? fmt(valuation.marketHeartPricePerM2) : fmt(valuation.constructionCostPerM2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Metodología */}
      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2 bg-muted/50 border-b border-border">
          <Ruler className="w-5 h-5 text-secondary" />
          <h3 className="font-display font-bold text-foreground">
            {isTerrain ? 'Metodología (Media Truncada 10/10)' : 'Metodología (Muestra Filtrada)'}
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{valuation.methodology}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/30 p-3 text-center border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Universo</p>
              <p className="text-xl font-display font-extrabold text-foreground">{valuation.totalBeforeFilter}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {isTerrain ? 'Muestra Truncada' : 'Muestra'}
              </p>
              <p className="text-xl font-display font-extrabold text-secondary">
                {isTerrain ? valuation.trimmedSampleSize : valuation.sampleSize}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {isTerrain ? 'Extremos Eliminados' : 'Outliers'}
              </p>
              <p className="text-xl font-display font-extrabold text-destructive">
                {isTerrain ? valuation.totalBeforeFilter - valuation.trimmedSampleSize : valuation.outliersRemoved}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/5 p-3 text-center border border-secondary/20">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">$/m² Corazón</p>
              <p className="text-xl font-display font-extrabold text-secondary">{fmt(valuation.marketHeartPricePerM2)}</p>
            </div>
          </div>
          {!isTerrain && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-primary/5 p-3 text-center border border-primary/20">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">$/m² Construcción (mercado)</p>
                <p className="text-xl font-display font-extrabold text-primary">{fmt(valuation.avgPricePerM2Construction)}</p>
              </div>
              <div className="rounded-lg bg-secondary/5 p-3 text-center border border-secondary/20">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">$/m² Terreno (derivado)</p>
                <p className="text-xl font-display font-extrabold text-secondary">{fmt(valuation.avgPricePerM2Terrain)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Opinión de Valor Final */}
      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="gradient-emerald px-5 py-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-foreground" />
          <h3 className="font-display font-bold text-primary-foreground">
            {isTerrain ? 'Estimado de Valor de Predio' : 'Opinión de Valor Final'}
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-center py-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
              {isTerrain ? 'Valor Estimado del Predio' : 'Valor de Mercado Estimado'}
            </p>
            <p className="text-5xl font-display font-extrabold text-foreground">{fmt(valuation.finalValue)}</p>
          </div>

          {isTerrain ? (
            <div className="flex items-start gap-2 bg-secondary/10 rounded-lg p-4 border border-secondary/20">
              <MapPin className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-display font-bold text-foreground mb-1">Cálculo del Predio</p>
                <p className="text-sm text-muted-foreground">
                  {fmt(valuation.marketHeartPricePerM2)}/m² × {subjectTerrainM2} m² = <span className="font-bold text-foreground">{fmt(valuation.finalValue)}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  El $/m² se obtuvo mediante la Media Truncada 10/10: se eliminó el 10% más caro y el 10% más barato del mercado, promediando el 80% central.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <div className="flex-1 bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">🏠 Valor Construcción</p>
                  <p className="text-lg font-display font-extrabold text-primary">{fmt(valuation.estimatedConstructionValue)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{subjectConstructionM2} m² × {fmt(valuation.constructionCostPerM2)}</p>
                </div>
                <div className="flex-1 bg-secondary/10 rounded-lg p-4 text-center border border-secondary/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">🌳 Valor Terreno</p>
                  <p className="text-lg font-display font-extrabold text-secondary">{fmt(valuation.estimatedTerrainValue)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{subjectTerrainM2} m² × {fmt(valuation.avgPricePerM2Terrain)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-muted/30 rounded-lg p-3 border border-border">
                <FileCheck className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cálculo basado en el promedio de m² de construcción de la muestra filtrada ({valuation.avgConstructionM2} m²), 
                  aplicando un costo de construcción de {fmt(valuation.constructionCostPerM2)}/m² y un valor de terreno 
                  derivado del mercado de {fmt(valuation.avgPricePerM2Terrain)}/m².
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValuationReport;
