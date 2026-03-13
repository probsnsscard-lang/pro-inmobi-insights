import { useState } from 'react';
import Header from '@/components/Header';
import InputPanel from '@/components/InputPanel';
import ProductCard from '@/components/ProductCard';
import ColonyChart from '@/components/ColonyChart';
import InsightsPanel from '@/components/InsightsPanel';
import MarketSemaphore from '@/components/MarketSemaphore';
import GaugeChart from '@/components/GaugeChart';
import OpportunityRadar from '@/components/OpportunityRadar';
import { PropertyData, analyzeProperties, AnalysisResult } from '@/lib/calculationEngine';
import { generatePDF } from '@/lib/pdfGenerator';
import { FileDown, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

const MUNICIPALITIES = [
  'Toluca', 'Metepec', 'Lerma', 'Ocoyoacac',
  'San Mateo Atenco', 'Calimaya', 'Zinacantepec', 'Almoloya de Juárez',
];

const SPLIT_PRESETS = [
  { label: '60/40', value: 60 },
  { label: '50/50', value: 50 },
  { label: '40/60', value: 40 },
  { label: '20/80', value: 20 },
];

const Index = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [municipality, setMunicipality] = useState('Metepec');
  const [constructionPct, setConstructionPct] = useState(60);
  const [clientName, setClientName] = useState('');
  const [analystName, setAnalystName] = useState('');

  const terrainPct = 100 - constructionPct;

  const handleAnalyze = (data: PropertyData[]) => {
    setIsProcessing(true);
    setTimeout(() => {
      const analysis = analyzeProperties(data);
      analysis.municipality = municipality;
      setResult(analysis);
      setIsProcessing(false);
    }, 800);
  };

  const handleAIResult = (aiResult: AnalysisResult) => {
    aiResult.municipality = municipality;
    setResult(aiResult);
  };

  const estimatedTotal = result
    ? (() => {
        const nc = result.newCount ?? result.newProducts.length;
        const uc = result.usedCount ?? result.usedProducts.length;
        const total = nc + uc;
        if (total === 0) return 0;
        return Math.round((result.newAvgPrice * nc + result.usedAvgPrice * uc) / total);
      })()
    : 0;

  const combinedPricePerM2 = result
    ? (() => {
        const nc = result.newCount ?? result.newProducts.length;
        const uc = result.usedCount ?? result.usedProducts.length;
        const total = nc + uc;
        if (total === 0) return 0;
        return Math.round((result.newAvgPricePerM2 * nc + result.usedAvgPricePerM2 * uc) / total);
      })()
    : 0;

  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

  // Compute split values dynamically
  const cPct = constructionPct / 100;
  const tPct = terrainPct / 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Municipality + Client row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-display font-semibold text-foreground">Municipio:</label>
            <select
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
            >
              {MUNICIPALITIES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-display font-semibold text-foreground">Cliente:</label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre del cliente o empresa"
              className="w-64 text-sm"
            />
          </div>
        </div>

        {/* Distribution Slider */}
        <div className="bg-card rounded-xl card-shadow p-5 space-y-3">
          <p className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground">
            Distribución de Valor — Construcción / Terreno
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm font-display font-bold text-primary w-28">
              🏠 {constructionPct}% Constr.
            </span>
            <Slider
              value={[constructionPct]}
              onValueChange={(v) => setConstructionPct(v[0])}
              min={10}
              max={90}
              step={5}
              className="flex-1"
            />
            <span className="text-sm font-display font-bold text-secondary w-28 text-right">
              🌳 {terrainPct}% Terreno
            </span>
          </div>
          <div className="flex gap-2">
            {SPLIT_PRESETS.map((p) => (
              <Button
                key={p.label}
                variant={constructionPct === p.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConstructionPct(p.value)}
                className="text-xs font-display font-semibold"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <InputPanel
          onAnalyze={handleAnalyze}
          onAIResult={handleAIResult}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />

        {result && (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-secondary" />
                <h2 className="font-display font-semibold text-foreground text-lg">
                  Resultados — {municipality}
                </h2>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {result.totalProperties} propiedades
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Valor Estimado Total</p>
                  <p className="text-xl font-display font-extrabold text-foreground">{fmt(estimatedTotal)}</p>
                </div>
                <Button
                  onClick={() => generatePDF(result, estimatedTotal, constructionPct, clientName)}
                  className="gradient-emerald text-primary-foreground border-0 hover:opacity-90 transition-opacity font-display font-semibold"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>

            {/* Semaphore + Gauge */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <MarketSemaphore
                newAvgPrice={result.newAvgPrice}
                usedAvgPrice={result.usedAvgPrice}
                newCount={result.newCount ?? result.newProducts.length}
                usedCount={result.usedCount ?? result.usedProducts.length}
              />
              <GaugeChart
                value={result.newAvgPricePerM2 || combinedPricePerM2}
                label="$/m² Producto Nuevo"
              />
              <GaugeChart
                value={result.usedAvgPricePerM2 || combinedPricePerM2}
                label="$/m² Producto Usado"
              />
            </div>

            {/* Product cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ProductCard
                title="Producto Nuevo"
                type="new"
                avgPrice={result.newAvgPrice}
                avgPricePerM2={result.newAvgPricePerM2}
                constructionPct={constructionPct}
                count={result.newCount ?? result.newProducts.length}
              />
              <ProductCard
                title="Producto Usado"
                type="used"
                avgPrice={result.usedAvgPrice}
                avgPricePerM2={result.usedAvgPricePerM2}
                constructionPct={constructionPct}
                count={result.usedCount ?? result.usedProducts.length}
              />
            </div>

            {/* Colony chart + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ColonyChart data={result.colonyDistribution} />
              <InsightsPanel insights={result.insights} />
            </div>

            {/* Opportunity Radar — app only */}
            <OpportunityRadar properties={[...result.newProducts, ...result.usedProducts]} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-4 text-center text-xs text-muted-foreground border-t border-border">
        Análisis de Mercado Pro — por <span className="font-semibold">Ataúlfo Figón</span>
      </footer>
    </div>
  );
};

export default Index;
