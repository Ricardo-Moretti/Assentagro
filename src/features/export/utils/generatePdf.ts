import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Asset } from '@/domain/models';
import { formatStorage } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  IN_USE: 'Em Uso',
  STOCK: 'Estoque',
  MAINTENANCE: 'Manutenção',
  RETIRED: 'Baixado',
};

export function generatePdf(assets: Asset[], title?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title ?? 'AssetAgro — Relatório de Ativos', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tracbel Agro — Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 21);
  doc.text(`Total: ${assets.length} equipamento(s)`, 14, 26);

  // Group by branch
  const byBranch = new Map<string, Asset[]>();
  for (const a of assets) {
    const key = a.branch_name ?? 'Sem Filial';
    if (!byBranch.has(key)) byBranch.set(key, []);
    byBranch.get(key)!.push(a);
  }

  let startY = 32;

  for (const [branchName, branchAssets] of byBranch) {
    // Branch header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    if (startY > 180) {
      doc.addPage();
      startY = 15;
    }

    doc.text(`${branchName} (${branchAssets.length})`, 14, startY);
    startY += 2;

    const rows = branchAssets.map((a) => [
      a.service_tag,
      a.equipment_type === 'NOTEBOOK' ? 'Notebook' : 'Desktop',
      STATUS_LABELS[a.status] ?? a.status,
      a.employee_name ?? '—',
      a.model ?? '—',
      a.year ? String(a.year) : '—',
      `${a.ram_gb} GB`,
      formatStorage(a.storage_capacity_gb),
      a.os || '—',
    ]);

    autoTable(doc, {
      startY,
      head: [['Service Tag', 'Tipo', 'Status', 'Colaborador', 'Modelo', 'Ano', 'RAM', 'Armazenamento', 'SO']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [27, 94, 32], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });

    startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(`AssetAgro-Relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
}
