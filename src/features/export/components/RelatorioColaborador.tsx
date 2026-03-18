import React, { useState } from 'react';
import { Users, FileDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { listarAtivosParaExportacao } from '@/data/commands';
import type { Asset } from '@/domain/models';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } };

const GREEN_DARK  = [27,  94,  32]  as [number, number, number];
const GREEN_LIGHT = [232, 245, 233] as [number, number, number];
const GOLD        = [245, 197,  24] as [number, number, number];
const GRAY_LIGHT  = [248, 250, 252] as [number, number, number];
const GRAY_MID    = [226, 232, 240] as [number, number, number];
const TEXT_MID    = [71,  85, 105]  as [number, number, number];
const TEXT_DARK   = [15,  23,  42]  as [number, number, number];

const STATUS_LABEL: Record<string, string> = {
  IN_USE: 'Em Uso',
  STOCK: 'Estoque',
  MAINTENANCE: 'Manutenção',
  RETIRED: 'Baixado',
};

interface EmployeeGroup {
  employee: string;
  branch: string;
  assets: Asset[];
}

function groupByEmployee(assets: Asset[]): EmployeeGroup[] {
  const map = new Map<string, EmployeeGroup>();
  for (const a of assets) {
    if (!a.employee_name) continue;
    const key = `${a.employee_name}||${a.branch_name ?? ''}`;
    if (!map.has(key)) {
      map.set(key, { employee: a.employee_name, branch: a.branch_name ?? '—', assets: [] });
    }
    map.get(key)!.assets.push(a);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.branch.localeCompare(b.branch) || a.employee.localeCompare(b.employee),
  );
}

function exportXlsx(groups: EmployeeGroup[]) {
  const rows: Record<string, string | number>[] = [];
  for (const g of groups) {
    for (const a of g.assets) {
      rows.push({
        Filial: g.branch,
        Colaborador: g.employee,
        'Service Tag': a.service_tag,
        Modelo: a.model ?? '—',
        Tipo: a.equipment_type === 'NOTEBOOK' ? 'Notebook' : 'Desktop',
        Status: STATUS_LABEL[a.status] ?? a.status,
        'Ano Fabricação': a.year ?? '—',
        CPU: a.cpu,
        'RAM (GB)': a.ram_gb,
        SO: a.os,
      });
    }
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [20, 30, 15, 25, 10, 12, 12, 30, 10, 20].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Por Colaborador');
  XLSX.writeFile(wb, `AssetAgro-Colaboradores-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportPdf(groups: EmployeeGroup[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as DocWithTable;
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
  doc.text('Relatório por Colaborador', 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(180, 220, 180);
  doc.text(`Tracbel Agro  |  Gerado em ${now}`, W - 14, 13, { align: 'right' });

  // Summary KPIs
  const totalColabs = groups.length;
  const totalAssets = groups.reduce((s, g) => s + g.assets.length, 0);
  const avgPerColab = totalColabs > 0 ? (totalAssets / totalColabs).toFixed(1) : '0';

  let curY = 36;
  const kpis = [
    { label: 'Colaboradores com ativo', value: totalColabs, color: GREEN_DARK, bg: GREEN_LIGHT },
    { label: 'Equipamentos vinculados', value: totalAssets, color: [22, 163, 74] as [number,number,number], bg: [240,253,244] as [number,number,number] },
    { label: 'Média por colaborador', value: avgPerColab, color: [37, 99, 235] as [number,number,number], bg: [239,246,255] as [number,number,number] },
  ];

  const kpiW = 58; const kpiH = 22; const kpiGap = 4;
  kpis.forEach((k, i) => {
    const x = 14 + i * (kpiW + kpiGap);
    doc.setFillColor(...k.bg);
    doc.setDrawColor(...k.color);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, curY, kpiW, kpiH, 3, 3, 'FD');
    doc.setFillColor(...k.color);
    doc.roundedRect(x, curY, 3, kpiH, 1.5, 1.5, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MID);
    doc.text(k.label, x + 6, curY + 7);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text(String(k.value), x + 6, curY + 17);
  });
  curY += kpiH + 12;

  // Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN_DARK);
  doc.text('Detalhamento por Colaborador', 14, curY);
  curY += 4;

  const rows = groups.flatMap((g) =>
    g.assets.map((a, idx) => [
      idx === 0 ? g.employee : '',
      idx === 0 ? g.branch : '',
      a.service_tag,
      a.model ?? '—',
      a.equipment_type === 'NOTEBOOK' ? 'Notebook' : 'Desktop',
      STATUS_LABEL[a.status] ?? a.status,
      String(a.year ?? '—'),
    ]),
  );

  autoTable(doc, {
    startY: curY,
    head: [['Colaborador', 'Filial', 'Service Tag', 'Modelo', 'Tipo', 'Status', 'Ano']],
    body: rows,
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: GREEN_DARK, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GRAY_LIGHT },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 32 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 12 },
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

  doc.save(`AssetAgro-Colaboradores-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export const RelatorioColaborador: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [genPdf, setGenPdf] = useState(false);

  const load = async (): Promise<EmployeeGroup[]> => {
    const assets = await listarAtivosParaExportacao();
    return groupByEmployee(assets.filter((a) => a.status === 'IN_USE'));
  };

  const handleXlsx = async () => {
    setLoading(true);
    try {
      exportXlsx(await load());
      toast('success', 'Excel por colaborador gerado!');
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async () => {
    setGenPdf(true);
    try {
      exportPdf(await load());
      toast('success', 'PDF por colaborador gerado!');
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setGenPdf(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-agro-600" />
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Relatório por Colaborador
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lista todos os equipamentos em uso agrupados por colaborador. Inclui filial, modelo, tipo e status.
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
