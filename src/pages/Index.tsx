import { useState } from 'react';
import Header from '@/components/Header';
import InputPanel from '@/components/InputPanel';
import ProductCard from '@/components/ProductCard';
import ColonyChart from '@/components/ColonyChart';
import InsightsPanel from '@/components/InsightsPanel';
import { PropertyData, analyzeProperties, AnalysisResult } from '@/lib/calculationEngine';
import { generatePDF } from '@/lib/pdfGenerator';
import { FileDown, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAnalyze = (data: PropertyData[]) => {
    setIsProcessing(true);
    setTimeout(() => {
      const analysis = analyzeProperties(data);
      setResult(analysis);
      setIsProcessing(false);
    }, 800);
  };

  const handleAIResult = (aiResult: AnalysisResult) => {
    setResult(aiResult);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <InputPanel
          onAnalyze={handleAnalyze}
          onAIResult={handleAIResult}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />

        {result && (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-secondary" />
                <h2 className="font-display font-semibold text-foreground text-lg">
                  Resultados del Análisis
                </h2>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {result.totalProperties} propiedades
                </span>
              </div>
              <Button
                onClick={() => generatePDF(result)}
                className="gradient-emerald text-primary-foreground border-0 hover:opacity-90 transition-opacity font-display font-semibold"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            </div>

            {/* Product cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ProductCard
                title="Producto Nuevo"
                type="new"
                avgPrice={result.newAvgPrice}
                avgPricePerM2={result.newAvgPricePerM2}
                construction60={result.newConstruction60}
                terrain40={result.newTerrain40}
                count={result.newProducts.length}
              />
              <ProductCard
                title="Producto Usado"
                type="used"
                avgPrice={result.usedAvgPrice}
                avgPricePerM2={result.usedAvgPricePerM2}
                construction60={result.usedConstruction60}
                terrain40={result.usedTerrain40}
                count={result.usedProducts.length}
              />
            </div>

            {/* Charts and insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ColonyChart data={result.colonyDistribution} />
              <InsightsPanel insights={result.insights} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
