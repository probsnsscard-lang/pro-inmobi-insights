import { useState } from 'react';
import Header from '@/components/Header';
import InputPanel from '@/components/InputPanel';
import ProductCard from '@/components/ProductCard';
import ColonyChart from '@/components/ColonyChart';
import InsightsPanel from '@/components/InsightsPanel';
import MarketSemaphore from '@/components/MarketSemaphore';
import GaugeChart from '@/components/GaugeChart';
import OpportunityRadar from '@/components/OpportunityRadar';
import ValuationReport from '@/components/ValuationReport';
import { PropertyData, SubjectProperty, analyzeProperties, AnalysisResult } from '@/lib/calculationEngine';
import { generatePDF } from '@/lib/pdfGenerator';
import { generateMarketReportPDF } from '@/lib/marketReportPdf';
import { FileDown, BarChart3, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const MUNICIPALITIES = [
  'Toluca', 'Metepec', 'Lerma', 'Ocoyoacac',
  'San Mateo Atenco', 'Calimaya', 'Zinacantepec', 'Almoloya de Juárez',
];

const SPLIT_PRESETS = [
  { label: '60/40', value: 60 },
  { label: '50/50', value: 50 },
  { label: '40/60', value: 40 },
  { label: '20/80', value: 20 },
  { label: '0/100', value: 0 },
];

const Index = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<string[]>(['Metepec']);
  const [constructionPct, setConstructionPct] = useState(60);
  const [clientName, setClientName] = useState('');
  const [analystName, setAnalystName] = useState('');
  const [subjectConstructionM2, setSubjectConstructionM2] = useState(0);
  const [subjectTerrainM2, setSubjectTerrainM2] = useState(0);
  const [subjectLocation, setSubjectLocation] = useState('');
  const [subjectType, setSubjectType] = useState<'Casa Habitación' | 'Departamento' | 'Terreno' | 'Comercial'>('Casa Habitación');
  const [subjectRooms, setSubjectRooms] = useState('');
  const [subjectParking, setSubjectParking] = useState('');
  const [subjectExtras, setSubjectExtras] = useState('');

  const isTerrain = subjectType === 'Terreno';
  const terrainPct = 100 - constructionPct;
  const municipalityLabel = selectedMunicipalities.length === 1
    ? selectedMunicipalities[0]
    : `${selectedMunicipalities.length} municipios`;

  const subject: SubjectProperty = {
    constructionM2: isTerrain ? 0 : subjectConstructionM2,
    terrainM2: subjectTerrainM2,
    productType: subjectType,
  };

  const toggleMunicipality = (m: string) => {
    setSelectedMunicipalities(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const selectAll = () => {
    setSelectedMunicipalities(prev =>
      prev.length === MUNICIPALITIES.length ? [] : [...MUNICIPALITIES]
    );
  };

  const handleAnalyze = (data: PropertyData[]) => {
    setIsProcessing(true);
    setTimeout(() => {
      const analysis = analyzeProperties(data, subject);
      analysis.municipality = municipalityLabel;
      setResult(analysis);
      setIsProcessing(false);
    }, 800);
  };

  const handleAIResult = (aiResult: AnalysisResult) => {
    aiResult.municipality = municipalityLabel;
    setResult(aiResult);
  };

  const handleTypeChange = (val: 'Casa Habitación' | 'Departamento' | 'Terreno' | 'Comercial') => {
    setSubjectType(val);
    if (val === 'Terreno') {
      setSubjectConstructionM2(0);
      setConstructionPct(0);
    } else if (constructionPct === 0) {
      setConstructionPct(60);
    }
  };

  // Valor estimado = precio_m2 × metros del usuario. Si no hay metros → $0
  const marketPricePerM2 = result?.valuation?.marketHeartPricePerM2 ?? 0;
  const userM2 = isTerrain ? subjectTerrainM2 : subjectConstructionM2;
  const estimatedTotal = userM2 > 0 ? Math.round(marketPricePerM2 * userM2) : 0;

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

  const subjectDetails = {
    location: subjectLocation,
    type: subjectType,
    rooms: subjectRooms,
    parking: subjectParking,
    extras: subjectExtras,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Municipality Multi-Selector */}
        <div className="bg-card rounded-xl card-shadow p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-secondary" />
            <h2 className="font-display font-semibold text-foreground text-lg">Zona de Influencia</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={selectAll}
              className={`text-xs font-display font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                selectedMunicipalities.length === MUNICIPALITIES.length
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              Todos
            </button>
            {MUNICIPALITIES.map((m) => (
              <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={selectedMunicipalities.includes(m)}
                  onCheckedChange={() => toggleMunicipality(m)}
                />
                <span className={`text-sm font-medium transition-colors ${
                  selectedMunicipalities.includes(m) ? 'text-foreground' : 'text-muted-foreground'
                }`}>{m}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Analyst + Client */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-display font-semibold text-foreground">Analista:</label>
            <Input
              value={analystName}
              onChange={(e) => setAnalystName(e.target.value)}
              placeholder="Ataúlfo Figón"
              className="w-48 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-display font-semibold text-foreground">Cliente:</label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre del cliente o empresa"
              className="w-48 text-sm"
            />
          </div>
        </div>

        {/* Subject Property */}
        <div className="bg-card rounded-xl card-shadow p-5 space-y-3">
          <p className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground">
            📐 Características de la Propiedad (Sujeto a Valuar)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Ubicación</label>
              <Input
                value={subjectLocation}
                onChange={(e) => setSubjectLocation(e.target.value)}
                placeholder="Ej: Col. Reforma, Metepec"
                className="text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo de Inmueble</label>
              <select
                value={subjectType}
                onChange={(e) => handleTypeChange(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Casa Habitación">Casa Habitación</option>
                <option value="Departamento">Departamento</option>
                <option value="Terreno">Terreno</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Metros Cuadrados a Valuar</label>
              <Input
                type="number"
                value={isTerrain ? (subjectTerrainM2 || '') : (subjectConstructionM2 || '')}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  if (isTerrain) {
                    setSubjectTerrainM2(v);
                  } else {
                    setSubjectConstructionM2(v);
                  }
                }}
                placeholder=""
                className="text-sm font-bold"
                min={0}
              />
              {userM2 > 0 && marketPricePerM2 > 0 && (
                <p className="text-xs font-display font-semibold text-secondary mt-1">
                  Valor estimado en tiempo real: {fmt(estimatedTotal)}
                </p>
              )}
            </div>

            {/* Conditionally show rooms/parking only for non-terrain */}
            {!isTerrain && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Recámaras / Baños</label>
                  <Input
                    value={subjectRooms}
                    onChange={(e) => setSubjectRooms(e.target.value)}
                    placeholder="Ej: 3 recámaras / 2 baños"
                    className="text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Estacionamiento</label>
                  <Input
                    value={subjectParking}
                    onChange={(e) => setSubjectParking(e.target.value)}
                    placeholder="Ej: 2 cajones"
                    className="text-sm"
                  />
                </div>
              </>
            )}

            <div className={`flex flex-col gap-1 ${isTerrain ? '' : 'col-span-2'}`}>
              <label className="text-xs font-medium text-muted-foreground">Extras</label>
              <Input
                value={subjectExtras}
                onChange={(e) => setSubjectExtras(e.target.value)}
                placeholder={isTerrain ? 'Ej: Uso de suelo, servicios' : 'Ej: Cisterna, cuarto de servicio'}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Slider de distribución eliminado — el cálculo es directo: superficie × precio_m² */}

        <InputPanel
          onAnalyze={handleAnalyze}
          onAIResult={handleAIResult}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          subject={subject}
        />

        {result && (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-secondary" />
                <h2 className="font-display font-semibold text-foreground text-lg">
                  Resultados — {municipalityLabel}
                </h2>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {result.totalProperties} propiedades
                </span>
                {result.valuation && (
                  <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                    Corazón del Mercado: {fmt(result.valuation.marketHeartPricePerM2)}/m²
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-right">
                <p className="text-xs text-muted-foreground">
                    VALOR COMERCIAL ESTIMADO
                  </p>
                  <p className="text-xl font-display font-extrabold text-foreground">{fmt(estimatedTotal)}</p>
                </div>
                <Button
                  onClick={() => {
                    if (userM2 <= 0) {
                      alert(isTerrain ? 'Ingresa los m² de terreno antes de generar el reporte.' : 'Ingresa los m² de construcción antes de generar el reporte.');
                      return;
                    }
                    generatePDF(result, estimatedTotal, constructionPct, clientName, analystName, subject, subjectDetails, municipalityLabel);
                  }}
                  className="gradient-navy text-primary-foreground border-0 hover:opacity-90 transition-opacity font-display font-semibold"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF Individual
                </Button>
                {selectedMunicipalities.length > 1 && (
                  <Button
                    onClick={() => generateMarketReportPDF(result, selectedMunicipalities, analystName, clientName)}
                    variant="outline"
                    className="border-secondary text-secondary hover:bg-secondary/5 font-display font-semibold"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Reporte General
                  </Button>
                )}
              </div>
            </div>

            {/* Valuation Report */}
            {result.valuation && (
              <ValuationReport
                valuation={result.valuation}
                subjectConstructionM2={isTerrain ? 0 : subjectConstructionM2}
                subjectTerrainM2={subjectTerrainM2}
                municipality={municipalityLabel}
                isTerrain={isTerrain}
              />
            )}

            {/* Semaphore + Gauge */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <MarketSemaphore
                newAvgPrice={result.newAvgPrice}
                usedAvgPrice={result.usedAvgPrice}
                newCount={result.newCount ?? result.newProducts.length}
                usedCount={result.usedCount ?? result.usedProducts.length}
              />
              <GaugeChart
                value={result.valuation?.marketHeartPricePerM2 || combinedPricePerM2}
                label={isTerrain ? '$/m² Terreno (Corazón)' : '$/m² Producto Nuevo'}
              />
              <GaugeChart
                value={result.usedAvgPricePerM2 || combinedPricePerM2}
                label={isTerrain ? '$/m² Promedio General' : '$/m² Producto Usado'}
              />
            </div>

            {/* Product cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ProductCard
                title="Producto Nuevo"
                type="new"
                avgPrice={result.newAvgPrice}
                avgPricePerM2={result.newAvgPricePerM2}
                constructionPct={isTerrain ? 0 : constructionPct}
                count={result.newCount ?? result.newProducts.length}
              />
              <ProductCard
                title="Producto Usado"
                type="used"
                avgPrice={result.usedAvgPrice}
                avgPricePerM2={result.usedAvgPricePerM2}
                constructionPct={isTerrain ? 0 : constructionPct}
                count={result.usedCount ?? result.usedProducts.length}
              />
            </div>

            {/* Colony chart + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ColonyChart data={result.colonyDistribution} properties={[...result.newProducts, ...result.usedProducts]} />
              <InsightsPanel insights={result.insights} />
            </div>

            {/* Opportunity Radar */}
            <OpportunityRadar properties={[...result.newProducts, ...result.usedProducts]} />
          </>
        )}
      </main>

      <footer className="mt-12 py-4 text-center text-xs text-muted-foreground border-t border-border">
        Análisis de Mercado Pro — por <span className="font-semibold">Ataúlfo Figón</span>
      </footer>
    </div>
  );
};

export default Index;
