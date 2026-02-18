import { useState } from 'react';
import { Link, Zap, FileJson, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { PropertyData, parseJsonImport, getDemoData } from '@/lib/calculationEngine';

interface InputPanelProps {
  onAnalyze: (data: PropertyData[]) => void;
  isProcessing: boolean;
}

const InputPanel = ({ onAnalyze, isProcessing }: InputPanelProps) => {
  const [links, setLinks] = useState(['', '', '']);
  const [jsonInput, setJsonInput] = useState('');

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleProcess = () => {
    // Try JSON import first
    if (jsonInput.trim()) {
      const parsed = parseJsonImport(jsonInput);
      if (parsed.length > 0) {
        onAnalyze(parsed);
        return;
      }
    }
    // Fallback to demo data
    onAnalyze(getDemoData());
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
          onChange={(e) => setJsonInput(e.target.value)}
          className="min-h-[100px] bg-muted/50 border-border font-mono text-xs"
        />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleProcess}
          disabled={isProcessing}
          className="flex-1 h-12 text-base font-display font-semibold gradient-emerald text-primary-foreground border-0 hover:opacity-90 transition-opacity"
        >
          <Play className="w-5 h-5 mr-2" />
          {isProcessing ? 'Procesando...' : 'Procesar Análisis Masivo'}
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
