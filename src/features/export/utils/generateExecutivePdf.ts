import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DashboardData, Asset } from '@/domain/models';

// Cores Tracbel Agro
const GREEN_DARK  = [27,  94,  32]  as [number, number, number];
const GREEN_MID   = [46, 125,  50]  as [number, number, number];
const GREEN_LIGHT = [232, 245, 233] as [number, number, number];
const GOLD        = [245, 197,  24]  as [number, number, number];
const GRAY_LIGHT  = [248, 250, 252] as [number, number, number];
const GRAY_MID    = [226, 232, 240] as [number, number, number];
const TEXT_DARK   = [15,  23,  42]  as [number, number, number];
const TEXT_MID    = [71,  85, 105]  as [number, number, number];

type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } };

function kpiBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string | number,
  color: [number, number, number],
  bgLight: [number, number, number],
) {
  doc.setFillColor(...bgLight);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');

  // barra lateral colorida
  doc.setFillColor(...color);
  doc.roundedRect(x, y, 3, h, 1.5, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MID);
  doc.text(label, x + 6, y + 7);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT_DARK);
  doc.text(String(value), x + 6, y + 17);
}

export function generateExecutivePdf(data: DashboardData, assets: Asset[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as DocWithTable;
  const W = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString('pt-BR');
  const today = new Date();
  const AGING_LIMIT = today.getFullYear() - 4;

  // ── CABEÇALHO ────────────────────────────────────────────────────────
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, 0, W, 28, 'F');

  doc.setFillColor(...GOLD);
  doc.rect(0, 28, W, 1.5, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('AssetAgro', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 230, 200);
  doc.text('Relatório Executivo — Gestão de Ativos de TI', 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(180, 220, 180);
  doc.text(`Tracbel Agro  |  Gerado em ${now}`, W - 14, 13, { align: 'right' });

  // ── KPIs ─────────────────────────────────────────────────────────────
  const { stats } = data;
  const kpiY = 36;
  const kpiW = 41;
  const kpiH = 22;
  const kpiGap = 4;

  const kpis = [
    { label: 'Total de Ativos',   value: stats.total,       color: GREEN_MID,        bg: GREEN_LIGHT },
    { label: 'Em Uso',            value: stats.in_use,      color: [22, 163, 74]  as [number,number,number], bg: [240,253,244] as [number,number,number] },
    { label: 'Em Estoque',        value: stats.stock,       color: [37, 99, 235]  as [number,number,number], bg: [239,246,255] as [number,number,number] },
    { label: 'Em Manutenção',     value: stats.maintenance, color: [217,119, 6]   as [number,number,number], bg: [255,251,235] as [number,number,number] },
  ];

  kpis.forEach((k, i) => {
    kpiBox(doc, 14 + i * (kpiW + kpiGap), kpiY, kpiW, kpiH, k.label, k.value, k.color, k.bg);
  });

  const kpis2 = [
    { label: 'Baixados',   value: stats.retired,   color: [100,116,139] as [number,number,number], bg: GRAY_LIGHT },
    { label: 'Notebooks',  value: stats.notebooks, color: [99,  102,241] as [number,number,number], bg: [238,242,255] as [number,number,number] },
    { label: 'Desktops',   value: stats.desktops,  color: [234, 88,  12] as [number,number,number], bg: [255,247,237] as [number,number,number] },
    { label: '% Utilização', value: stats.total > 0 ? `${Math.round((stats.in_use / stats.total) * 100)}%` : '0%',
      color: GREEN_MID, bg: GREEN_LIGHT },
  ];

  kpis2.forEach((k, i) => {
    kpiBox(doc, 14 + i * (kpiW + kpiGap), kpiY + kpiH + 4, kpiW, kpiH, k.label, k.value, k.color, k.bg);
  });

  // ── DISTRIBUIÇÃO POR FILIAL ───────────────────────────────────────────
  let curY = kpiY + kpiH * 2 + 14;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN_DARK);
  doc.text('Distribuição por Filial', 14, curY);
  curY += 4;

  const branchRows = data.by_branch
    .sort((a, b) => b.total - a.total)
    .map((b) => [
      b.branch_name,
      b.total,
      b.in_use,
      b.stock,
      b.maintenance,
      b.retired,
      b.total > 0 ? `${Math.round((b.in_use / b.total) * 100)}%` : '0%',
    ]);

  autoTable(doc, {
    startY: curY,
    head: [['Filial', 'Total', 'Em Uso', 'Estoque', 'Manutenção', 'Baixado', '% Uso']],
    body: branchRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: GREEN_DARK, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GRAY_LIGHT },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'center' },
      2: { halign: 'center', textColor: [22, 163, 74] as [number, number, number] },
      3: { halign: 'center', textColor: [37, 99, 235] as [number, number, number] },
      4: { halign: 'center', textColor: [217, 119, 6] as [number, number, number] },
      5: { halign: 'center', textColor: [100, 116, 139] as [number, number, number] },
      6: { halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  curY = doc.lastAutoTable.finalY + 10;

  // ── ALERTAS DE FROTA ─────────────────────────────────────────────────
  const agingAssets = assets.filter(
    (a) => a.year !== null && a.year <= AGING_LIMIT && a.status !== 'RETIRED',
  );
  const inUseNoEmployee = assets.filter(
    (a) => a.status === 'IN_USE' && !a.employee_name,
  );

  if (curY > 230) { doc.addPage(); curY = 20; }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN_DARK);
  doc.text('Indicadores de Atenção', 14, curY);
  curY += 6;

  const alertRows = [
    ['Equipamentos com 4+ anos de uso',        agingAssets.length,        agingAssets.length > 0 ? 'Atenção' : 'OK'],
    ['Em uso sem colaborador vinculado',        inUseNoEmployee.length,    inUseNoEmployee.length > 0 ? 'Verificar' : 'OK'],
    ['Manutenções abertas',                     stats.maintenance,         stats.maintenance > 0 ? 'Em andamento' : 'Nenhuma'],
    ['Taxa de utilização da frota',             `${Math.round((stats.in_use / Math.max(stats.total, 1)) * 100)}%`, stats.in_use / Math.max(stats.total, 1) >= 0.8 ? 'Alta' : 'Normal'],
  ];

  autoTable(doc, {
    startY: curY,
    head: [['Indicador', 'Quantidade', 'Situação']],
    body: alertRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: GREEN_DARK, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GRAY_LIGHT },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // ── EQUIPAMENTOS ENVELHECIDOS (se houver) ─────────────────────────────
  if (agingAssets.length > 0) {
    curY = doc.lastAutoTable.finalY + 10;
    if (curY > 230) { doc.addPage(); curY = 20; }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 40, 0);
    doc.text(`Equipamentos com ${4}+ Anos de Uso (${agingAssets.length})`, 14, curY);
    curY += 4;

    const agingRows = agingAssets.slice(0, 20).map((a) => [
      a.service_tag,
      a.branch_name ?? '—',
      a.employee_name ?? '—',
      String(a.year),
      a.model ?? '—',
      a.equipment_type === 'NOTEBOOK' ? 'Notebook' : 'Desktop',
    ]);

    autoTable(doc, {
      startY: curY,
      head: [['Service Tag', 'Filial', 'Colaborador', 'Ano', 'Modelo', 'Tipo']],
      body: agingRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [180, 40, 0] as [number,number,number], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 248, 248] as [number,number,number] },
      margin: { left: 14, right: 14 },
    });

    if (agingAssets.length > 20) {
      curY = doc.lastAutoTable.finalY + 3;
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_MID);
      doc.text(`+ ${agingAssets.length - 20} equipamentos não exibidos neste relatório.`, 14, curY);
    }
  }

  // ── RODAPÉ ───────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...GRAY_MID);
    doc.rect(0, pH - 10, W, 10, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MID);
    doc.text('AssetAgro — Tracbel Agro — Departamento de TI', 14, pH - 3.5);
    doc.text(`Página ${i} de ${pageCount}`, W - 14, pH - 3.5, { align: 'right' });
  }

  doc.save(`AssetAgro-Executivo-${new Date().toISOString().slice(0, 10)}.pdf`);
}
