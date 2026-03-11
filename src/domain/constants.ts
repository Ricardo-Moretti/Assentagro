// ============================================================
// AssetAgro — Constantes do Domínio
// Filiais fixas, opções de dropdowns, mapeamentos de status/cores
// ============================================================

import type { Branch, EquipmentType, AssetStatus, StorageType, MovementType } from './models';

// 16 filiais fixas (IDs sincronizados com seed SQL)
export const BRANCHES: Branch[] = [
  { id: 'br-araraquara', name: 'Araraquara' },
  { id: 'br-barretos', name: 'Barretos' },
  { id: 'br-bebedouro', name: 'Bebedouro' },
  { id: 'br-catanduva', name: 'Catanduva' },
  { id: 'br-franca', name: 'Franca' },
  { id: 'br-guaira', name: 'Guairá' },
  { id: 'br-itapolis', name: 'Itápolis' },
  { id: 'br-ituverava', name: 'Ituverava' },
  { id: 'br-jales', name: 'Jales' },
  { id: 'br-marilia', name: 'Marília' },
  { id: 'br-montealto', name: 'Monte Alto' },
  { id: 'br-orlandia', name: 'Orlândia' },
  { id: 'br-ribeirao', name: 'Ribeirão' },
  { id: 'br-riopreto', name: 'Rio Preto' },
  { id: 'br-tupa', name: 'Tupã' },
  { id: 'br-votuporanga', name: 'Votuporanga' },
];

export const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: 'NOTEBOOK', label: 'Notebook' },
  { value: 'DESKTOP', label: 'Desktop' },
];

export const ASSET_STATUSES: {
  value: AssetStatus;
  label: string;
  color: string;
  bgColor: string;
}[] = [
  {
    value: 'IN_USE',
    label: 'Em Uso',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    value: 'STOCK',
    label: 'Estoque',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    value: 'MAINTENANCE',
    label: 'Manutenção',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    value: 'RETIRED',
    label: 'Baixado',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800/50',
  },
];

export const STORAGE_TYPES: { value: StorageType; label: string }[] = [
  { value: 'SSD_NVME', label: 'SSD NVMe' },
  { value: 'SSD_SATA', label: 'SSD SATA' },
  { value: 'HDD', label: 'HDD' },
];

export const RAM_OPTIONS: number[] = [4, 8, 12, 16, 24, 32, 64];

export const STORAGE_CAPACITY_OPTIONS: { value: number; label: string }[] = [
  { value: 256, label: '256 GB' },
  { value: 500, label: '500 GB' },
  { value: 1000, label: '1 TB' },
];

export const OS_OPTIONS: string[] = [
  'Windows 10',
  'Windows 11',
  'Linux',
  'Outro',
];

// Mapeamento de labels para exibição
export const STATUS_LABEL: Record<AssetStatus, string> = {
  IN_USE: 'Em Uso',
  STOCK: 'Estoque',
  MAINTENANCE: 'Manutenção',
  RETIRED: 'Baixado',
};

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
  NOTEBOOK: 'Notebook',
  DESKTOP: 'Desktop',
};

export const STORAGE_TYPE_LABEL: Record<StorageType, string> = {
  SSD_SATA: 'SSD SATA',
  SSD_NVME: 'SSD NVMe',
  HDD: 'HDD',
};

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  ASSIGN: 'Atribuição',
  RETURN: 'Devolução',
  SWAP: 'Troca',
};

export const RETURN_REASONS = [
  'Desligamento',
  'Devolução',
  'Manutenção',
  'Outro',
];

// Helper para buscar nome da filial pelo ID
export function getBranchName(branchId: string): string {
  return BRANCHES.find((b) => b.id === branchId)?.name ?? branchId;
}
