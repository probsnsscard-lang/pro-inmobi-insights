import { useState, useRef } from 'react';
import { Zap, FileJson, Play, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PropertyData, getDemoData, AnalysisResult } from '@/lib/calculationEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface InputPanelProps {
  onAnalyze: (data: PropertyData[]) => void;
  onAIResult?: (result: AnalysisResult) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

// Column name mapping: common Spanish variants → standard keys
const COLUMN_MAP: Record<string, string> = {
  precio: 'price',
  price: 'price',
  'precio total': 'price',
  metros: 'area',
  area: 'area',
  'metros de construcción': 'area',
  'metros de construccion': 'area',
  'm2': 'area',
  superficie: 'area',
  colonia: 'colony',
  colony: 'colony',
  zona: 'colony',
  estado: 'type',
  type: 'type',
  tipo: 'type',
  condición: 'type',
  condicion: 'type',
};

const mapRow = (row: Record<string, any>): PropertyData | null => {
  const mapped: any = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.trim().toLowerCase();
    const stdKey = COLUMN_MAP[normalized];
    if (stdKey) mapped[stdKey] = value;
  }
  if (!mapped.price) return null;
  return {
    price: Number(mapped.price) || 0,
    pricePerM2: mapped.area ? Math.round(Number(mapped.price) / Number(mapped.area)) : 0,
    area: Number(mapped.area) || 0,
    colony: String(mapped.colony || 'Sin colonia'),
    type: String(mapped.type || 'usado').toLowerCase().includes('nuev') ? 'new' : 'used',
    source: 'excel',
  };
};

const InputPanel = ({ onAnalyze, onAIResult, isProcessing, setIsProcessing }: InputPanelProps) => {
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

        const properties = rows.map(mapRow).filter(Boolean) as PropertyData[];
        if (properties.length === 0) {
          toast.error('No se encontraron propiedades válidas. Verifica las columnas del Excel.');
          return;
        }

        const jsonStr = JSON.stringify(properties, null, 2);
        setJsonInput(jsonStr);
        setJsonError(null);
        toast.success(`${properties.length} propiedades importadas del Excel`);
      } catch {
        toast.error('Error al leer el archivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const validateJson = (input: string): any[] | null => {
    if (!input.trim()) return null;
    try {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setJsonError('El JSON debe ser un array con al menos una propiedad.');
        return null;
      }
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

    if (!trimmed) {
      onAnalyze(getDemoData());
      return;
    }

    const properties = validateJson(trimmed);
    if (!properties) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-properties', {
        body: { properties },
      });

      if (error) throw new Error(error.message || 'Error al invocar la función');

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data && data.newAvgPrice !== undefined && data.colonyDistribution) {
        onAIResult?.(data as AnalysisResult);
        toast.success('Análisis completado con Gemini IA');
      } else {
        toast.error('Respuesta IA inesperada. Usando cálculo local.');
        const { parseJsonImport } = await import('@/lib/calculationEngine');
        const localParsed = parseJsonImport(trimmed);
        if (localParsed.length > 0) onAnalyze(localParsed);
      }
    } catch (err: any) {
      console.error('AI analysis error:', err);
      toast.error('Error al analizar con IA. Usando cálculo local.');
      const { parseJsonImport } = await import('@/lib/calculationEngine');
      const localParsed = parseJsonImport(trimmed);
      if (localParsed.length > 0) onAnalyze(localParsed);
      else onAnalyze(getDemoData());
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadDemo = () => {
    onAnalyze(getDemoData());
  };

  return (
    <section className="bg-card rounded-xl card-shadow p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-5 h-5 text-secondary" />
        <h2 className="font-display font-semibold text-foreground text-lg">
          Fuentes de Datos
        </h2>
      </div>

      {/* Excel upload */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleExcelUpload}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          className="w-full h-14 text-base font-display font-semibold border-2 border-dashed border-secondary/40 hover:border-secondary hover:bg-secondary/5 text-secondary transition-all"
        >
          <Upload className="w-5 h-5 mr-2" />
          📂 Subir Listado Excel (.xlsx)
        </Button>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Columnas aceptadas: <span className="font-mono">precio · metros · colonia · estado</span> (se mapean automáticamente)
        </p>
      </div>

      {/* JSON textarea */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-secondary" />
          <label className="text-sm font-medium text-foreground">
            Importar Análisis Pro (Cerebro Gemini)
          </label>
        </div>
        <Textarea
          placeholder='[{"price": 3500000, "area": 140, "colony": "Valle Real", "type": "nuevo"}]'
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setJsonError(null);
          }}
          className={`min-h-[90px] bg-muted/50 border-border font-mono text-xs ${jsonError ? 'border-destructive' : ''}`}
        />
        {jsonError && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5" />
            {jsonError}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Si el campo está vacío se usarán datos demo (sin consumir créditos de IA).
        </p>

        {/* Collapsible guide */}
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80 transition-colors font-medium"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          ¿Cómo preparar mis datos?
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
              <p className="font-medium text-foreground mb-1">2. O sube directamente:</p>
              <p>El botón de Excel mapea automáticamente columnas en español. No necesitas renombrar si usas nombres comunes.</p>
            </div>
            <div className="rounded bg-muted p-2 font-mono text-[10px] leading-relaxed overflow-x-auto">
              {'[{"price": 3500000, "area": 140, "colony": "Valle Real", "type": "nuevo"}]'}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
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
