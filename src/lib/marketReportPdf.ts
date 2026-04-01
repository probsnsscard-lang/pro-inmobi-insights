import jsPDF from 'jspdf';
import { AnalysisResult } from './calculationEngine';

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

export function generateMarketReportPDF(
  result: AnalysisResult,
  municipalities: string[],
  analystName: string = '',
  clientName: string = ''
) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const W = 216;
  const H = 279;
  const marginL = 14;
  const marginR = 14;
  const contentW = W - marginL - marginR;
  let y = 0;

  const navy: [number, number, number] = [30, 45, 60];
  const grayBg: [number, number, number] = [245, 247, 250];
  const grayBorder: [number, number, number] = [220, 225, 230];
  const textDark: [number, number, number] = [40, 40, 40];
  const textMuted: [number, number, number] = [100, 105, 110];
  const white: [number, number, number] = [255, 255, 255];
  const emerald: [number, number, number] = [5, 150, 105];

  const displayAnalyst = analystName.trim() || 'Ataúlfo Figón';
  const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  // ======== HEADER ========
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 32, 'F');
  doc.setFontSize(18);
  doc.setTextColor(...white);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE MERCADO GENERAL', W / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${municipalities.join(' • ')}`, W / 2, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`${dateStr} | Analista: ${displayAnalyst}`, W / 2, 28, { align: 'center' });

  y = 40;

  // ── Resumen General ──
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('■ Resumen General del Mercado', marginL, y);
  y += 8;

  const allProperties = [...result.newProducts, ...result.usedProducts];
  const nc = result.newCount ?? result.newProducts.length;
  const uc = result.usedCount ?? result.usedProducts.length;
  const combinedPricePerM2 = (nc + uc) > 0
    ? Math.round((result.newAvgPricePerM2 * nc + result.usedAvgPricePerM2 * uc) / (nc + uc))
    : 0;

  // Summary stats boxes
  const stats = [
    { label: 'Total Propiedades', value: `${result.totalProperties}` },
    { label: 'Producto Nuevo', value: `${nc}` },
    { label: 'Producto Usado', value: `${uc}` },
    { label: '$/m² Promedio', value: fmt(combinedPricePerM2) },
  ];

  const boxW = (contentW - 12) / 4;
  stats.forEach((s, i) => {
    const bx = marginL + i * (boxW + 4);
    doc.setFillColor(...grayBg);
    doc.roundedRect(bx, y, boxW, 16, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text(s.label, bx + boxW / 2, y + 5, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text(s.value, bx + boxW / 2, y + 13, { align: 'center' });
  });
  y += 24;

  // ── Tabla Comparativa por Municipio (colony-based) ──
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('■ Comparativa por Zona', marginL, y);
  y += 7;

  // Group properties by colony for comparative
  const colonyMap = new Map<string, { count: number; totalPrice: number; totalArea: number }>();
  allProperties.forEach(p => {
    const entry = colonyMap.get(p.colony) || { count: 0, totalPrice: 0, totalArea: 0 };
    entry.count++;
    entry.totalPrice += p.price;
    entry.totalArea += p.area;
    colonyMap.set(p.colony, entry);
  });

  const colonyStats = [...colonyMap.entries()]
    .map(([name, s]) => ({
      name,
      count: s.count,
      avgPrice: Math.round(s.totalPrice / s.count),
      avgPricePerM2: s.totalArea > 0 ? Math.round(s.totalPrice / s.totalArea) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Table header
  const colWidths = [contentW * 0.35, contentW * 0.15, contentW * 0.25, contentW * 0.25];
  const headers = ['Zona / Colonia', 'Propiedades', 'Precio Promedio', '$/m²'];

  doc.setFillColor(...navy);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  let x = marginL + 2;
  headers.forEach((h, i) => { doc.text(h, x, y + 5); x += colWidths[i]; });
  y += 7;

  colonyStats.forEach((cs, i) => {
    const bg = i % 2 === 0 ? grayBg : white;
    doc.setFillColor(...bg);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    x = marginL + 2;
    [cs.name.substring(0, 35), `${cs.count}`, `${fmt(cs.avgPrice)} MXN`, `${fmt(cs.avgPricePerM2)} MXN/m²`].forEach((cell, ci) => {
      doc.text(cell, x, y + 5);
      x += colWidths[ci];
    });
    y += 7;
  });

  doc.setDrawColor(...grayBorder);
  doc.rect(marginL, y - colonyStats.length * 7 - 7, contentW, (colonyStats.length + 1) * 7);

  y += 12;

  // ── Bar chart: $/m² by colony ──
  if (y < H - 80) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('■ Precio por m² — Comparativa Visual', marginL, y);
    y += 8;

    const maxPricePerM2 = Math.max(...colonyStats.map(c => c.avgPricePerM2), 1);
    const barMaxW = contentW * 0.5;
    const top10 = colonyStats.slice(0, 10);

    top10.forEach((cs, i) => {
      if (y > H - 30) return;
      // Label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      doc.text(cs.name.substring(0, 28), marginL, y + 3.5);

      // Bar
      const barW = Math.max((cs.avgPricePerM2 / maxPricePerM2) * barMaxW, 2);
      const barColor: [number, number, number] = i % 2 === 0 ? navy : emerald;
      doc.setFillColor(...barColor);
      doc.roundedRect(marginL + contentW * 0.35, y, barW, 5, 1, 1, 'F');

      // Value
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...barColor);
      doc.text(fmt(cs.avgPricePerM2), marginL + contentW * 0.35 + barW + 3, y + 3.5);

      y += 8;
    });
  }

  // ── Legal ──
  y = Math.max(y + 8, H - 35);
  doc.setDrawColor(...grayBorder);
  doc.line(marginL, y, W - marginR, y);
  y += 3;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...textMuted);
  const legalText = `Este reporte es un análisis general de mercado con fines orientativos. No sustituye un avalúo formal. Reporte generado el ${dateStr}.`;
  const legalLines = doc.splitTextToSize(legalText, contentW);
  doc.text(legalLines, marginL, y);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Analista: ${displayAnalyst}${clientName ? ` | Cliente: ${clientName}` : ''}`, W / 2, H - 10, { align: 'center' });

  doc.save(`ReporteMercado_General_${municipalities.length}municipios.pdf`);
}
