import { useState } from 'react';
import { Link, Zap, FileJson, Play, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { PropertyData, getDemoData, AnalysisResult } from '@/lib/calculationEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InputPanelProps {
  onAnalyze: (data: PropertyData[]) => void;
  onAIResult?: (result: AnalysisResult) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

const InputPanel = ({ onAnalyze, onAIResult, isProcessing, setIsProcessing }: InputPanelProps) => {
  const [links, setLinks] = useState(['', '', '']);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const validateJson = (input: string): any[] | null => {
    if (!input.trim()) return null;
    try {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setJsonError('El JSON debe ser un array con al menos una propiedad.');
        return null;
      }
      // Validate required fields
      for (const item of parsed) {
        if (!item.price && !item.precio) {
          setJsonError('Cada propiedad debe tener un campo "price" o "precio".');
          return null;
        }
      }
      setJsonError(null);
      return parsed;
    } catch {
      setJsonError('JSON inválido. Verifica la sintaxis.');
      return null;
    }
  };

  const handleProcess = async () => {
    const trimmed = jsonInput.trim();

    // If no JSON, use demo data locally (no API call)
    if (!trimmed) {
      onAnalyze(getDemoData());
      return;
    }

    // Validate JSON before sending
    const properties = validateJson(trimmed);
    if (!properties) return;

    // Send to Gemini via edge function
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-properties', {
        body: { properties },
      });

      if (error) {
        throw new Error(error.message || 'Error al invocar la función');
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Validate the AI response has the expected structure
      if (data && data.newAvgPrice !== undefined && data.colonyDistribution) {
        onAIResult?.(data as AnalysisResult);
        toast.success('Análisis completado con Gemini IA');
      } else {
        toast.error('La respuesta de IA no tiene el formato esperado. Usando cálculo local.');
        // Fallback to local calculation
        const { parseJsonImport } = await import('@/lib/calculationEngine');
        const localParsed = parseJsonImport(trimmed);
        if (localParsed.length > 0) {
          onAnalyze(localParsed);
        }
      }
    } catch (err: any) {
      console.error('AI analysis error:', err);
      toast.error('Error al analizar con IA. Usando cálculo local.');
      // Fallback to local
      const { parseJsonImport } = await import('@/lib/calculationEngine');
      const localParsed = parseJsonImport(trimmed);
      if (localParsed.length > 0) {
        onAnalyze(localParsed);
      } else {
        onAnalyze(getDemoData());
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadDemo = () => {
    onAnalyze(getDemoData());
  };

  return (
    <section className="bg-card rounded-xl card-shadow p-6 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-5 h-5 text-secondary" />
        <h2 className="font-display font-semibold text-foreground text-lg">
          Fuentes de Datos
        </h2>
      </div>

      <div className="space-y-3">
        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <Link className="w-4 h-4 text-muted-foreground" />
            </div>
            <Input
              placeholder={`Link portal inmobiliario ${i + 1}`}
              value={link}
              onChange={(e) => handleLinkChange(i, e.target.value)}
              className="bg-muted/50 border-border"
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-secondary" />
          <label className="text-sm font-medium text-foreground">
            Importar Análisis Pro (Cerebro Gemini)
          </label>
        </div>
        <Textarea
          placeholder='Pegue datos JSON aquí. Formato: [{"price": 3500000, "pricePerM2": 25000, "area": 140, "colony": "Valle Real", "type": "new"}]'
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setJsonError(null);
          }}
          className={`min-h-[100px] bg-muted/50 border-border font-mono text-xs ${jsonError ? 'border-destructive' : ''}`}
        />
        {jsonError && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5" />
            {jsonError}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Si el campo está vacío se usarán datos demo internos (sin consumir créditos de IA).
        </p>

        {/* Guía de configuración colapsable */}
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80 transition-colors font-medium"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          ¿Cómo preparar mis datos de Inmuebles24?
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showGuide && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-xs text-muted-foreground animate-in slide-in-from-top-2">
            <p className="font-semibold text-foreground text-sm">🛠️ Configuración del Scraper</p>

            <div>
              <p className="font-medium text-foreground mb-1">1. Renombrar columnas en Excel:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li><span className="font-mono text-secondary">Precio</span> → <span className="font-mono font-semibold text-foreground">price</span></li>
                <li><span className="font-mono text-secondary">Metros de Construcción</span> → <span className="font-mono font-semibold text-foreground">area</span></li>
                <li><span className="font-mono text-secondary">Colonia</span> → <span className="font-mono font-semibold text-foreground">colony</span></li>
                <li><span className="font-mono text-secondary">Estado (Nuevo/Usado)</span> → <span className="font-mono font-semibold text-foreground">type</span></li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">2. Convertir a JSON:</p>
              <p>Usa una herramienta en línea como <span className="font-semibold">"Excel to JSON"</span> o pídele a Gemini que transforme tu lista al formato requerido.</p>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">3. Ejecutar:</p>
              <p>Pega el texto JSON en el campo de arriba y haz clic en <span className="font-semibold text-foreground">"Procesar Análisis Masivo"</span>.</p>
            </div>

            <div className="rounded bg-muted p-2 font-mono text-[10px] leading-relaxed overflow-x-auto">
              {'[{"price": 3500000, "area": 140, "colony": "Valle Real", "type": "nuevo"}]'}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleProcess}
          disabled={isProcessing}
          className="flex-1 h-12 text-base font-display font-semibold gradient-emerald text-primary-foreground border-0 hover:opacity-90 transition-opacity"
        >
          <Play className="w-5 h-5 mr-2" />
          {isProcessing ? 'Procesando con Gemini...' : 'Procesar Análisis Masivo'}
        </Button>
        <Button
          variant="outline"
          onClick={handleLoadDemo}
          disabled={isProcessing}
          className="h-12 border-border text-muted-foreground hover:text-foreground"
        >
          Demo
        </Button>
      </div>
    </section>
  );
};

export default InputPanel;
