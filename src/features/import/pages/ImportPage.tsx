import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { importarAtivos } from '@/data/commands';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRBAC } from '@/hooks/useRBAC';
import {
  BRANCHES,
  ASSET_STATUSES,
  EQUIPMENT_TYPES,
  STORAGE_TYPES,
} from '@/domain/constants';
import type { CreateAssetDto, ImportResult } from '@/domain/models';
import { cn } from '@/lib/utils';

// Valores válidos para validação
const VALID_STATUSES = ASSET_STATUSES.map((s) => s.value);
const VALID_TYPES = EQUIPMENT_TYPES.map((t) => t.value);
const VALID_STORAGE = STORAGE_TYPES.map((s) => s.value);
const VALID_BRANCH_IDS = BRANCHES.map((b) => b.id);
const VALID_BRANCH_NAMES = BRANCHES.map((b) => b.name.toLowerCase());

// Mapeia nome de filial para ID
function findBranchId(value: string): string | null {
  const lower = value.trim().toLowerCase();
  // Tenta match por ID
  if (VALID_BRANCH_IDS.includes(value.trim())) return value.trim();
  // Tenta match por nome
  const idx = VALID_BRANCH_NAMES.findIndex((n) => n === lower);
  if (idx >= 0) return BRANCHES[idx].id;
  // Tenta match parcial
  const partial = BRANCHES.find((b) => b.name.toLowerCase().includes(lower));
  return partial?.id ?? null;
}

// Mapeia status em português para enum
function mapStatus(value: string): string | null {
  const lower = value.trim().toLowerCase();
  if ((VALID_STATUSES as string[]).includes(value.trim().toUpperCase())) return value.trim().toUpperCase();
  const map: Record<string, string> = {
    'em uso': 'IN_USE', 'uso': 'IN_USE',
    'estoque': 'STOCK',
    'manutenção': 'MAINTENANCE', 'manutencao': 'MAINTENANCE',
    'baixado': 'RETIRED', 'desativado': 'RETIRED',
  };
  return map[lower] ?? null;
}

// Mapeia tipo de equipamento
function mapEquipmentType(value: string): string | null {
  const lower = value.trim().toLowerCase();
  if ((VALID_TYPES as string[]).includes(value.trim().toUpperCase())) return value.trim().toUpperCase();
  if (lower.includes('note') || lower.includes('lap')) return 'NOTEBOOK';
  if (lower.includes('desk')) return 'DESKTOP';
  return null;
}

// Mapeia tipo de armazenamento
function mapStorageType(value: string): string | null {
  const lower = value.trim().toLowerCase();
  if ((VALID_STORAGE as string[]).includes(value.trim().toUpperCase())) return value.trim().toUpperCase();
  if (lower.includes('nvme')) return 'SSD_NVME';
  if (lower.includes('ssd')) return 'SSD_SATA';
  if (lower.includes('hdd') || lower.includes('hard')) return 'HDD';
  return null;
}

interface ParsedRow {
  dto: CreateAssetDto;
  warnings: string[];
}

export const ImportPage: React.FC = () => {
  const { toast } = useToast();
  const { role } = useRBAC();
  const [mode, setMode] = useState<'update' | 'skip'>('skip');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSelectFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Planilha', extensions: ['xlsx', 'xls', 'csv'] }],
    });

    if (!selected) return;

    const filePath = typeof selected === 'string' ? selected : selected;
    setFileName(filePath);
    setResult(null);

    try {
      // Lê o arquivo via fetch (Tauri permite asset: protocol)
      const response = await fetch(`file://${filePath.replace(/\\/g, '/')}`);
      const buffer = await response.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      const rows: ParsedRow[] = [];
      const errors: string[] = [];

      // Processa todas as abas
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const lineNum = i + 2; // +2 por header + 0-indexed
          const warnings: string[] = [];

          // Tenta encontrar colunas (aceita variações de nome)
          const serviceTag = findColumn(row, ['service_tag', 'servicetag', 'service tag', 'tag']);
          const type_ = findColumn(row, ['equipment_type', 'tipo', 'tipo equipamento', 'tipoequipamento', 'type']);
          const status = findColumn(row, ['status']);
          const employee = findColumn(row, ['employee_name', 'colaborador', 'nome', 'employee', 'usuario']);
          const branch = findColumn(row, ['branch', 'filial', 'branch_id']);
          const ram = findColumn(row, ['ram_gb', 'ram', 'memoria', 'memória', 'ram(gb)']);
          const storageCapacity = findColumn(row, ['storage_capacity_gb', 'armazenamento', 'capacidade', 'armazcapacidade', 'capacidade armazenamento', 'capacidade armazenamento (gb)']);
          const storageType = findColumn(row, ['storage_type', 'tipo armazenamento', 'armaztipo', 'tipo armazenamento']);
          const os = findColumn(row, ['os', 'so', 'sistema', 'sistema operacional']);
          const cpu = findColumn(row, ['cpu', 'processador', 'processor']);
          const model = findColumn(row, ['model', 'modelo', 'equipment model']);
          const year = findColumn(row, ['year', 'ano', 'ano fabricacao', 'ano fabricação']);
          const notes = findColumn(row, ['notes', 'observações', 'observacoes', 'obs', 'observações']);

          if (!serviceTag) {
            errors.push(`Aba "${sheetName}", Linha ${lineNum}: Service Tag vazio`);
            continue;
          }

          const mappedType = mapEquipmentType(type_ || 'NOTEBOOK');
          const mappedStatus = mapStatus(status || 'STOCK');
          const mappedBranch = findBranchId(branch || '');
          const mappedStorage = mapStorageType(storageType || 'SSD_NVME');

          if (!mappedType) {
            errors.push(`Aba "${sheetName}", Linha ${lineNum}: Tipo inválido "${type_}"`);
            continue;
          }
          if (!mappedStatus) {
            errors.push(`Aba "${sheetName}", Linha ${lineNum}: Status inválido "${status}"`);
            continue;
          }
          if (!mappedBranch) {
            errors.push(`Aba "${sheetName}", Linha ${lineNum}: Filial não reconhecida "${branch}"`);
            continue;
          }

          if (mappedStatus === 'IN_USE' && !employee?.trim()) {
            warnings.push('Status "Em Uso" sem colaborador');
          }

          const ramNum = parseInt(ram || '0') || 0;
          const storageNum = parseStorageValue(storageCapacity || '0');

          rows.push({
            dto: {
              service_tag: serviceTag.trim().toUpperCase(),
              equipment_type: mappedType as 'NOTEBOOK' | 'DESKTOP',
              status: mappedStatus as 'IN_USE' | 'STOCK' | 'MAINTENANCE' | 'RETIRED',
              employee_name: employee?.trim() || null,
              branch_id: mappedBranch,
              ram_gb: ramNum,
              storage_capacity_gb: storageNum,
              storage_type: (mappedStorage || 'SSD_NVME') as 'SSD_SATA' | 'SSD_NVME' | 'HDD',
              os: os?.trim() || 'Windows 11',
              cpu: cpu?.trim() || '',
              model: model?.trim() || null,
              year: year ? (parseInt(year) || null) : null,
              notes: notes?.trim() || null,
              warranty_start: null,
              warranty_end: null,
            },
            warnings,
          });
        }
      }

      setParsedRows(rows);
      setParseErrors(errors);
      toast('info', `${rows.length} registro(s) lido(s) de ${wb.SheetNames.length} aba(s).`);
    } catch (e) {
      toast('error', `Falha ao ler arquivo: ${e}`);
    }
  }, [toast]);

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      const dtos = parsedRows.map((r) => r.dto);
      const res = await importarAtivos(dtos, mode, useAuthStore.getState().user?.name ?? 'sistema', role);
      setResult(res);
      toast(
        res.errors.length > 0 ? 'warning' : 'success',
        `Importação: ${res.created} criados, ${res.updated} atualizados, ${res.skipped} pulados.`,
      );
    } catch (e) {
      toast('error', `Falha na importação: ${e}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Importar Equipamentos
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Importe dados de uma planilha Excel (.xlsx) ou CSV. O sistema identifica as colunas automaticamente.
          </p>
        </div>

        {/* Seleção de arquivo */}
        <div className="space-y-3">
          <Button
            variant="secondary"
            icon={<Upload className="h-4 w-4" />}
            onClick={handleSelectFile}
          >
            Selecionar Arquivo
          </Button>
          {fileName && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="truncate">{fileName.split(/[/\\]/).pop()}</span>
            </div>
          )}
        </div>

        {/* Modo de duplicatas */}
        {parsedRows.length > 0 && (
          <Select
            label="Se Service Tag já existir:"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'update' | 'skip')}
            options={[
              { value: 'skip', label: 'Pular (manter existente)' },
              { value: 'update', label: 'Atualizar (sobrescrever)' },
            ]}
          />
        )}

        {/* Preview dos dados */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Preview ({parsedRows.length} registros)
            </h4>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Service Tag</th>
                    <th className="px-2 py-1.5 text-left">Tipo</th>
                    <th className="px-2 py-1.5 text-left">Status</th>
                    <th className="px-2 py-1.5 text-left">Filial</th>
                    <th className="px-2 py-1.5 text-left">Colaborador</th>
                    <th className="px-2 py-1.5 text-left">Avisos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedRows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-2 py-1 font-mono">{row.dto.service_tag}</td>
                      <td className="px-2 py-1">{row.dto.equipment_type}</td>
                      <td className="px-2 py-1">{row.dto.status}</td>
                      <td className="px-2 py-1">{BRANCHES.find((b) => b.id === row.dto.branch_id)?.name}</td>
                      <td className="px-2 py-1">{row.dto.employee_name || '—'}</td>
                      <td className="px-2 py-1">
                        {row.warnings.length > 0 && (
                          <span className="text-amber-600" title={row.warnings.join(', ')}>
                            <AlertTriangle className="h-3 w-3 inline" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 50 && (
                <p className="px-2 py-1 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                  ... e mais {parsedRows.length - 50} registro(s)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Erros de parse */}
        {parseErrors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
              {parseErrors.length} linha(s) ignorada(s):
            </p>
            <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5 max-h-32 overflow-y-auto">
              {parseErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Resultado da importação */}
        {result && (
          <div
            className={cn(
              'p-4 rounded-lg border',
              result.errors.length > 0
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={cn('h-5 w-5', result.errors.length > 0 ? 'text-amber-600' : 'text-green-600')} />
              <p className="font-medium text-sm">Importação Concluída</p>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div><span className="text-slate-500">Total:</span> <strong>{result.total}</strong></div>
              <div><span className="text-green-600">Criados:</span> <strong>{result.created}</strong></div>
              <div><span className="text-blue-600">Atualizados:</span> <strong>{result.updated}</strong></div>
              <div><span className="text-slate-500">Pulados:</span> <strong>{result.skipped}</strong></div>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600 space-y-0.5 max-h-24 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Botão de importação */}
        {parsedRows.length > 0 && !result && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              onClick={handleImport}
              loading={importing}
              icon={<Upload className="h-4 w-4" />}
              size="lg"
            >
              Importar {parsedRows.length} Registro(s)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helpers de parse

function findColumn(row: Record<string, string>, candidates: string[]): string {
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase().trim();
    if (candidates.some((c) => lower === c || lower.replace(/[_\s()-]/g, '') === c.replace(/[_\s()-]/g, ''))) {
      return row[key];
    }
  }
  return '';
}

function parseStorageValue(value: string): number {
  const clean = value.toLowerCase().replace(/[^0-9.tb]/g, '');
  const num = parseFloat(clean) || 0;
  if (value.toLowerCase().includes('tb') || (num > 0 && num <= 10)) {
    return Math.round(num * 1000);
  }
  return Math.round(num);
}
