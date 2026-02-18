import jsPDF from 'jspdf';
import { AnalysisResult } from './calculationEngine';

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

export function generatePDF(result: AnalysisResult) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const W = 216;
  const marginL = 16;
  const marginR = 16;
  const contentW = W - marginL - marginR;
  let y = 14;

  // Header bar
  doc.setFillColor(30, 58, 95); // navy
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Pro Inmobi — Opinión de Valor de Mercado', marginL, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}   |   Propiedades analizadas: ${result.totalProperties}`, marginL, 20);

  y = 36;

  // ---- PRODUCTO NUEVO ----
  doc.setFillColor(5, 150, 105); // emerald
  doc.roundedRect(marginL, y, contentW / 2 - 4, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCTO NUEVO', marginL + 4, y + 5.5);

  const colR = marginL + contentW / 2 + 4;
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(colR, y, contentW / 2 - 4, 8, 2, 2, 'F');
  doc.text('PRODUCTO USADO', colR + 4, y + 5.5);

  y += 14;

  // New product metrics
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

  const halfW = contentW / 2 - 4;

  // New
  metricRow('Precio Promedio', fmt(result.newAvgPrice), marginL, y);
  metricRow('$/m²', fmt(result.newAvgPricePerM2), marginL + halfW * 0.55, y);

  // Used
  metricRow('Precio Promedio', fmt(result.usedAvgPrice), colR, y);
  metricRow('$/m²', fmt(result.usedAvgPricePerM2), colR + halfW * 0.55, y);

  y += 18;

  // 60/40 Rule
  const rule6040 = (x: number, yPos: number, c60: number, t40: number) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Regla 60/40', x, yPos);

    doc.setFillColor(230, 240, 250);
    doc.roundedRect(x, yPos + 2, halfW * 0.45, 10, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text('60% Construcción', x + 2, yPos + 5.5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(fmt(c60), x + 2, yPos + 10);

    const x2 = x + halfW * 0.5;
    doc.setFillColor(230, 250, 240);
    doc.roundedRect(x2, yPos + 2, halfW * 0.45, 10, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('40% Terreno', x2 + 2, yPos + 5.5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(fmt(t40), x2 + 2, yPos + 10);
  };

  rule6040(marginL, y, result.newConstruction60, result.newTerrain40);
  rule6040(colR, y, result.usedConstruction60, result.usedTerrain40);

  y += 22;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(marginL, y, W - marginR, y);
  y += 6;

  // Colony Distribution
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Distribución por Colonias', marginL, y);
  y += 6;

  const barColors = [
    [5, 150, 105],
    [30, 58, 95],
    [210, 170, 60],
    [80, 120, 180],
    [100, 200, 150],
  ];

  const maxCount = Math.max(...result.colonyDistribution.map(c => c.count), 1);
  result.colonyDistribution.slice(0, 5).forEach((col, i) => {
    const barW = (col.count / maxCount) * (contentW * 0.5);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(col.name, marginL, y + 3.5);
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

  // Insights
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('✦  Brillantes Análisis', marginL, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  result.insights.forEach(insight => {
    const lines = doc.splitTextToSize(`•  ${insight}`, contentW - 4);
    doc.text(lines, marginL + 2, y);
    y += lines.length * 4 + 2;
  });

  // Footer
  const footerY = 270 - 10;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginL, footerY - 4, W - marginR, footerY - 4);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Este reporte es un estimado basado en datos de mercado y no sustituye a un avalúo formal.',
    marginL,
    footerY
  );
  doc.text('Pro Inmobi — Opinión de Valor  |  Generado automáticamente', marginL, footerY + 4);

  doc.save('ProInmobi_Opinion_de_Valor.pdf');
}
