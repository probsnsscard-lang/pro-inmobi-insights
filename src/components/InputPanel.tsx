import { useState, useRef } from 'react';
import { Zap, Play, Upload, FileSpreadsheet, X, HelpCircle, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface FileSlot {
  file: File | null;
  name: string;
  rows: CleanProperty[];
  totalRows: number;
}

interface CleanProperty {
  price: number;
  area: number;
  colony: string;
  type: 'new' | 'used';
}

const COLUMN_MAP: Record<string, string> = {
  precio: 'price', price: 'price', 'precio total': 'price',
  'postingprices-module__price': 'price',
  'andes-money-amount__fraction': 'price',
  'snippet__content__price': 'price',
  metros: 'area', area: 'area', 'metros de construcción': 'area',
  'metros de construccion': 'area', m2: 'area', superficie: 'area',
  'postingmainfeatures-module__posting-main-features-span': 'area',
  'poly-attributes_list__item 3': 'area',
  'property__number': 'area',
  colonia: 'colony', colony: 'colony', zona: 'colony',
  'postinglocations-module__location-text': 'colony',
  'poly-component__location': 'colony',
  'snippet__content__location': 'colony',
  estado: 'type', type: 'type', tipo: 'type',
  condición: 'type', condicion: 'type',
};

const NEW_KEYWORDS = ['nuevo', 'nueva', 'new', 'preventa', 'pre-venta', 'estrenar', 'desarrollo'];

const cleanNumber = (val: unknown): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  return Number(String(val ?? '').replace(/[^0-9.,]/g, '').replace(/,/g, '')) || 0;
};

const detectType = (val: unknown): 'new' | 'used' => {
  const str = String(val ?? '').toLowerCase().trim();
  return NEW_KEYWORDS.some(k => str.includes(k)) ? 'new' : 'used';
};

const mapRow = (row: Record<string, unknown>): CleanProperty | null => {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const stdKey = COLUMN_MAP[key.trim().toLowerCase()];
    if (stdKey) mapped[stdKey] = value;
  }
  const price = cleanNumber(mapped.price);
  if (!price) return null;
  return {
    price,
    area: cleanNumber(mapped.area),
    colony: String(mapped.colony || 'Sin colonia').trim() || 'Sin colonia',
    type: mapped.type ? detectType(mapped.type) : 'used',
  };
};

const toPropertyDataset = (rows: CleanProperty[]): PropertyData[] =>
  rows.map((r) => ({
    price: r.price,
    area: r.area,
    pricePerM2: r.area ? Math.round(r.price / r.area) : 0,
    colony: r.colony,
    type: r.type,
    source: 'Análisis de Mercado Pro',
  }));

const EMPTY_SLOT: FileSlot = { file: null, name: '', rows: [], totalRows: 0 };

const InputPanel = ({ onAnalyze, onAIResult, isProcessing, setIsProcessing }: InputPanelProps) => {
  const [slots, setSlots] = useState<[FileSlot, FileSlot, FileSlot]>([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);
  const [showGuide, setShowGuide] = useState(false);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleFileUpload = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const cleaned = rawRows.map(mapRow).filter(Boolean) as CleanProperty[];

        if (cleaned.length === 0) {
          toast.error(`No se encontraron propiedades válidas en "${file.name}".`);
          return;
        }

        setSlots((prev) => {
          const next = [...prev] as [FileSlot, FileSlot, FileSlot];
          next[index] = { file, name: file.name, rows: cleaned, totalRows: rawRows.length };
          return next;
        });

        toast.success(`${cleaned.length} propiedades detectadas en "${file.name}"`);
      } catch {
        toast.error('Error al leer el archivo.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const clearSlot = (index: number) => {
    setSlots((prev) => {
      const next = [...prev] as [FileSlot, FileSlot, FileSlot];
      next[index] = { ...EMPTY_SLOT };
      return next;
    });
  };

  const totalClean = slots.reduce((sum, s) => sum + s.rows.length, 0);

  const handleProcess = async () => {
    const allClean = slots.flatMap((s) => s.rows);

    if (allClean.length === 0) {
      onAnalyze(getDemoData());
      return;
    }

    const properties = toPropertyDataset(allClean);
    const localAnalysis = analyzeProperties(properties);

    setIsProcessing(true);
    try {
      const requestBody = {
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
      };

      const { data, error } = await supabase.functions.invoke('analyze-properties', { body: requestBody });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const aiInsights = Array.isArray(data?.insights) && data.insights.length ? data.insights : localAnalysis.insights;

      onAIResult?.({
        ...localAnalysis,
        insights: aiInsights,
        totalProperties: properties.length,
        newCount: localAnalysis.newProducts.length,
        usedCount: localAnalysis.usedProducts.length,
      });

      toast.success(`Análisis completado (${properties.length} propiedades)`);
    } catch (err: any) {
      console.error('AI analysis error:', err);
      toast.error('Error con IA. Se usó análisis local.');
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

  const labels = ['Fuente 1', 'Fuente 2', 'Fuente 3'];

  return (
    <section className="bg-card rounded-xl card-shadow p-6 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-5 h-5 text-secondary" />
        <h2 className="font-display font-semibold text-foreground text-lg">Fuentes de Datos</h2>
      </div>

      {/* 3 file slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot, i) => (
          <div key={i} className={`rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-3 min-h-[160px] transition-colors ${
            slot.file
              ? 'border-secondary bg-secondary/5'
              : 'border-dashed border-border bg-muted/20 hover:border-secondary/50'
          }`}>
            <input
              ref={fileRefs[i]}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload(i)}
            />

            <span className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">
              {labels[i]}
            </span>

            {slot.file ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <CheckCircle2 className="w-8 h-8 text-secondary" />
                <div className="flex items-center gap-2 text-foreground">
                  <FileSpreadsheet className="w-4 h-4 text-secondary shrink-0" />
                  <span className="text-sm font-medium truncate max-w-[140px]">{slot.name}</span>
                </div>
                <span className="text-xs font-semibold text-secondary">
                  ✅ {slot.rows.length} propiedades detectadas
                </span>
                <button
                  type="button"
                  onClick={() => clearSlot(i)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors mt-1"
                >
                  <X className="w-3 h-3" /> Quitar
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRefs[i].current?.click()}
                className="border-secondary/40 text-secondary hover:border-secondary hover:bg-secondary/5 font-display font-semibold"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Subir Excel
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Total badge */}
      {totalClean > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/10 border border-secondary/20">
          <FileSpreadsheet className="w-4 h-4 text-secondary" />
          <span className="text-sm font-display font-semibold text-foreground">
            Total: {totalClean} propiedades listas
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {slots.filter((s) => s.file).length} de 3 archivos
          </span>
        </div>
      )}

      {/* Guide */}
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
          <p>Sube archivos Excel de tus fuentes de datos inmobiliarios. La app detecta las columnas automáticamente y conserva solo: <span className="font-mono font-semibold text-foreground">price</span>, <span className="font-mono font-semibold text-foreground">area</span>, <span className="font-mono font-semibold text-foreground">colony</span>.</p>
          <p>Se eliminan enlaces, imágenes y descripciones para optimizar el análisis masivo.</p>
        </div>
      )}

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
          onClick={() => onAnalyze(getDemoData())}
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
