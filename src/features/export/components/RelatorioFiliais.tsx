import React, { useState } from 'react';
import { GitCompare, FileDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { obterDadosDashboard, listarAtivosParaExportacao } from '@/data/commands';
import type { BranchCount, Asset } from '@/domain/models';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } };

const GREEN_DARK  = [27,  94,  32]  as [number, number, number];
const GOLD        = [245, 197,  24] as [number, number, number];
const GRAY_LIGHT  = [248, 250, 252] as [number, number, number];
const GRAY_MID    = [226, 232, 240] as [number, number, number];
const TEXT_MID    = [71,  85, 105]  as [number, number, number];

interface BranchDetail extends BranchCount {
  notebooks: number;
  desktops: number;
  employees: number;
  utilization: string;
}

async function loadBranchDetails(): Promise<BranchDetail[]> {
  const [dashboard, assets] = await Promise.all([
    obterDadosDashboard(),
    listarAtivosParaExportacao(),
  ]);

  const byBranch = new Map<string, Asset[]>();
  for (const a of assets) {
    const list = byBranch.get(a.branch_id) ?? [];
    list.push(a);
    byBranch.set(a.branch_id, list);
  }

  return dashboard.by_branch
    .map((b) => {
      const branchAssets = byBranch.get(b.branch_id) ?? [];
      const employees = new Set(branchAssets.filter((a) => a.employee_name).map((a) => a.employee_name!));
      return {
        ...b,
        notebooks: branchAssets.filter((a) => a.equipment_type === 'NOTEBOOK').length,
        desktops: branchAssets.filter((a) => a.equipment_type === 'DESKTOP').length,
        employees: employees.size,
        utilization: b.total > 0 ? `${Math.round((b.in_use / b.total) * 100)}%` : '0%',
      };
    })
    .sort((a, b) => b.total - a.total);
}

function exportXlsx(details: BranchDetail[]) {
  const rows = details.map((b) => ({
    Filial: b.branch_name,
    Total: b.total,
    'Em Uso': b.in_use,
    Estoque: b.stock,
    Manutenção: b.maintenance,
    Baixados: b.retired,
    Notebooks: b.notebooks,
    Desktops: b.desktops,
    Colaboradores: b.employees,
    '% Utilização': b.utilization,
  }));

  // Totals row
  rows.push({
    Filial: 'TOTAL',
    Total: details.reduce((s, b) => s + b.total, 0),
    'Em Uso': details.reduce((s, b) => s + b.in_use, 0),
    Estoque: details.reduce((s, b) => s + b.stock, 0),
    Manutenção: details.reduce((s, b) => s + b.maintenance, 0),
    Baixados: details.reduce((s, b) => s + b.retired, 0),
    Notebooks: details.reduce((s, b) => s + b.notebooks, 0),
    Desktops: details.reduce((s, b) => s + b.desktops, 0),
    Colaboradores: details.reduce((s, b) => s + b.employees, 0),
    '% Utilização': (() => {
      const total = details.reduce((s, b) => s + b.total, 0);
      const inUse = details.reduce((s, b) => s + b.in_use, 0);
      return total > 0 ? `${Math.round((inUse / total) * 100)}%` : '0%';
    })(),
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [25, 8, 8, 8, 12, 8, 10, 8, 13, 12].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comparativo Filiais');
  XLSX.writeFile(wb, `AssetAgro-Filiais-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportPdf(details: BranchDetail[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as DocWithTable;
  const W = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString('pt-BR');

  // Header
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
  doc.text('Comparativo de Filiais', 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(180, 220, 180);
  doc.text(`Tracbel Agro  |  Gerado em ${now}`, W - 14, 13, { align: 'right' });

  const totalAll = details.reduce((s, b) => s + b.total, 0);
  const inUseAll = details.reduce((s, b) => s + b.in_use, 0);
  const utilAll = totalAll > 0 ? `${Math.round((inUseAll / totalAll) * 100)}%` : '0%';

  const rows = details.map((b) => [
    b.branch_name,
    b.total,
    b.in_use,
    b.stock,
    b.maintenance,
    b.retired,
    b.notebooks,
    b.desktops,
    b.employees,
    b.utilization,
  ]);

  rows.push([
    'TOTAL',
    totalAll,
    inUseAll,
    details.reduce((s, b) => s + b.stock, 0),
    details.reduce((s, b) => s + b.maintenance, 0),
    details.reduce((s, b) => s + b.retired, 0),
    details.reduce((s, b) => s + b.notebooks, 0),
    details.reduce((s, b) => s + b.desktops, 0),
    details.reduce((s, b) => s + b.employees, 0),
    utilAll,
  ]);

  autoTable(doc, {
    startY: 36,
    head: [['Filial', 'Total', 'Em Uso', 'Estoque', 'Manutenção', 'Baixados', 'Notebooks', 'Desktops', 'Colaboradores', '% Uso']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: GREEN_DARK, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GRAY_LIGHT },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { halign: 'center' },
      2: { halign: 'center', textColor: [22, 163, 74] as [number,number,number] },
      3: { halign: 'center', textColor: [37, 99, 235] as [number,number,number] },
      4: { halign: 'center', textColor: [217, 119, 6] as [number,number,number] },
      5: { halign: 'center', textColor: [100, 116, 139] as [number,number,number] },
      6: { halign: 'center', textColor: [99, 102, 241] as [number,number,number] },
      7: { halign: 'center', textColor: [234, 88, 12] as [number,number,number] },
      8: { halign: 'center' },
      9: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell(data) {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fillColor = GREEN_DARK as [number,number,number];
        data.cell.styles.textColor = [255, 255, 255] as [number,number,number];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
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

  doc.save(`AssetAgro-Filiais-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export const RelatorioFiliais: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [genPdf, setGenPdf] = useState(false);

  const handleXlsx = async () => {
    setLoading(true);
    try {
      exportXlsx(await loadBranchDetails());
      toast('success', 'Excel comparativo de filiais gerado!');
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async () => {
    setGenPdf(true);
    try {
      exportPdf(await loadBranchDetails());
      toast('success', 'PDF comparativo de filiais gerado!');
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setGenPdf(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <GitCompare className="h-5 w-5 text-indigo-600" />
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Comparativo de Filiais
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Todas as 16 filiais lado a lado com totais por status, tipo e taxa de utilização.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleXlsx}
          loading={loading}
          disabled={genPdf}
          icon={<FileDown className="h-4 w-4" />}
        >
          Exportar Excel
        </Button>
        <Button
          onClick={handlePdf}
          loading={genPdf}
          disabled={loading}
          variant="secondary"
          icon={<FileText className="h-4 w-4" />}
        >
          Gerar PDF
        </Button>
      </div>
    </div>
  );
};
