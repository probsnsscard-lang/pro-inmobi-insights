import jsPDF from 'jspdf';
import { AnalysisResult, SubjectProperty } from './calculationEngine';

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

interface SubjectDetails {
  location?: string;
  type?: string;
  rooms?: string;
  parking?: string;
  extras?: string;
}

export function generatePDF(
  result: AnalysisResult,
  estimatedTotal?: number,
  constructionPct: number = 60,
  clientName: string = '',
  analystName: string = '',
  subject?: SubjectProperty,
  subjectDetails?: SubjectDetails,
  municipalityLabel?: string
) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const W = 216;
  const H = 279;
  const marginL = 14;
  const marginR = 14;
  const contentW = W - marginL - marginR;
  let y = 0;

  const navy: [number, number, number] = [44, 62, 80];
  const navyDark: [number, number, number] = [30, 45, 60];
  const grayBg: [number, number, number] = [245, 247, 250];
  const grayBorder: [number, number, number] = [220, 225, 230];
  const textDark: [number, number, number] = [40, 40, 40];
  const textMuted: [number, number, number] = [100, 105, 110];
  const white: [number, number, number] = [255, 255, 255];

  const nc = result.newCount ?? result.newProducts.length;
  const uc = result.usedCount ?? result.usedProducts.length;
  const terrainPct = 100 - constructionPct;
  const displayAnalyst = analystName.trim() || 'Ataúlfo Figón';
  const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const muni = municipalityLabel || result.municipality || 'Zona Analizada';

  const totalVal = estimatedTotal ?? (() => {
    const t = nc + uc;
    if (t === 0) return 0;
    return Math.round((result.newAvgPrice * nc + result.usedAvgPrice * uc) / t);
  })();

  // Helper: draw a table row
  const drawTableRow = (cols: { text: string; width: number; bold?: boolean; align?: string }[], yPos: number, bgColor?: [number, number, number], textColor?: [number, number, number], fontSize: number = 8) => {
    if (bgColor) {
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.rect(marginL, yPos, contentW, 7, 'F');
    }
    doc.setFontSize(fontSize);
    doc.setTextColor(...(textColor || textDark));
    let x = marginL + 2;
    cols.forEach(col => {
      doc.setFont('helvetica', col.bold ? 'bold' : 'normal');
      doc.text(col.text, x, yPos + 5);
      x += col.width;
    });
    return yPos + 7;
  };

  // ======== PAGE 1 ========

  // Header: Navy banner
  doc.setFillColor(...navyDark);
  doc.rect(0, 0, W, 32, 'F');

  doc.setFontSize(20);
  doc.setTextColor(...white);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTIMADO DE VALOR DE MERCADO', W / 2, 14, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${subjectDetails?.type || 'Casa Habitación'} • ${muni}, Estado de México • ${dateStr}`, W / 2, 24, { align: 'center' });

  y = 40;

  // ── Block 1: Características de la Propiedad ──
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyDark);
  doc.text('■ Características de la Propiedad', marginL, y);
  y += 7;

  // Property characteristics table
  const propRows: [string, string][] = [
    ['Ubicación', subjectDetails?.location || muni + ', Estado de México'],
    ['Tipo', subjectDetails?.type || 'Casa Habitación'],
    ['Recámaras / Baños', subjectDetails?.rooms || '—'],
    ['Estacionamiento', subjectDetails?.parking || '—'],
    ['Extras', subjectDetails?.extras || '—'],
    ['Superficie de terreno', `${subject?.terrainM2 || 0} m²`],
    ['Superficie de construcción', `${subject?.constructionM2 || 0} m²`],
  ];

  // Header
  doc.setFillColor(...navy);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('Característica', marginL + 2, y + 5);
  doc.text('Detalle', marginL + contentW * 0.3 + 2, y + 5);
  y += 7;

  propRows.forEach((row, i) => {
    const bg = i % 2 === 0 ? grayBg : white;
    doc.setFillColor(...bg);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text(row[0], marginL + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    const valueLines = doc.splitTextToSize(row[1], contentW * 0.68);
    doc.text(valueLines[0] || '', marginL + contentW * 0.3 + 2, y + 5);
    y += 7;
  });

  // Border
  doc.setDrawColor(...grayBorder);
  doc.setLineWidth(0.3);
  doc.rect(marginL, y - propRows.length * 7 - 7, contentW, (propRows.length + 1) * 7);

  y += 8;

  // ── Block 2: Metodología de Valuación ──
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyDark);
  doc.text('■ Metodología de Valuación', marginL, y);
  y += 6;

  const v = result.valuation;
  const methodText = v?.methodology || `Se consultaron múltiples fuentes inmobiliarias, filtrando exclusivamente casas habitación en la zona de ${muni}. Se eliminaron registros duplicados y propiedades de uso no habitacional. La muestra final consta de ${result.totalProperties} comparables.`;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  const methLines = doc.splitTextToSize(methodText, contentW - 4);
  doc.text(methLines, marginL, y);
  y += methLines.length * 3.8 + 4;

  // ── Block 2b: Estadísticas del Mercado Comparable ──
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyDark);
  doc.text('■ Estadísticas del Mercado Comparable', marginL, y);
  y += 7;

  const combinedPricePerM2 = (nc + uc) > 0
    ? Math.round((result.newAvgPricePerM2 * nc + result.usedAvgPricePerM2 * uc) / (nc + uc))
    : 0;

  const statsRows: [string, string][] = [
    ['Propiedades consultadas (brutas)', `${result.totalProperties}`],
    ['Comparables únicos (deduplicados)', `${v?.sampleSize ?? result.totalProperties}`],
    ['Precio promedio de mercado', `${fmt(v?.avgTotalPrice ?? totalVal)} MXN`],
    ['Superficie promedio de construcción', `${v?.avgConstructionM2 ?? '—'} m²`],
    ['Precio promedio por m² (construcción)', `${fmt(v?.avgPricePerM2Construction ?? combinedPricePerM2)} MXN/m²`],
  ];

  // Stats table header
  doc.setFillColor(...navy);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('Indicador', marginL + 2, y + 5);
  doc.text('Valor', marginL + contentW * 0.7 + 2, y + 5);
  y += 7;

  statsRows.forEach((row, i) => {
    const bg = i % 2 === 0 ? grayBg : white;
    doc.setFillColor(...bg);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    doc.text(row[0], marginL + 2, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], marginL + contentW * 0.7 + 2, y + 5);
    y += 7;
  });

  doc.setDrawColor(...grayBorder);
  doc.rect(marginL, y - statsRows.length * 7 - 7, contentW, (statsRows.length + 1) * 7);
  y += 8;

  // ── Block 3: Estimado de Valor ──
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyDark);
  doc.text('■ Estimado de Valor', marginL, y);
  y += 6;

  // Big value banner
  doc.setFillColor(...navyDark);
  doc.roundedRect(marginL, y, contentW, 22, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.setFont('helvetica', 'normal');
  doc.text('VALOR ESTIMADO DE MERCADO', W / 2, y + 7, { align: 'center' });
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${fmt(v?.finalValue ?? totalVal)} MXN`, W / 2, y + 18, { align: 'center' });
  y += 28;

  // Breakdown table
  const breakdownHeader = [
    { text: 'Componente', width: contentW * 0.35 },
    { text: '%', width: contentW * 0.15 },
    { text: 'm²', width: contentW * 0.2 },
    { text: 'Valor Estimado', width: contentW * 0.3 },
  ];

  doc.setFillColor(...navy);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  let x = marginL + 2;
  breakdownHeader.forEach(h => { doc.text(h.text, x, y + 5); x += h.width; });
  y += 7;

  const cVal = v?.estimatedConstructionValue ?? Math.round((v?.finalValue ?? totalVal) * (constructionPct / 100));
  const tVal = v?.estimatedTerrainValue ?? Math.round((v?.finalValue ?? totalVal) * (terrainPct / 100));

  const breakdownRows = [
    ['Construcción', `${constructionPct}%`, `${subject?.constructionM2 || 0} m²`, `${fmt(cVal)} MXN`],
    ['Terreno', `${terrainPct}%`, `${subject?.terrainM2 || 0} m²`, `${fmt(tVal)} MXN`],
    ['TOTAL', '100%', '—', `${fmt(v?.finalValue ?? totalVal)} MXN`],
  ];

  breakdownRows.forEach((row, i) => {
    const bg = i === 2 ? grayBg : white;
    doc.setFillColor(...bg);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', i === 2 ? 'bold' : 'normal');
    doc.setTextColor(...textDark);
    let rx = marginL + 2;
    row.forEach((cell, ci) => {
      doc.text(cell, rx, y + 5);
      rx += breakdownHeader[ci].width;
    });
    y += 7;
  });

  doc.setDrawColor(...grayBorder);
  doc.rect(marginL, y - 4 * 7, contentW, 4 * 7);

  // ======== PAGE 2 ========
  doc.addPage();
  y = 14;

  // ── Tabla de Comparables ──
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyDark);
  doc.text('■ Tabla de Comparables (muestra filtrada)', marginL, y);
  y += 7;

  const compColWidths = [8, contentW * 0.12, contentW * 0.38, 18, contentW * 0.18, contentW * 0.14];
  const compHeaders = ['#', 'Fuente', 'Descripción', 'm² C.', 'Precio', '$/m²'];

  doc.setFillColor(...navy);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  x = marginL + 1;
  compHeaders.forEach((h, i) => { doc.text(h, x, y + 5); x += compColWidths[i]; });
  y += 7;

  const comparables = v?.sampleProperties || [...result.newProducts, ...result.usedProducts];
  const maxComparables = Math.min(comparables.length, 22);

  for (let i = 0; i < maxComparables; i++) {
    if (y > H - 40) break;
    const p = comparables[i];
    const bg = i % 2 === 0 ? grayBg : white;
    doc.setFillColor(...bg);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);

    const pPerM2 = p.area > 0 ? Math.round(p.price / p.area) : 0;
    const rowData = [
      `${i + 1}`,
      (p.source || 'Fuente').substring(0, 18),
      (p.colony || 'Sin colonia').substring(0, 45),
      `${p.area}`,
      `${fmt(p.price)} MXN`,
      `${fmt(pPerM2)}`,
    ];

    x = marginL + 1;
    rowData.forEach((cell, ci) => {
      doc.text(cell, x, y + 5);
      x += compColWidths[ci];
    });
    y += 7;
  }

  doc.setDrawColor(...grayBorder);
  doc.rect(marginL, y - maxComparables * 7 - 7, contentW, (maxComparables + 1) * 7);

  // ── Aviso Legal ──
  y = Math.max(y + 10, H - 50);
  doc.setDrawColor(...grayBorder);
  doc.line(marginL, y, W - marginR, y);
  y += 3;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...textMuted);
  const legalText = `Aviso Legal: Este documento constituye únicamente un estimado de valor de mercado con fines orientativos, elaborado con base en oferta pública disponible en portales inmobiliarios al ${dateStr}. No sustituye un avalúo formal emitido por perito valuador certificado. Los valores están sujetos a variaciones del mercado y a las condiciones particulares del inmueble. Para transacciones legales o crediticias, se recomienda contratar los servicios de un valuador certificado.`;
  const legalLines = doc.splitTextToSize(legalText, contentW - 4);
  doc.text(legalLines, marginL, y);
  y += legalLines.length * 3.2 + 4;

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Reporte generado el ${dateStr} | Analista: ${displayAnalyst}${clientName ? ` | Cliente: ${clientName}` : ''}`, W / 2, H - 10, { align: 'center' });

  doc.save(`EstimadoValor_${muni.replace(/\s/g, '_')}.pdf`);
}
