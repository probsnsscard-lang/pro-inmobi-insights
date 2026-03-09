import { useState, useRef } from 'react';
import { Zap, FileJson, Play, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PropertyData, getDemoData, AnalysisResult, analyzeProperties } from '@/lib/calculationEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface InputPanelProps {
  onAnalyze: (data: PropertyData[]) => void;
  onAIResult?: (result: AnalysisResult) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

interface UploadedFileInfo {
  id: string;
  name: string;
  rowsDetected: number;
  rowsClean: number;
}

interface CleanProperty {
  price: number;
  area: number;
  colony: string;
}

// Column name mapping: multi-portal support (Inmuebles24, Vivanuncios, MercadoLibre, Lamudi) + generic Spanish
const COLUMN_MAP: Record<string, string> = {
  // --- PRICE ---
  precio: 'price',
  price: 'price',
  'precio total': 'price',
  'postingprices-module__price': 'price',
  'andes-money-amount__fraction': 'price',
  'snippet__content__price': 'price',

  // --- AREA ---
  metros: 'area',
  area: 'area',
  'metros de construcción': 'area',
  'metros de construccion': 'area',
  'm2': 'area',
  superficie: 'area',
  'postingmainfeatures-module__posting-main-features-span': 'area',
  'poly-attributes_list__item 3': 'area',
  'property__number': 'area',

  // --- COLONY ---
  colonia: 'colony',
  colony: 'colony',
  zona: 'colony',
  'postinglocations-module__location-text': 'colony',
  'poly-component__location': 'colony',
  'snippet__content__location': 'colony',

  // optional for manual JSON imports
  estado: 'type',
  type: 'type',
  tipo: 'type',
  condición: 'type',
  condicion: 'type',
};

const cleanNumber = (val: unknown): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const cleaned = String(val ?? '')
    .replace(/[^0-9.,]/g, '')
    .replace(/,/g, '');
  return Number(cleaned) || 0;
};

const mapRow = (row: Record<string, unknown>): CleanProperty | null => {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const normalized = key.trim().toLowerCase();
    const stdKey = COLUMN_MAP[normalized];
    if (stdKey) mapped[stdKey] = value;
  }

  const price = cleanNumber(mapped.price);
  if (!price) return null;

  const area = cleanNumber(mapped.area);
  const colony = String(mapped.colony || 'Sin colonia').trim() || 'Sin colonia';

  return { price, area, colony };
};

const toPropertyDataset = (rows: any[]): PropertyData[] => {
  return rows
    .map((item) => {
      const price = cleanNumber(item.price ?? item.precio);
      if (!price) return null;

      const area = cleanNumber(item.area ?? item.superficie ?? item.metros);
      const colony = String(item.colony ?? item.colonia ?? 'Sin colonia').trim() || 'Sin colonia';
      const typeRaw = String(item.type ?? item.tipo ?? 'used').toLowerCase();

      return {
        price,
        area,
        pricePerM2: area ? Math.round(price / area) : 0,
        colony,
        type: typeRaw.includes('nuev') || typeRaw === 'new' ? 'new' : 'used',
        source: 'excel',
      } as PropertyData;
    })
    .filter((row): row is PropertyData => Boolean(row));
};

const InputPanel = ({ onAnalyze, onAIResult, isProcessing, setIsProcessing }: InputPanelProps) => {
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
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
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const cleanedRows = rows.map(mapRow).filter(Boolean) as CleanProperty[];

        if (cleanedRows.length === 0) {
          toast.error('No se encontraron propiedades válidas. Verifica las columnas del Excel.');
          return;
        }

        setUploadedFiles((prev) => [
          {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            rowsDetected: rows.length,
            rowsClean: cleanedRows.length,
          },
          ...prev,
        ].slice(0, 5));

        // Fill Importar Análisis Pro with ALL cleaned rows before processing
        setJsonInput(JSON.stringify(cleanedRows, null, 2));
        setJsonError(null);
        toast.success(`${cleanedRows.length} filas limpias listas para análisis`);
      } catch {
        toast.error('Error al leer el archivo Excel.');
      }
    };

    reader.readAsArrayBuffer(file);
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

    const parsed = validateJson(trimmed);
    if (!parsed) return;

    const properties = toPropertyDataset(parsed);
    if (!properties.length) {
      setJsonError('No hay filas útiles después de la limpieza (price, area, colony).');
      return;
    }

    const localAnalysis = analyzeProperties(properties);
    const isBatchMode = properties.length > 100;

    setIsProcessing(true);
    try {
      const requestBody = isBatchMode
        ? {
            mode: 'summary',
            summary: {
              totalProperties: properties.length,
              newCount: localAnalysis.newProducts.length,
              usedCount: localAnalysis.usedProducts.length,
              newAvgPrice: localAnalysis.newAvgPrice,
              newAvgPricePerM2: localAnalysis.newAvgPricePerM2,
              usedAvgPrice: localAnalysis.usedAvgPrice,
              usedAvgPricePerM2: localAnalysis.usedAvgPricePerM2,
              colonyDistribution: localAnalysis.colonyDistribution.slice(0, 25),
            },
          }
        : {
            mode: 'full',
            properties,
          };

      const { data, error } = await supabase.functions.invoke('analyze-properties', {
        body: requestBody,
      });

      if (error) throw new Error(error.message || 'Error al invocar la función');
      if (data?.error) throw new Error(data.error);

      const aiInsights = Array.isArray(data?.insights) && data.insights.length
        ? data.insights
        : localAnalysis.insights;

      onAIResult?.({
        ...localAnalysis,
        insights: aiInsights,
        totalProperties: properties.length,
        newCount: localAnalysis.newProducts.length,
        usedCount: localAnalysis.usedProducts.length,
      });

      toast.success(
        isBatchMode
          ? `Análisis por lotes completado (${properties.length} propiedades)`
          : 'Análisis completado con Gemini IA'
      );
    } catch (err: any) {
      console.error('AI analysis error:', err);
      toast.error('Error con IA. Se usó análisis local completo.');
      onAIResult?.({
        ...localAnalysis,
        totalProperties: properties.length,
        newCount: localAnalysis.newProducts.length,
        usedCount: localAnalysis.usedProducts.length,
      });
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
          Columnas aceptadas: <span className="font-mono">precio · metros · colonia</span> (se limpian automáticamente)
        </p>

        {uploadedFiles.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground mb-2">Archivos cargados</p>
            <ul className="space-y-2">
              {uploadedFiles.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 text-foreground truncate">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-secondary" />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {file.rowsDetected} filas · {file.rowsClean} limpias
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
          placeholder='[{"price": 3500000, "area": 140, "colony": "Valle Real"}]'
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
          El cuadro se llena automáticamente con todos los datos limpios antes del análisis.
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
            <p className="font-semibold text-foreground text-sm">🛠️ Pre-procesamiento automático</p>
            <div>
              <p className="font-medium text-foreground mb-1">La app limpia cada fila y conserva solo:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li><span className="font-mono font-semibold text-foreground">price</span></li>
                <li><span className="font-mono font-semibold text-foreground">area</span></li>
                <li><span className="font-mono font-semibold text-foreground">colony</span></li>
              </ul>
            </div>
            <div>
              <p>Se eliminan enlaces, imágenes y descripciones para optimizar el procesamiento masivo.</p>
            </div>
            <div className="rounded bg-muted p-2 font-mono text-[10px] leading-relaxed overflow-x-auto">
              {'[{"price": 3500000, "area": 140, "colony": "Valle Real"}]'}
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
