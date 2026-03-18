import React, { useState } from 'react';
import { Wrench, FileDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { listarManutencoes, listarAtivos } from '@/data/commands';
import type { MaintenanceRecord, Asset } from '@/domain/models';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } };

const AMBER_DARK  = [180, 83,  9]   as [number, number, number];
const AMBER_LIGHT = [255, 251, 235] as [number, number, number];
const GREEN_DARK  = [27,  94,  32]  as [number, number, number];
const GOLD        = [245, 197, 24]  as [number, number, number];
const GRAY_LIGHT  = [248, 250, 252] as [number, number, number];
const GRAY_MID    = [226, 232, 240] as [number, number, number];
const TEXT_MID    = [71,  85, 105]  as [number, number, number];
const TEXT_DARK   = [15,  23,  42]  as [number, number, number];

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
}

function fmtCurrency(v: number): string {
  return v > 0 ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
}

interface EnrichedMaintenance extends MaintenanceRecord {
  branch_name: string;
}

async function loadData(
  inicio: string,
  fim: string,
): Promise<EnrichedMaintenance[]> {
  const [records, assets] = await Promise.all([
    listarManutencoes(),
    listarAtivos(),
  ]);

  const assetMap = new Map<string, Asset>(assets.map((a) => [a.id, a]));

  let filtered = records.map((r) => ({
    ...r,
    branch_name: assetMap.get(r.asset_id)?.branch_name ?? '—',
  }));

  if (inicio) {
    const from = new Date(inicio).getTime();
    filtered = filtered.filter((r) => new Date(r.sent_at).getTime() >= from);
  }
  if (fim) {
    const to = new Date(fim + 'T23:59:59').getTime();
    filtered = filtered.filter((r) => new Date(r.sent_at).getTime() <= to);
  }

  return filtered.sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
  );
}

function exportXlsx(records: EnrichedMaintenance[]) {
  const rows = records.map((r) => ({
    'Service Tag': r.service_tag ?? '—',
    Filial: r.branch_name,
    Fornecedor: r.supplier,
    Status: r.status === 'OPEN' ? 'Aberto' : 'Concluído',
    'Data Envio': fmtDate(r.sent_at),
    'Retorno Previsto': fmtDate(r.expected_return_date),
    'Data Retorno': fmtDate(r.returned_at),
    'Custo (R$)': r.cost > 0 ? r.cost : '',
    Observações: r.notes || '—',
  }));

  const totals = {
    'Service Tag': 'TOTAL',
    Filial: '',
    Fornecedor: '',
    Status: `${records.filter((r) => r.status === 'OPEN').length} abertos / ${records.filter((r) => r.status === 'CLOSED').length} concluídos`,
    'Data Envio': '',
    'Retorno Previsto': '',
    'Data Retorno': '',
    'Custo (R$)': records.reduce((s, r) => s + r.cost, 0),
    Observações: '',
  };
  rows.push(totals);

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [14, 22, 22, 12, 12, 16, 14, 14, 40].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Manutenções');
  XLSX.writeFile(wb, `AssetAgro-Manutencoes-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportPdf(records: EnrichedMaintenance[], inicio: string, fim: string) {
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
  const periodo = inicio || fim
    ? `Histórico de Manutenções  (${inicio ? fmtDate(inicio) : 'início'} — ${fim ? fmtDate(fim) : 'hoje'})`
    : 'Histórico de Manutenções — Completo';
  doc.text(periodo, 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(180, 220, 180);
  doc.text(`Tracbel Agro  |  Gerado em ${now}`, W - 14, 13, { align: 'right' });

  // KPIs
  const totalCost = records.reduce((s, r) => s + r.cost, 0);
  const open = records.filter((r) => r.status === 'OPEN').length;
  const closed = records.filter((r) => r.status === 'CLOSED').length;
  const avgDays = (() => {
    const closed_with_return = records.filter((r) => r.status === 'CLOSED' && r.returned_at);
    if (!closed_with_return.length) return '—';
    const total = closed_with_return.reduce((s, r) => {
      const diff = new Date(r.returned_at!).getTime() - new Date(r.sent_at).getTime();
      return s + diff / 86400000;
    }, 0);
    return `${Math.round(total / closed_with_return.length)}d`;
  })();

  const kpis = [
    { label: 'Total de registros', value: records.length, color: AMBER_DARK, bg: AMBER_LIGHT },
    { label: 'Em aberto', value: open, color: [217,119,6] as [number,number,number], bg: [255,251,235] as [number,number,number] },
    { label: 'Concluídos', value: closed, color: [22,163,74] as [number,number,number], bg: [240,253,244] as [number,number,number] },
    { label: 'Custo total', value: totalCost > 0 ? `R$ ${totalCost.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : 'R$ 0,00', color: [220,38,38] as [number,number,number], bg: [254,242,242] as [number,number,number] },
    { label: 'Prazo médio', value: avgDays, color: [37,99,235] as [number,number,number], bg: [239,246,255] as [number,number,number] },
  ];

  let curY = 36;
  const kpiW = 51; const kpiH = 22; const kpiGap = 3;
  kpis.forEach((k, i) => {
    const x = 14 + i * (kpiW + kpiGap);
    doc.setFillColor(...k.bg);
    doc.setDrawColor(...k.color);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, curY, kpiW, kpiH, 3, 3, 'FD');
    doc.setFillColor(...k.color);
    doc.roundedRect(x, curY, 3, kpiH, 1.5, 1.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MID);
    doc.text(k.label, x + 6, curY + 7);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text(String(k.value), x + 6, curY + 17);
  });
  curY += kpiH + 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AMBER_DARK);
  doc.text(`Histórico Detalhado (${records.length} registros)`, 14, curY);
  curY += 4;

  const rows = records.map((r) => [
    r.service_tag ?? '—',
    r.branch_name,
    r.supplier,
    r.status === 'OPEN' ? 'Aberto' : 'Concluído',
    fmtDate(r.sent_at),
    fmtDate(r.expected_return_date),
    fmtDate(r.returned_at),
    fmtCurrency(r.cost),
  ]);

  autoTable(doc, {
    startY: curY,
    head: [['Service Tag', 'Filial', 'Fornecedor', 'Status', 'Envio', 'Prev. Retorno', 'Retorno', 'Custo']],
    body: rows,
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: AMBER_DARK, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GRAY_LIGHT },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 24 },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 22 },
    },
    didParseCell(data) {
      if (data.column.index === 3 && data.section === 'body') {
        const val = String(data.cell.raw);
        if (val === 'Aberto') data.cell.styles.textColor = [217, 119, 6] as [number,number,number];
        else data.cell.styles.textColor = [22, 163, 74] as [number,number,number];
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

  doc.save(`AssetAgro-Manutencoes-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export const RelatorioManutencoes: React.FC = () => {
  const { toast } = useToast();
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [genPdf, setGenPdf] = useState(false);

  const handleXlsx = async () => {
    setLoading(true);
    try {
      exportXlsx(await loadData(inicio, fim));
      toast('success', 'Excel de manutenções gerado!');
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async () => {
    setGenPdf(true);
    try {
      exportPdf(await loadData(inicio, fim), inicio, fim);
      toast('success', 'PDF de manutenções gerado!');
    } catch (e) {
      toast('error', `Falha: ${e}`);
    } finally {
      setGenPdf(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5 text-amber-600" />
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Histórico de Manutenções
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Relatório completo de todas as manutenções com fornecedor, datas, status e custos.
          </p>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Data envio — de</label>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            title="Data inicial"
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">até</label>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            title="Data final"
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        {(inicio || fim) && (
          <button
            onClick={() => { setInicio(''); setFim(''); }}
            className="text-xs text-agro-600 hover:underline pb-1"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
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
