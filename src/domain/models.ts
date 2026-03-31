// ============================================================
// AssetAgro — Tipos do Domínio
// Espelham as structs Rust (campos em snake_case para Tauri invoke)
// ============================================================

export type EquipmentType = 'NOTEBOOK' | 'DESKTOP';
export type AssetStatus = 'IN_USE' | 'STOCK' | 'MAINTENANCE' | 'RETIRED';
export type StorageType = 'SSD_SATA' | 'SSD_NVME' | 'HDD';
export type Theme = 'light' | 'dark' | 'system';

export type MovementType = 'ASSIGN' | 'RETURN' | 'SWAP';

export type AppView =
  | 'dashboard'
  | 'assets-list'
  | 'asset-new'
  | 'asset-edit'
  | 'asset-detail'
  | 'export'
  | 'import'
  | 'movements'
  | 'audit'
  | 'training'
  | 'loans'
  | 'notes'
  | 'users'
  | 'settings'
  | 'help'
  | 'disposal'
  | 'desligados'
  | 'trash'
  | 'termos'
  | 'd4sign-config';

export interface Branch {
  id: string;
  name: string;
}

export interface Asset {
  id: string;
  service_tag: string;
  equipment_type: EquipmentType;
  status: AssetStatus;
  employee_name: string | null;
  branch_id: string;
  branch_name: string | null;
  ram_gb: number;
  storage_capacity_gb: number;
  storage_type: StorageType;
  os: string;
  cpu: string;
  model: string;
  year: number | null;
  notes: string;
  is_training: boolean;
  warranty_start: string | null;
  warranty_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeletedAsset {
  id: string;
  service_tag: string;
  equipment_type: string;
  employee_name: string | null;
  branch_name: string | null;
  model: string;
  deleted_at: string;
  deleted_by: string;
}

export interface CreateAssetDto {
  service_tag: string;
  equipment_type: EquipmentType;
  status: AssetStatus;
  employee_name: string | null;
  branch_id: string;
  ram_gb: number;
  storage_capacity_gb: number;
  storage_type: StorageType;
  os: string;
  cpu: string;
  model: string | null;
  year: number | null;
  notes: string | null;
  warranty_start: string | null;
  warranty_end: string | null;
}

export type UpdateAssetDto = Partial<CreateAssetDto>;

export interface AssetFilters {
  search?: string;
  branch_id?: string;
  equipment_type?: EquipmentType;
  status?: AssetStatus;
  ram_gb?: number;
  storage_type?: StorageType;
  os?: string;
  sort_by?: string;
  sort_dir?: 'ASC' | 'DESC';
}

// Dashboard
export interface DashboardStats {
  total: number;
  in_use: number;
  stock: number;
  maintenance: number;
  retired: number;
  notebooks: number;
  desktops: number;
  in_use_no_employee: number;
  training: number;
  maintenance_total_cost: number;
  avg_maintenance_days: number;
  assets_per_employee: number;
}

export interface BranchCount {
  branch_id: string;
  branch_name: string;
  total: number;
  in_use: number;
  stock: number;
  maintenance: number;
  retired: number;
}

export interface GroupCount {
  label: string;
  total: number;
}

export interface TrendPoint {
  period: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  by_branch: BranchCount[];
  by_os: GroupCount[];
  by_ram: GroupCount[];
  by_storage_type: GroupCount[];
  by_month: TrendPoint[];
}

// Auditoria
export interface AuditEntry {
  id: string;
  asset_id: string;
  changed_at: string;
  changes_json: string;
  changed_by?: string | null;
}

// Movimentações
export interface Movement {
  id: string;
  asset_id: string;
  service_tag: string;
  movement_type: MovementType;
  from_employee: string | null;
  to_employee: string | null;
  from_status: string;
  to_status: string;
  reason: string;
  created_at: string;
}

export interface AssignDto {
  asset_id: string;
  to_employee: string;
  reason: string;
}

export interface ReturnDto {
  asset_id: string;
  reason: string;
}

export interface SwapDto {
  asset_id_a: string;
  asset_id_b: string;
  reason: string;
}

// Importação
export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Colaboradores
export interface Employee {
  id: string;
  name: string;
  branch_id: string | null;
  active: boolean;
  created_at: string;
}

// Manutenção
export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  service_tag?: string;
  supplier: string;
  expected_return_date: string | null;
  cost: number;
  notes: string;
  sent_at: string;
  returned_at: string | null;
  status: 'OPEN' | 'CLOSED';
}

export interface SendMaintenanceDto {
  asset_id: string;
  supplier: string;
  expected_return_date?: string;
  cost?: number;
  notes?: string;
}

export interface ReturnMaintenanceDto {
  maintenance_id: string;
  cost?: number;
  notes?: string;
}

// Anexos
export interface AssetAttachment {
  id: string;
  asset_id: string;
  filename: string;
  filepath: string;
  file_type: string;
  created_at: string;
}

// Alertas de garantia
export interface WarrantyAlert {
  asset_id: string;
  service_tag: string;
  branch_name: string | null;
  warranty_end: string;
  days_remaining: number;
}

// Notificações
export interface NotificationCounts {
  maintenance_open: number;
  aging_count: number;
  warranty_expiring: number;
  desligados_aguardando: number;
}

// Custos de manutenção
export interface MaintenanceCostSummary {
  supplier: string;
  branch_name: string | null;
  total_cost: number;
  count: number;
}

// Autenticação
export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  active: boolean;
  created_at: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface CreateUserDto {
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

export interface ChangePasswordDto {
  user_id: string;
  new_password: string;
}

// Empréstimos / Retiradas
export type LoanTipo = 'EMPRESTIMO' | 'MANUTENCAO';
export type LoanStatus = 'ATIVO' | 'DEVOLVIDO' | 'ATRASADO';

export interface AssetLoan {
  id: string;
  asset_id: string;
  tipo: LoanTipo;
  responsavel: string;
  contato: string | null;
  destino: string;
  destino_branch_id: string | null;
  data_saida: string;
  previsao_retorno: string | null;
  data_retorno: string | null;
  status: LoanStatus;
  observacoes: string;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
  // joined
  service_tag: string | null;
  asset_model: string | null;
}

export interface CreateLoanDto {
  asset_id: string;
  tipo: LoanTipo;
  responsavel: string;
  contato?: string;
  destino: string;
  destino_branch_id?: string;
  data_saida: string;
  previsao_retorno?: string;
  observacoes?: string;
  registrado_por?: string;
}

// Desligamento de colaboradores
export type DesligamentoStatus = 'AGUARDANDO' | 'DEVOLVIDO' | 'CANCELADO';

export interface Desligamento {
  id: string;
  asset_id: string;
  employee_name: string;
  service_tag: string | null;
  equipment_type: string | null;
  model: string | null;
  branch_name: string | null;
  data_desligamento: string;
  data_devolucao: string | null;
  status: DesligamentoStatus;
  observacoes: string;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDesligamentoDto {
  asset_id: string;
  observacoes?: string;
  registrado_por?: string;
}

// Descarte
export type DescarteMotivo =
  | 'OBSOLESCENCIA'
  | 'DEFEITO_IRREPARAVEL'
  | 'FURTO'
  | 'PERDA'
  | 'DOACAO'
  | 'VENDA'
  | 'OUTRO';

export type DescarteStatus = 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO';

export interface Descarte {
  id: string;
  asset_id: string;
  service_tag: string | null;
  asset_model: string | null;
  branch_name: string | null;
  equipment_type: string | null;
  year: number | null;
  motivo: DescarteMotivo;
  destino: string;
  responsavel: string;
  data_prevista: string | null;
  data_conclusao: string | null;
  status: DescarteStatus;
  observacoes: string;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDescarteDto {
  asset_id: string;
  motivo: DescarteMotivo;
  destino: string;
  responsavel: string;
  data_prevista?: string;
  observacoes?: string;
  registrado_por?: string;
}

// Observações
export type NotaCategoria = 'GERAL' | 'TI' | 'REUNIAO' | 'ALERTA' | 'OUTRO';

export interface Nota {
  id: string;
  titulo: string;
  corpo: string;
  categoria: NotaCategoria;
  autor: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotaDto {
  titulo: string;
  corpo: string;
  categoria: NotaCategoria;
  autor: string;
}

// ============================================================
// Termos de responsabilidade
// ============================================================

export type TipoTermo = 'ENTREGA' | 'DEVOLUCAO' | 'TROCA';
export type StatusTermo = 'PENDENTE' | 'GERADO' | 'ENVIADO' | 'ASSINADO' | 'RECUSADO';

export interface TermoAtivo {
  id: string;
  termo_id: string;
  asset_id: string;
  service_tag?: string;
  equipment_type?: string;
  model?: string;
  branch_name?: string;
  created_at: string;
}

export interface Termo {
  id: string;
  colaborador_id?: string;
  colaborador_nome: string;
  colaborador_email?: string;
  tipo: TipoTermo;
  status: StatusTermo;
  responsavel: string;
  observacoes?: string;
  arquivo_gerado?: string;
  arquivo_assinado?: string;
  d4sign_uuid?: string;
  d4sign_status?: string;
  d4sign_enviado_em?: string;
  data_geracao: string;
  data_assinatura?: string;
  created_at: string;
  updated_at: string;
  ativos?: TermoAtivo[];
}

export interface CreateTermoDto {
  colaborador_id?: string;
  colaborador_nome: string;
  colaborador_email?: string;
  asset_ids: string[];
  tipo: TipoTermo;
  responsavel: string;
  observacoes?: string;
}

export interface UpdateTermoDto {
  status?: StatusTermo;
  arquivo_gerado?: string;
  arquivo_assinado?: string;
  d4sign_uuid?: string;
  d4sign_status?: string;
  d4sign_enviado_em?: string;
  data_assinatura?: string;
  observacoes?: string;
}

// ============================================================
// Configuração D4Sign
// ============================================================

export interface D4SignConfig {
  habilitado: boolean;
  token_api: string;
  crypt_key: string;
  cofre_uuid: string;
  base_url: string;
  envio_automatico: boolean;
  mensagem_email?: string;
  updated_at: string;
}

export interface SaveD4SignConfigDto {
  habilitado: boolean;
  token_api: string;
  crypt_key: string;
  cofre_uuid: string;
  base_url?: string;
  envio_automatico: boolean;
  mensagem_email?: string;
}
