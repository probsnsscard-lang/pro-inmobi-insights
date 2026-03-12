import jsPDF from 'jspdf';
import { AnalysisResult } from './calculationEngine';

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

export function generatePDF(
  result: AnalysisResult,
  estimatedTotal?: number,
  constructionPct: number = 60,
  clientName: string = ''
) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const W = 216;
  const marginL = 16;
  const marginR = 16;
  const contentW = W - marginL - marginR;
  let y = 14;

  const hasNew = (result.newCount ?? result.newProducts.length) > 0 && result.newAvgPrice > 0;
  const hasUsed = (result.usedCount ?? result.usedProducts.length) > 0 && result.usedAvgPrice > 0;
  const nc = result.newCount ?? result.newProducts.length;
  const uc = result.usedCount ?? result.usedProducts.length;
  const terrainPct = 100 - constructionPct;
  const cFrac = constructionPct / 100;
  const tFrac = terrainPct / 100;

  const totalVal = estimatedTotal ?? (() => {
    const t = nc + uc;
    if (t === 0) return 0;
    return Math.round((result.newAvgPrice * nc + result.usedAvgPrice * uc) / t);
  })();

  // ===== HEADER =====
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, W, 30, 'F');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Análisis de Mercado Pro — Opinión de Valor', marginL, 11);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Fecha: ${dateStr}   |   Propiedades: ${result.totalProperties}`, marginL, 18);
  doc.setFontSize(7);
  const authorLine = clientName
    ? `Elaborado por: Ataúlfo Figón  |  Cliente: ${clientName}`
    : 'Elaborado por: Ataúlfo Figón';
  doc.text(authorLine, marginL, 24);

  y = 36;

  // ===== 1. RESUMEN EJECUTIVO =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Resumen Ejecutivo', marginL, y);
  y += 6;

  const colWidths = [contentW * 0.3, contentW * 0.23, contentW * 0.24, contentW * 0.23];
  const headers = ['Municipio', 'Muestra Gemini', 'Propiedades Válidas', 'Filtro de Pureza'];

  doc.setFillColor(30, 58, 95);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  let xPos = marginL;
  headers.forEach((h, i) => {
    doc.text(h, xPos + 2, y + 5);
    xPos += colWidths[i];
  });
  y += 7;

  const purity = result.purityFilter ?? Math.round(
    (result.newProducts.filter(p => p.price > 0 && p.area > 0).length +
     result.usedProducts.filter(p => p.price > 0 && p.area > 0).length) /
    Math.max(result.totalProperties, 1) * 100
  );

  doc.setFillColor(245, 247, 250);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  xPos = marginL;
  [result.municipality || 'Zona Analizada', `${result.totalProperties}`, `${result.totalProperties}`, `${purity}%`]
    .forEach((val, i) => {
      doc.text(val, xPos + 2, y + 5);
      xPos += colWidths[i];
    });
  y += 12;

  // ===== 2. VALOR ESTIMADO TOTAL =====
  doc.setFillColor(245, 250, 248);
  doc.roundedRect(marginL, y, contentW, 14, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Valor Estimado Total (Promedio Ponderado Proporcional)', marginL + 4, y + 5);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(fmt(totalVal), marginL + 4, y + 12);
  y += 20;

  // ===== 3. SEMÁFORO DE MERCADO + $/m² =====
  let semaphoreLabel = 'Estable';
  let semaphoreColor: [number, number, number] = [210, 170, 60];
  if (hasNew && hasUsed && result.usedAvgPrice > 0) {
    const premium = ((result.newAvgPrice - result.usedAvgPrice) / result.usedAvgPrice) * 100;
    if (premium > 30) { semaphoreLabel = 'Caliente'; semaphoreColor = [220, 60, 60]; }
    else if (premium < 10) { semaphoreLabel = 'Frío'; semaphoreColor = [5, 150, 105]; }
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Semáforo de Mercado:', marginL, y + 4);

  // Draw 3 circles for semaphore
  const semX = marginL + 40;
  const colors: [number, number, number][] = [[5, 150, 105], [210, 170, 60], [220, 60, 60]];
  const labels = ['Frío', 'Estable', 'Caliente'];
  colors.forEach((c, i) => {
    const active = labels[i] === semaphoreLabel;
    if (active) {
      doc.setFillColor(c[0], c[1], c[2]);
    } else {
      doc.setFillColor(220, 220, 220);
    }
    doc.circle(semX + i * 10, y + 3, 3, 'F');
  });
  doc.setFontSize(7);
  doc.setTextColor(semaphoreColor[0], semaphoreColor[1], semaphoreColor[2]);
  doc.text(semaphoreLabel, semX + 35, y + 4);

  // $/m² gauge visual
  const gaugeX = marginL + contentW * 0.55;
  const combinedPricePerM2 = (nc + uc) > 0
    ? Math.round((result.newAvgPricePerM2 * nc + result.usedAvgPricePerM2 * uc) / (nc + uc))
    : 0;
  doc.setTextColor(30, 58, 95);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Medidor $/m²:', gaugeX, y + 4);

  // Draw mini gauge arc
  const gCx = gaugeX + 50;
  const gCy = y + 3;
  const gR = 8;
  // Background arc segments
  const arcColors: [number, number, number][] = [[5, 150, 105], [210, 170, 60], [220, 60, 60]];
  arcColors.forEach((c, i) => {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(1.5);
    // Simplified: just draw colored line segments
    const startAngle = Math.PI + (i * Math.PI / 3);
    const endAngle = Math.PI + ((i + 1) * Math.PI / 3);
    const x1 = gCx + gR * Math.cos(startAngle);
    const y1 = gCy + gR * Math.sin(startAngle);
    const x2 = gCx + gR * Math.cos(endAngle);
    const y2 = gCy + gR * Math.sin(endAngle);
    doc.line(x1, y1, x2, y2);
  });
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(fmt(combinedPricePerM2), gCx + 12, y + 5);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('/m²', gCx + 12 + doc.getTextWidth(fmt(combinedPricePerM2)) + 1, y + 5);

  y += 14;

  // ===== 4. PRODUCT SECTIONS =====
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(marginL, y, contentW / 2 - 4, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('🏠 PRODUCTO NUEVO', marginL + 4, y + 5.5);

  const colR = marginL + contentW / 2 + 4;
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(colR, y, contentW / 2 - 4, 8, 2, 2, 'F');
  doc.text('🏠 PRODUCTO USADO', colR + 4, y + 5.5);
  y += 14;

  const halfW = contentW / 2 - 4;

  const metricRow = (label: string, value: string, x: number, yPos: number) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(label, x, yPos);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(value, x, yPos + 7);
  };

  const noDataText = (x: number, yPos: number) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(160, 160, 160);
    doc.text('Sin oferta detectada', x, yPos);
    doc.text('en este segmento', x, yPos + 5);
  };

  if (hasNew) {
    metricRow('Precio Promedio', fmt(result.newAvgPrice), marginL, y);
    metricRow('$/m²', fmt(result.newAvgPricePerM2), marginL + halfW * 0.55, y);
  } else {
    noDataText(marginL, y + 3);
  }

  if (hasUsed) {
    metricRow('Precio Promedio', fmt(result.usedAvgPrice), colR, y);
    metricRow('$/m²', fmt(result.usedAvgPricePerM2), colR + halfW * 0.55, y);
  } else {
    noDataText(colR, y + 3);
  }
  y += 18;

  // Distribution split with dynamic %
  const ruleSplit = (x: number, yPos: number, price: number, show: boolean) => {
    if (!show) return;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Distribución ${constructionPct}/${terrainPct}`, x, yPos);

    doc.setFillColor(230, 240, 250);
    doc.roundedRect(x, yPos + 2, halfW * 0.45, 12, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`🏠 ${constructionPct}% Construcción`, x + 2, yPos + 6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(fmt(price * cFrac), x + 2, yPos + 12);

    const x2 = x + halfW * 0.5;
    doc.setFillColor(230, 250, 240);
    doc.roundedRect(x2, yPos + 2, halfW * 0.45, 12, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`🌳 ${terrainPct}% Terreno`, x2 + 2, yPos + 6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(fmt(price * tFrac), x2 + 2, yPos + 12);
  };

  ruleSplit(marginL, y, result.newAvgPrice, hasNew);
  ruleSplit(colR, y, result.usedAvgPrice, hasUsed);
  y += 24;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(marginL, y, W - marginR, y);
  y += 6;

  // ===== 5. COLONY DISTRIBUTION (bars) =====
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Distribución por Colonias', marginL, y);
  y += 6;

  const barColors: [number, number, number][] = [
    [5, 150, 105], [30, 58, 95], [210, 170, 60], [80, 120, 180], [100, 200, 150],
  ];
  const maxCount = Math.max(...result.colonyDistribution.map(c => c.count), 1);
  result.colonyDistribution.slice(0, 5).forEach((col, i) => {
    const barW = (col.count / maxCount) * (contentW * 0.45);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(col.name.substring(0, 25), marginL, y + 3.5);
    const bc = barColors[i % barColors.length];
    doc.setFillColor(bc[0], bc[1], bc[2]);
    doc.roundedRect(marginL + contentW * 0.35, y, barW, 5, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(bc[0], bc[1], bc[2]);
    doc.text(`${col.percentage}%`, marginL + contentW * 0.35 + barW + 3, y + 3.5);
    y += 8;
  });

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginL, y, W - marginR, y);
  y += 6;

  // ===== 6. INSIGHTS =====
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('✦  Brillantes Análisis', marginL, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  result.insights.forEach(insight => {
    if (y > 225) return;
    const lines = doc.splitTextToSize(`•  ${insight}`, contentW - 4);
    doc.text(lines, marginL + 2, y);
    y += lines.length * 4 + 2;
  });

  // ===== 7. AVISO LEGAL =====
  const legalY = Math.max(y + 6, 230);
  doc.setDrawColor(220, 220, 220);
  doc.line(marginL, legalY, W - marginR, legalY);

  doc.setFillColor(248, 249, 250);
  doc.rect(marginL, legalY + 1, contentW, 28, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Aviso Legal', marginL + 2, legalY + 6);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const legalDateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const legalText = [
    'Este reporte es un estimado basado en datos de mercado recopilados de múltiples fuentes y no constituye un avalúo formal.',
    'Los valores presentados son orientativos y están sujetos a variaciones del mercado inmobiliario.',
    'Análisis de Mercado Pro no se hace responsable por decisiones financieras tomadas con base en este documento.',
    'Para una valuación oficial, se recomienda contratar los servicios de un perito valuador certificado.',
    `Reporte generado el ${legalDateStr} con ${result.totalProperties} propiedades. Distribución: ${constructionPct}/${terrainPct}.`,
  ];
  let ly = legalY + 11;
  legalText.forEach(line => {
    doc.text(`• ${line}`, marginL + 2, ly);
    ly += 4;
  });

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Análisis de Mercado Pro — Ataúlfo Figón', marginL, 270);
  if (clientName) {
    doc.text(`Para: ${clientName}`, marginL + 70, 270);
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Opinión de Valor de Mercado', W - marginR - 45, 270);

  doc.save('AnalisisMercado_OpinionDeValor.pdf');
}
