import { useState, useRef } from 'react';
import { Zap, Play, Upload, FileSpreadsheet, X, HelpCircle, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PropertyData, SubjectProperty, getDemoData, AnalysisResult, analyzeProperties } from '@/lib/calculationEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface InputPanelProps {
  onAnalyze: (data: PropertyData[]) => void;
  onAIResult?: (result: AnalysisResult) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  subject?: SubjectProperty;
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

const NEW_KEYWORDS = ['nuevo', 'nueva', 'new', 'preventa', 'pre-venta', 'estrenar', 'desarrollo'];

const cleanNumber = (val: unknown): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  return Number(String(val ?? '').replace(/[^0-9.,]/g, '').replace(/,/g, '')) || 0;
};

const detectType = (val: unknown): 'new' | 'used' => {
  const str = String(val ?? '').toLowerCase().trim();
  return NEW_KEYWORDS.some(k => str.includes(k)) ? 'new' : 'used';
};

/* ── Smart column detection ─────────────────────────────────── */

// Known hints (lowercase) — used as bonus signal, NOT required
const PRICE_HINTS = ['precio', 'price', 'precio total', 'costo', 'valor', 'monto', 'amount'];
const AREA_HINTS = ['metro', 'area', 'superficie', 'm2', 'construcción', 'construccion', 'terreno', 'size', 'sqm'];
const COLONY_HINTS = ['colonia', 'colony', 'zona', 'ubicación', 'ubicacion', 'location', 'barrio', 'fraccionamiento', 'delegación', 'municipio'];
const TYPE_HINTS = ['tipo', 'type', 'estado', 'condición', 'condicion', 'status'];

interface DetectedColumns {
  priceCol: string | null;
  areaCol: string | null;
  colonyCol: string | null;
  typeCol: string | null;
}

function detectColumns(rows: Record<string, unknown>[]): DetectedColumns {
  if (rows.length === 0) return { priceCol: null, areaCol: null, colonyCol: null, typeCol: null };

  const sample = rows.slice(0, Math.min(rows.length, 100));
  const keys = Object.keys(rows[0]);

  // Score each column
  const colStats: Record<string, { median: number; numericCount: number; textCount: number; values: number[] }> = {};

  for (const key of keys) {
    const nums: number[] = [];
    let textCount = 0;
    for (const row of sample) {
      const v = cleanNumber(row[key]);
      if (v > 0) nums.push(v);
      const sv = String(row[key] ?? '').trim();
      if (sv.length > 0 && isNaN(Number(sv.replace(/[^0-9.-]/g, '')))) textCount++;
    }
    nums.sort((a, b) => a - b);
    const median = nums.length > 0 ? nums[Math.floor(nums.length / 2)] : 0;
    colStats[key] = { median, numericCount: nums.length, textCount, values: nums };
  }

  // ── Price: column with highest median AND values typically > 100,000
  let priceCol: string | null = null;
  let bestPriceScore = 0;
  for (const key of keys) {
    const s = colStats[key];
    if (s.numericCount < sample.length * 0.3) continue; // at least 30% numeric
    if (s.median < 50000) continue; // prices should be large numbers
    let score = s.median;
    // Bonus for name hints
    const kl = key.toLowerCase();
    if (PRICE_HINTS.some(h => kl.includes(h))) score *= 2;
    if (score > bestPriceScore) { bestPriceScore = score; priceCol = key; }
  }

  // ── Area: column with median roughly 30–1500 (construction m²)
  let areaCol: string | null = null;
  let bestAreaScore = 0;
  for (const key of keys) {
    if (key === priceCol) continue;
    const s = colStats[key];
    if (s.numericCount < sample.length * 0.2) continue;
    if (s.median < 15 || s.median > 5000) continue;
    // Prefer medians in 50-600 range
    let score = (s.median >= 50 && s.median <= 600) ? 100 : 10;
    score *= s.numericCount;
    const kl = key.toLowerCase();
    if (AREA_HINTS.some(h => kl.includes(h))) score *= 3;
    if (score > bestAreaScore) { bestAreaScore = score; areaCol = key; }
  }

  // ── Colony: text column with most unique string values
  let colonyCol: string | null = null;
  let bestColonyScore = 0;
  for (const key of keys) {
    if (key === priceCol || key === areaCol) continue;
    const s = colStats[key];
    if (s.textCount < sample.length * 0.3) continue;
    const uniqueTexts = new Set(sample.map(r => String(r[key] ?? '').trim().toLowerCase()).filter(Boolean));
    let score = uniqueTexts.size;
    const kl = key.toLowerCase();
    if (COLONY_HINTS.some(h => kl.includes(h))) score *= 5;
    if (score > bestColonyScore) { bestColonyScore = score; colonyCol = key; }
  }

  // ── Type: column with few unique text values (new/used)
  let typeCol: string | null = null;
  for (const key of keys) {
    if (key === priceCol || key === areaCol || key === colonyCol) continue;
    const kl = key.toLowerCase();
    if (TYPE_HINTS.some(h => kl.includes(h))) { typeCol = key; break; }
    const s = colStats[key];
    if (s.textCount > sample.length * 0.3) {
      const uniq = new Set(sample.map(r => String(r[key] ?? '').trim().toLowerCase()).filter(Boolean));
      if (uniq.size >= 2 && uniq.size <= 5) {
        const vals = [...uniq];
        if (vals.some(v => NEW_KEYWORDS.some(k => v.includes(k)))) { typeCol = key; break; }
      }
    }
  }

  return { priceCol, areaCol, colonyCol, typeCol };
}

const RENTAL_KEYWORDS = ['renta', 'arrendamiento', 'local', 'alquiler', 'rento', 'se renta'];

function rowContainsRental(row: Record<string, unknown>): boolean {
  const allText = Object.values(row).map(v => String(v ?? '').toLowerCase()).join(' ');
  return RENTAL_KEYWORDS.some(k => allText.includes(k));
}

function mapRows(rows: Record<string, unknown>[]): CleanProperty[] {
  const cols = detectColumns(rows);
  if (!cols.priceCol) {
    console.warn('Auto-detect: no price column found, using best-effort fallback');
    return [];
  }

  const results: CleanProperty[] = [];
  for (const row of rows) {
    // Filtro inteligente: ignorar rentas/locales por palabras clave
    if (rowContainsRental(row)) continue;
    const price = cleanNumber(row[cols.priceCol]);
    if (!price) continue;
    const area = cols.areaCol ? cleanNumber(row[cols.areaCol]) : 0;
    const colony = cols.colonyCol ? String(row[cols.colonyCol] ?? 'Sin colonia').trim() || 'Sin colonia' : 'Sin colonia';
    const type = cols.typeCol ? detectType(row[cols.typeCol]) : 'used';
    results.push({ price, area, colony, type });
  }
  return results;
}

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
  const [files, setFiles] = useState<FileSlot[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          const cleaned = mapRows(rawRows);

          if (cleaned.length === 0) {
            toast.warning(`No se detectaron columnas de precio en "${file.name}". Verifica que el archivo tenga datos numéricos.`);
            return;
          }

          setFiles((prev) => [...prev, { file, name: file.name, rows: cleaned, totalRows: rawRows.length }]);
          toast.success(`${cleaned.length} propiedades detectadas en "${file.name}"`);
        } catch {
          toast.error(`Error al leer "${file.name}".`);
        }
      };
      reader.readAsArrayBuffer(file);
    });
    e.target.value = '';
  };

  const clearFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const totalClean = files.reduce((sum, s) => sum + s.rows.length, 0);

  const handleProcess = async () => {
    const allClean = files.flatMap((s) => s.rows);

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


  return (
    <section className="bg-card rounded-xl card-shadow p-6 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-5 h-5 text-secondary" />
        <h2 className="font-display font-semibold text-foreground text-lg">Fuentes de Datos</h2>
      </div>

      {/* Single upload button */}
      <div className="flex flex-col items-center gap-4">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => fileRef.current?.click()}
          className="w-full max-w-md h-14 border-2 border-dashed border-secondary/40 text-secondary hover:border-secondary hover:bg-secondary/5 font-display font-semibold text-base"
        >
          <Upload className="w-5 h-5 mr-2" />
          Subir Archivos Excel
        </Button>

        {/* File list */}
        {files.length > 0 && (
          <div className="w-full space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/5 border border-secondary/20">
                <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                <FileSpreadsheet className="w-4 h-4 text-secondary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{f.name}</span>
                <span className="text-xs font-semibold text-secondary ml-auto whitespace-nowrap">
                  {f.rows.length} propiedades
                </span>
                <button
                  type="button"
                  onClick={() => clearFile(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/10 border border-secondary/20">
              <FileSpreadsheet className="w-4 h-4 text-secondary" />
              <span className="text-sm font-display font-semibold text-foreground">
                Total: {totalClean} propiedades listas
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {files.length} archivo{files.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

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
