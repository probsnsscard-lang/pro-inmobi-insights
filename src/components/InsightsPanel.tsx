import { Lightbulb } from 'lucide-react';

interface InsightsPanelProps {
  insights: string[];
}

const InsightsPanel = ({ insights }: InsightsPanelProps) => {
  if (insights.length === 0) return null;

  return (
    <div className="bg-card rounded-xl card-shadow p-5">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-gold" />
        <h3 className="font-display font-semibold text-foreground">
          Brillantes Análisis
        </h3>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InsightsPanel;
