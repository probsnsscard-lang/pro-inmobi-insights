export interface PropertyData {
  price: number;
  pricePerM2: number;
  area: number;
  colony: string;
  type: 'new' | 'used';
  source?: string;
}

export interface AnalysisResult {
  newProducts: PropertyData[];
  usedProducts: PropertyData[];
  newAvgPrice: number;
  newAvgPricePerM2: number;
  usedAvgPrice: number;
  usedAvgPricePerM2: number;
  newConstruction60: number;
  newTerrain40: number;
  usedConstruction60: number;
  usedTerrain40: number;
  colonyDistribution: { name: string; count: number; percentage: number }[];
  insights: string[];
  totalProperties: number;
  trimmedProperties: number;
}

function trimmedMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  if (trimmed.length === 0) return sorted[Math.floor(sorted.length / 2)];
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

export function analyzeProperties(properties: PropertyData[]): AnalysisResult {
  const newProducts = properties.filter(p => p.type === 'new');
  const usedProducts = properties.filter(p => p.type === 'used');

  const newAvgPrice = trimmedMean(newProducts.map(p => p.price));
  const newAvgPricePerM2 = trimmedMean(newProducts.map(p => p.pricePerM2));
  const usedAvgPrice = trimmedMean(usedProducts.map(p => p.price));
  const usedAvgPricePerM2 = trimmedMean(usedProducts.map(p => p.pricePerM2));

  // Colony distribution
  const colonyCounts: Record<string, number> = {};
  properties.forEach(p => {
    colonyCounts[p.colony] = (colonyCounts[p.colony] || 0) + 1;
  });
  const total = properties.length || 1;
  const colonyDistribution = Object.entries(colonyCounts)
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);

  // Insights
  const insights: string[] = [];
  if (newProducts.length > 0 && usedProducts.length > 0) {
    const priceDiff = ((newAvgPrice - usedAvgPrice) / usedAvgPrice * 100).toFixed(1);
    insights.push(`El producto nuevo tiene una prima del ${priceDiff}% sobre el usado.`);
  }
  if (colonyDistribution.length > 0) {
    insights.push(`La colonia con mayor oferta es "${colonyDistribution[0].name}" con ${colonyDistribution[0].percentage}% del mercado.`);
  }
  if (newAvgPricePerM2 > 0) {
    insights.push(`El precio promedio por m² de producto nuevo es $${newAvgPricePerM2.toLocaleString('es-MX', { maximumFractionDigits: 0 })}.`);
  }
  if (usedAvgPricePerM2 > 0) {
    insights.push(`El precio promedio por m² de producto usado es $${usedAvgPricePerM2.toLocaleString('es-MX', { maximumFractionDigits: 0 })}.`);
  }
  const trimmedCount = properties.length - (properties.length - Math.floor(properties.length * 0.1) * 2);
  insights.push(`Se analizaron ${properties.length} propiedades. Se aplicó la regla de recorte del 10% superior e inferior.`);

  return {
    newProducts,
    usedProducts,
    newAvgPrice,
    newAvgPricePerM2,
    usedAvgPrice,
    usedAvgPricePerM2,
    newConstruction60: newAvgPrice * 0.6,
    newTerrain40: newAvgPrice * 0.4,
    usedConstruction60: usedAvgPrice * 0.6,
    usedTerrain40: usedAvgPrice * 0.4,
    colonyDistribution,
    insights,
    totalProperties: properties.length,
    trimmedProperties: trimmedCount,
  };
}

export function parseJsonImport(jsonString: string): PropertyData[] {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        price: Number(item.price || item.precio || 0),
        pricePerM2: Number(item.pricePerM2 || item.precioPorM2 || 0),
        area: Number(item.area || item.superficie || 0),
        colony: String(item.colony || item.colonia || 'Sin colonia'),
        type: (item.type === 'new' || item.tipo === 'nuevo') ? 'new' : 'used',
        source: item.source || item.fuente || 'Importación JSON',
      }));
    }
    return [];
  } catch {
    return [];
  }
}

// Demo data for testing
export function getDemoData(): PropertyData[] {
  return [
    { price: 3500000, pricePerM2: 25000, area: 140, colony: 'Valle Real', type: 'new', source: 'Demo' },
    { price: 4200000, pricePerM2: 28000, area: 150, colony: 'Puerta de Hierro', type: 'new', source: 'Demo' },
    { price: 3800000, pricePerM2: 26500, area: 143, colony: 'Valle Real', type: 'new', source: 'Demo' },
    { price: 2900000, pricePerM2: 22000, area: 132, colony: 'Providencia', type: 'new', source: 'Demo' },
    { price: 5100000, pricePerM2: 32000, area: 160, colony: 'Puerta de Hierro', type: 'new', source: 'Demo' },
    { price: 3200000, pricePerM2: 24000, area: 133, colony: 'Colinas de San Javier', type: 'new', source: 'Demo' },
    { price: 2500000, pricePerM2: 18000, area: 139, colony: 'Valle Real', type: 'used', source: 'Demo' },
    { price: 2800000, pricePerM2: 20000, area: 140, colony: 'Providencia', type: 'used', source: 'Demo' },
    { price: 2200000, pricePerM2: 17000, area: 129, colony: 'Colinas de San Javier', type: 'used', source: 'Demo' },
    { price: 3100000, pricePerM2: 21500, area: 144, colony: 'Valle Real', type: 'used', source: 'Demo' },
    { price: 2600000, pricePerM2: 19000, area: 137, colony: 'Providencia', type: 'used', source: 'Demo' },
    { price: 1900000, pricePerM2: 15000, area: 127, colony: 'Colinas de San Javier', type: 'used', source: 'Demo' },
  ];
}
