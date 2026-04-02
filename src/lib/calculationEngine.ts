export interface PropertyData {
  price: number;
  pricePerM2: number;
  area: number;
  colony: string;
  type: 'new' | 'used';
  source?: string;
}

export interface SubjectProperty {
  constructionM2: number;
  terrainM2: number;
  productType: 'Casa Habitación' | 'Departamento' | 'Terreno' | 'Comercial';
  age?: number;
  colony?: string;
}

export interface ValuationResult {
  sampleSize: number;
  totalBeforeFilter: number;
  outliersRemoved: number;
  avgPricePerM2Construction: number;
  avgPricePerM2Terrain: number;
  avgTotalPrice: number;
  avgConstructionM2: number;
  avgTerrainM2: number;
  constructionCostPerM2: number;
  estimatedConstructionValue: number;
  estimatedTerrainValue: number;
  finalValue: number;
  sampleProperties: PropertyData[];
  methodology: string;
  // Función A result
  marketHeartPricePerM2: number;
  trimmedSampleSize: number;
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
  newCount?: number;
  usedCount?: number;
  municipality?: string;
  purityFilter?: number;
  valuation?: ValuationResult;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

/**
 * Función A: Media Truncada 10/10
 * Ordena $/m², elimina 10% más caro y 10% más barato, promedia el 80% restante.
 */
function trimmedMean1010(values: number[]): { mean: number; sampleSize: number } {
  if (values.length === 0) return { mean: 0, sampleSize: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  if (trimmed.length === 0) return { mean: sorted[Math.floor(sorted.length / 2)], sampleSize: 1 };
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  return { mean, sampleSize: trimmed.length };
}

function trimmedMean(values: number[]): number {
  return trimmedMean1010(values).mean;
}

function removeOutliersIQR(values: number[]): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return values.filter(v => v >= lower && v <= upper);
}

function smartFilter(
  properties: PropertyData[],
  subject: SubjectProperty,
  targetCount: number = 20
): { filtered: PropertyData[]; outliersRemoved: number } {
  const withArea = properties.filter(p => p.area > 0);
  const isTerrain = subject.productType === 'Terreno';
  const referenceArea = isTerrain ? subject.terrainM2 : subject.constructionM2;

  const sorted = [...withArea].sort((a, b) => {
    const diffA = Math.abs(a.area - referenceArea);
    const diffB = Math.abs(b.area - referenceArea);
    return diffA - diffB;
  });

  const candidates = sorted.slice(0, Math.max(targetCount + 5, 25));
  const prices = candidates.map(p => p.price);
  const cleanPrices = removeOutliersIQR(prices);
  const cleanSet = new Set(cleanPrices);

  const filtered: PropertyData[] = [];
  const priceUsed = new Map<number, number>();

  for (const p of candidates) {
    if (filtered.length >= targetCount) break;
    const used = priceUsed.get(p.price) || 0;
    const available = cleanPrices.filter(cp => cp === p.price).length;
    if (used < available) {
      filtered.push(p);
      priceUsed.set(p.price, used + 1);
    }
  }

  if (filtered.length < 10 && candidates.length >= 10) {
    return { filtered: candidates.slice(0, targetCount), outliersRemoved: 0 };
  }

  return {
    filtered,
    outliersRemoved: candidates.length - filtered.length,
  };
}

function getConstructionCostPerM2(properties: PropertyData[]): number {
  const usedCount = properties.filter(p => p.type === 'used').length;
  const newCount = properties.filter(p => p.type === 'new').length;
  return usedCount >= newCount ? 17500 : 21000;
}

export function computeValuation(
  properties: PropertyData[],
  subject: SubjectProperty
): ValuationResult {
  const totalBefore = properties.length;
  const isTerrain = subject.productType === 'Terreno';

  // ── Función A: Media Truncada 10/10 sobre $/m² ──
  const allPricesPerM2 = properties.filter(p => p.area > 0).map(p => p.price / p.area);
  const { mean: marketHeartPricePerM2, sampleSize: trimmedSampleSize } = trimmedMean1010(allPricesPerM2);

  // Smart filter for comparable selection
  const { filtered, outliersRemoved } = smartFilter(properties, subject);

  const constructionCost = getConstructionCostPerM2(filtered);

  const avgConstructionM2 = filtered.length > 0
    ? filtered.reduce((s, p) => s + p.area, 0) / filtered.length
    : 0;

  const pricesPerM2 = filtered.filter(p => p.area > 0).map(p => p.price / p.area);
  const avgPricePerM2Construction = pricesPerM2.length > 0
    ? pricesPerM2.reduce((s, v) => s + v, 0) / pricesPerM2.length
    : 0;

  const avgTotalPrice = filtered.length > 0
    ? filtered.reduce((s, p) => s + p.price, 0) / filtered.length
    : 0;

  let estimatedConstructionValue = 0;
  let estimatedTerrainValue = 0;
  let finalValue = 0;

  if (isTerrain) {
    // ── Función B para TERRENO: $/m² del mercado × m² de terreno ──
    estimatedConstructionValue = 0;
    estimatedTerrainValue = Math.round(marketHeartPricePerM2 * subject.terrainM2);
    finalValue = estimatedTerrainValue;
  } else {
    // ── Función B para CASA/DEPTO: lógica de construcción + terreno ──
    estimatedConstructionValue = subject.constructionM2 * constructionCost;
    const avgConstructionValue = avgConstructionM2 * constructionCost;
    const avgTerrainValue = Math.max(avgTotalPrice - avgConstructionValue, 0);
    const avgTerrainM2FromSample = avgConstructionM2 > 0 ? avgConstructionM2 * 0.8 : subject.terrainM2;
    const terrainPricePerM2 = avgTerrainM2FromSample > 0 ? avgTerrainValue / avgTerrainM2FromSample : 0;
    estimatedTerrainValue = Math.round(subject.terrainM2 * terrainPricePerM2);
    finalValue = Math.round(estimatedConstructionValue + estimatedTerrainValue);
  }

  const referenceLabel = isTerrain ? 'terreno' : 'construcción';
  const referenceM2 = isTerrain ? subject.terrainM2 : subject.constructionM2;
  const methodology = isTerrain
    ? `Se analizaron ${totalBefore} propiedades. Mediante la Media Truncada 10/10, se eliminó el 10% superior e inferior del $/m², obteniendo el "Corazón del Mercado" con ${trimmedSampleSize} comparables. El precio promedio de mercado es ${fmt(Math.round(marketHeartPricePerM2))}/m². El estimado se calcula como: ${fmt(Math.round(marketHeartPricePerM2))}/m² × ${subject.terrainM2} m² = ${fmt(finalValue)}.`
    : `Se seleccionaron las ${filtered.length} propiedades más similares en tamaño (m² de ${referenceLabel}) al sujeto de ${referenceM2} m². Se eliminaron ${outliersRemoved} valores atípicos mediante el método IQR. El costo de construcción aplicado es de ${fmt(constructionCost)}/m² basado en el perfil predominante del mercado. Media Truncada 10/10: ${fmt(Math.round(marketHeartPricePerM2))}/m² (${trimmedSampleSize} comparables).`;

  return {
    sampleSize: filtered.length,
    totalBeforeFilter: totalBefore,
    outliersRemoved,
    avgPricePerM2Construction: Math.round(avgPricePerM2Construction),
    avgPricePerM2Terrain: Math.round(isTerrain ? marketHeartPricePerM2 : (estimatedTerrainValue / (subject.terrainM2 || 1))),
    avgTotalPrice: Math.round(avgTotalPrice),
    avgConstructionM2: Math.round(avgConstructionM2),
    avgTerrainM2: Math.round(isTerrain ? subject.terrainM2 : (avgConstructionM2 * 0.8)),
    constructionCostPerM2: isTerrain ? 0 : constructionCost,
    estimatedConstructionValue: Math.round(estimatedConstructionValue),
    estimatedTerrainValue: Math.round(estimatedTerrainValue),
    finalValue,
    sampleProperties: filtered,
    methodology,
    marketHeartPricePerM2: Math.round(marketHeartPricePerM2),
    trimmedSampleSize,
  };
}

export function analyzeProperties(properties: PropertyData[], subject?: SubjectProperty): AnalysisResult {
  const newProducts = properties.filter(p => p.type === 'new');
  const usedProducts = properties.filter(p => p.type === 'used');

  const newAvgPrice = trimmedMean(newProducts.map(p => p.price));
  const newPricePerM2Values = newProducts.filter(p => p.area > 0).map(p => p.price / p.area);
  const newAvgPricePerM2 = trimmedMean(newPricePerM2Values);

  const usedAvgPrice = trimmedMean(usedProducts.map(p => p.price));
  const usedPricePerM2Values = usedProducts.filter(p => p.area > 0).map(p => p.price / p.area);
  const usedAvgPricePerM2 = trimmedMean(usedPricePerM2Values);

  const colonyCounts: Record<string, number> = {};
  properties.forEach(p => {
    colonyCounts[p.colony] = (colonyCounts[p.colony] || 0) + 1;
  });

  const total = properties.length || 1;
  const colonyDistribution = Object.entries(colonyCounts)
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);

  const municipality = colonyDistribution.length > 0 ? colonyDistribution[0].name : 'No determinado';

  const insights: string[] = [];
  if (newProducts.length > 0 && usedProducts.length > 0 && usedAvgPrice > 0) {
    const priceDiff = ((newAvgPrice - usedAvgPrice) / usedAvgPrice * 100).toFixed(1);
    insights.push(`El producto nuevo tiene una prima del ${priceDiff}% sobre el usado.`);
  }
  if (colonyDistribution.length > 0) {
    insights.push(`La colonia con mayor oferta es "${colonyDistribution[0].name}" con ${colonyDistribution[0].percentage}% del mercado.`);
  }
  if (newAvgPricePerM2 > 0) {
    insights.push(`El precio promedio por m² de producto nuevo es ${fmt(newAvgPricePerM2)}.`);
  }
  if (usedAvgPricePerM2 > 0) {
    insights.push(`El precio promedio por m² de producto usado es ${fmt(usedAvgPricePerM2)}.`);
  }

  const trimCount = Math.floor(properties.length * 0.1);
  const trimmedCount = Math.max(properties.length - trimCount * 2, 0);
  const validCount = properties.filter(p => p.price > 0 && p.area > 0).length;
  const purityFilter = Math.round((validCount / total) * 100);

  insights.push(`Se analizaron ${properties.length} propiedades. Se aplicó la Media Truncada 10/10 (se eliminó el 10% superior e inferior).`);

  // Compute valuation if subject is provided
  let valuation: ValuationResult | undefined;
  const isTerrain = subject?.productType === 'Terreno';
  if (subject && (isTerrain ? subject.terrainM2 > 0 : subject.constructionM2 > 0)) {
    valuation = computeValuation(properties, subject);
    insights.unshift(`Opinión de Valor Final: ${fmt(valuation.finalValue)} — Corazón del Mercado: ${fmt(valuation.marketHeartPricePerM2)}/m² (${valuation.trimmedSampleSize} comparables).`);
  }

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
    newCount: newProducts.length,
    usedCount: usedProducts.length,
    municipality,
    purityFilter,
    valuation,
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
