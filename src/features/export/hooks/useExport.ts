import { useState } from 'react';
import * as XLSX from 'xlsx';
import { save } from '@tauri-apps/plugin-dialog';
import { listarAtivosParaExportacao, escreverArquivo } from '@/data/commands';
import { STATUS_LABEL, EQUIPMENT_TYPE_LABEL, STORAGE_TYPE_LABEL } from '@/domain/constants';
import { formatStorage } from '@/lib/utils';
import type { Asset, AssetStatus, EquipmentType, StorageType } from '@/domain/models';

export type ExportScope = 'all' | 'selected' | 'filtered';

export function useExport() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const exportToXlsx = async (
    scope: ExportScope,
    selectedBranches?: string[],
    filteredAssets?: Asset[],
  ) => {
    setExporting(true);
    setProgress('Buscando dados...');

    try {
      let assets: Asset[];

      if (scope === 'filtered' && filteredAssets) {
        assets = filteredAssets;
      } else {
        const branchIds = scope === 'selected' ? selectedBranches : undefined;
        assets = await listarAtivosParaExportacao(branchIds);
      }

      if (assets.length === 0) {
        setProgress('Nenhum dado para exportar.');
        return;
      }

      setProgress('Gerando planilha...');

      // Agrupar por filial
      const byBranch = new Map<string, Asset[]>();
      for (const asset of assets) {
        const key = asset.branch_name ?? 'Sem Filial';
        if (!byBranch.has(key)) byBranch.set(key, []);
        byBranch.get(key)!.push(asset);
      }

      const wb = XLSX.utils.book_new();

      const HEADERS = [
        'Colaborador',
        'Service Tag',
        'Tipo Equipamento',
        'Status',
        'Filial',
        'RAM (GB)',
        'Capacidade Armazenamento',
        'Tipo Armazenamento',
        'SO',
        'Processador',
        'Modelo',
        'Ano',
        'Observações',
        'Criado Em',
        'Atualizado Em',
      ];

      // Ordenar filiais alfabeticamente
      const sortedBranches = [...byBranch.entries()].sort((a, b) =>
        a[0].localeCompare(b[0], 'pt-BR'),
      );

      for (const [branchName, branchAssets] of sortedBranches) {
        const rows = branchAssets.map((a) => [
          a.employee_name ?? '',
          a.service_tag,
          EQUIPMENT_TYPE_LABEL[a.equipment_type as EquipmentType] ?? a.equipment_type,
          STATUS_LABEL[a.status as AssetStatus] ?? a.status,
          a.branch_name ?? '',
          a.ram_gb,
          formatStorage(a.storage_capacity_gb),
          STORAGE_TYPE_LABEL[a.storage_type as StorageType] ?? a.storage_type,
          a.os,
          a.cpu,
          a.model ?? '',
          a.year ?? '',
          a.notes ?? '',
          a.created_at,
          a.updated_at,
        ]);

        const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);

        // Congelar primeira linha (cabeçalho)
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };

        // Largura automática de colunas
        const colWidths = HEADERS.map((h, i) => ({
          wch: Math.max(
            h.length + 2,
            ...rows.map((r) => String(r[i] ?? '').length + 2),
          ),
        }));
        ws['!cols'] = colWidths;

        // Nome da aba (max 31 chars, sem caracteres inválidos)
        const sheetName = branchName
          .replace(/[\\/*?[\]:]/g, '')
          .substring(0, 31);

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      setProgress('Salvando arquivo...');

      // Diálogo de salvar
      const savePath = await save({
        defaultPath: `AssetAgro_${new Date().toISOString().slice(0, 10)}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });

      if (savePath) {
        const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        await escreverArquivo(savePath, Array.from(new Uint8Array(buffer)));
        setProgress('Exportação concluída!');
      } else {
        setProgress('Exportação cancelada.');
      }
    } catch (e) {
      setProgress(`Erro: ${e}`);
    } finally {
      setExporting(false);
      setTimeout(() => setProgress(''), 4000);
    }
  };

  return { exportToXlsx, exporting, progress };
}
