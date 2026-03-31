use serde::{Deserialize, Serialize};

// ============================================================
// Entidades principais
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Branch {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: String,
    pub service_tag: String,
    pub equipment_type: String,
    pub status: String,
    pub employee_name: Option<String>,
    pub branch_id: String,
    pub branch_name: Option<String>,
    pub ram_gb: i64,
    pub storage_capacity_gb: i64,
    pub storage_type: String,
    pub os: String,
    pub cpu: String,
    pub model: String,
    pub year: Option<i64>,
    pub notes: String,
    pub is_training: bool,
    pub warranty_start: Option<String>,
    pub warranty_end: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeletedAsset {
    pub id: String,
    pub service_tag: String,
    pub equipment_type: String,
    pub employee_name: Option<String>,
    pub branch_name: Option<String>,
    pub model: String,
    pub deleted_at: String,
    pub deleted_by: String,
}

// ============================================================
// DTOs (enviados pelo frontend)
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAssetDto {
    pub service_tag: String,
    pub equipment_type: String,
    pub status: String,
    pub employee_name: Option<String>,
    pub branch_id: String,
    pub ram_gb: i64,
    pub storage_capacity_gb: i64,
    pub storage_type: String,
    pub os: String,
    pub cpu: String,
    pub model: Option<String>,
    pub year: Option<i64>,
    pub notes: Option<String>,
    pub warranty_start: Option<String>,
    pub warranty_end: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAssetDto {
    pub service_tag: Option<String>,
    pub equipment_type: Option<String>,
    pub status: Option<String>,
    pub employee_name: Option<String>,
    pub branch_id: Option<String>,
    pub ram_gb: Option<i64>,
    pub storage_capacity_gb: Option<i64>,
    pub storage_type: Option<String>,
    pub os: Option<String>,
    pub cpu: Option<String>,
    pub model: Option<String>,
    pub year: Option<i64>,
    pub notes: Option<String>,
    pub warranty_start: Option<String>,
    pub warranty_end: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AssetFilters {
    pub search: Option<String>,
    pub branch_id: Option<String>,
    pub equipment_type: Option<String>,
    pub status: Option<String>,
    pub ram_gb: Option<i64>,
    pub storage_type: Option<String>,
    pub os: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}

// ============================================================
// Dashboard — structs de agregação
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total: i64,
    pub in_use: i64,
    pub stock: i64,
    pub maintenance: i64,
    pub retired: i64,
    pub notebooks: i64,
    pub desktops: i64,
    pub in_use_no_employee: i64,
    pub training: i64,
    pub maintenance_total_cost: f64,
    pub avg_maintenance_days: f64,
    pub assets_per_employee: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchCount {
    pub branch_id: String,
    pub branch_name: String,
    pub total: i64,
    pub in_use: i64,
    pub stock: i64,
    pub maintenance: i64,
    pub retired: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupCount {
    pub label: String,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardData {
    pub stats: DashboardStats,
    pub by_branch: Vec<BranchCount>,
    pub by_os: Vec<GroupCount>,
    pub by_ram: Vec<GroupCount>,
    pub by_storage_type: Vec<GroupCount>,
    pub by_month: Vec<TrendPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendPoint {
    pub period: String,
    pub count: i64,
}

// ============================================================
// Auditoria
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub asset_id: String,
    pub changed_at: String,
    pub changes_json: String,
    pub changed_by: Option<String>,
}

// ============================================================
// Movimentações
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Movement {
    pub id: String,
    pub asset_id: String,
    pub service_tag: String,
    pub movement_type: String,
    pub from_employee: Option<String>,
    pub to_employee: Option<String>,
    pub from_status: String,
    pub to_status: String,
    pub reason: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignDto {
    pub asset_id: String,
    pub to_employee: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReturnDto {
    pub asset_id: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapDto {
    pub asset_id_a: String,
    pub asset_id_b: String,
    pub reason: String,
}

// ============================================================
// Colaboradores
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Employee {
    pub id: String,
    pub name: String,
    pub branch_id: Option<String>,
    pub active: bool,
    pub created_at: String,
}

// ============================================================
// Manutenção
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceRecord {
    pub id: String,
    pub asset_id: String,
    pub service_tag: Option<String>,
    pub supplier: String,
    pub expected_return_date: Option<String>,
    pub cost: f64,
    pub notes: String,
    pub sent_at: String,
    pub returned_at: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMaintenanceDto {
    pub asset_id: String,
    pub supplier: String,
    pub expected_return_date: Option<String>,
    pub cost: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReturnMaintenanceDto {
    pub maintenance_id: String,
    pub cost: Option<f64>,
    pub notes: Option<String>,
}

// ============================================================
// Anexos
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetAttachment {
    pub id: String,
    pub asset_id: String,
    pub filename: String,
    pub filepath: String,
    pub file_type: String,
    pub created_at: String,
}

// ============================================================
// Alertas e Notificações
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WarrantyAlert {
    pub asset_id: String,
    pub service_tag: String,
    pub branch_name: Option<String>,
    pub warranty_end: String,
    pub days_remaining: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationCounts {
    pub maintenance_open: i64,
    pub aging_count: i64,
    pub warranty_expiring: i64,
    pub desligados_aguardando: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceCostSummary {
    pub supplier: String,
    pub branch_name: Option<String>,
    pub total_cost: f64,
    pub count: i64,
}

// ============================================================
// Autenticação
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub name: String,
    pub role: String,
    pub active: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LoginDto {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateUserDto {
    pub username: String,
    pub password: String,
    pub name: String,
    pub role: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChangePasswordDto {
    pub user_id: String,
    pub new_password: String,
}

// ============================================================
// Empréstimos / Retiradas
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetLoan {
    pub id: String,
    pub asset_id: String,
    pub tipo: String,          // EMPRESTIMO | MANUTENCAO
    pub responsavel: String,
    pub contato: Option<String>,
    pub destino: String,
    pub destino_branch_id: Option<String>,
    pub data_saida: String,
    pub previsao_retorno: Option<String>,
    pub data_retorno: Option<String>,
    pub status: String,        // ATIVO | DEVOLVIDO | ATRASADO
    pub observacoes: String,
    pub registrado_por: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    // joined
    pub service_tag: Option<String>,
    pub asset_model: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateLoanDto {
    pub asset_id: String,
    pub tipo: String,
    pub responsavel: String,
    pub contato: Option<String>,
    pub destino: String,
    pub destino_branch_id: Option<String>,
    pub data_saida: String,
    pub previsao_retorno: Option<String>,
    pub observacoes: Option<String>,
    pub registrado_por: Option<String>,
}

// ============================================================
// Descarte de equipamentos
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Descarte {
    pub id: String,
    pub asset_id: String,
    pub service_tag: Option<String>,
    pub asset_model: Option<String>,
    pub branch_name: Option<String>,
    pub equipment_type: Option<String>,
    pub year: Option<i64>,
    pub motivo: String,       // OBSOLESCENCIA | DEFEITO_IRREPARAVEL | FURTO | PERDA | DOACAO | VENDA | OUTRO
    pub destino: String,
    pub responsavel: String,
    pub data_prevista: Option<String>,
    pub data_conclusao: Option<String>,
    pub status: String,       // PENDENTE | CONCLUIDO | CANCELADO
    pub observacoes: String,
    pub registrado_por: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateDescarteDto {
    pub asset_id: String,
    pub motivo: String,
    pub destino: String,
    pub responsavel: String,
    pub data_prevista: Option<String>,
    pub observacoes: Option<String>,
    pub registrado_por: Option<String>,
}

// ============================================================
// Desligamento de colaboradores
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Desligamento {
    pub id: String,
    pub asset_id: String,
    pub employee_name: String,
    pub service_tag: Option<String>,
    pub equipment_type: Option<String>,
    pub model: Option<String>,
    pub branch_name: Option<String>,
    pub data_desligamento: String,
    pub data_devolucao: Option<String>,
    pub status: String,        // AGUARDANDO | DEVOLVIDO | CANCELADO
    pub observacoes: String,
    pub registrado_por: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct CreateDesligamentoDto {
    pub asset_id: String,
    #[serde(default)]
    pub observacoes: Option<String>,
    #[serde(default)]
    pub registrado_por: Option<String>,
}

// ============================================================
// Observações
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Nota {
    pub id: String,
    pub titulo: String,
    pub corpo: String,
    pub categoria: String,  // GERAL | TI | REUNIAO | ALERTA | OUTRO
    pub autor: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateNotaDto {
    pub titulo: String,
    pub corpo: String,
    pub categoria: String,
    pub autor: String,
}

// ============================================================
// Termos de responsabilidade
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Termo {
    pub id: String,
    pub colaborador_id: Option<String>,
    pub colaborador_nome: String,
    pub colaborador_email: Option<String>,
    pub tipo: String,           // ENTREGA | DEVOLUCAO | TROCA
    pub status: String,         // PENDENTE | GERADO | ENVIADO | ASSINADO | RECUSADO
    pub responsavel: String,
    pub observacoes: Option<String>,
    pub arquivo_gerado: Option<String>,
    pub arquivo_assinado: Option<String>,
    pub d4sign_uuid: Option<String>,
    pub d4sign_status: Option<String>,
    pub d4sign_enviado_em: Option<String>,
    pub data_geracao: String,
    pub data_assinatura: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    // Joined: ativos vinculados
    pub ativos: Option<Vec<TermoAtivo>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TermoAtivo {
    pub id: String,
    pub termo_id: String,
    pub asset_id: String,
    pub service_tag: Option<String>,
    pub equipment_type: Option<String>,
    pub model: Option<String>,
    pub branch_name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTermoDto {
    pub colaborador_id: Option<String>,
    pub colaborador_nome: String,
    pub colaborador_email: Option<String>,
    pub asset_ids: Vec<String>,
    pub tipo: String,
    pub responsavel: String,
    pub observacoes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTermoDto {
    pub status: Option<String>,
    pub arquivo_gerado: Option<String>,
    pub arquivo_assinado: Option<String>,
    pub d4sign_uuid: Option<String>,
    pub d4sign_status: Option<String>,
    pub d4sign_enviado_em: Option<String>,
    pub data_assinatura: Option<String>,
    pub observacoes: Option<String>,
}

// ============================================================
// Configuração D4Sign
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct D4SignConfig {
    pub habilitado: bool,
    pub token_api: String,
    pub crypt_key: String,
    pub cofre_uuid: String,
    pub base_url: String,
    pub envio_automatico: bool,
    pub mensagem_email: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SaveD4SignConfigDto {
    pub habilitado: bool,
    pub token_api: String,
    pub crypt_key: String,
    pub cofre_uuid: String,
    pub base_url: Option<String>,
    pub envio_automatico: bool,
    pub mensagem_email: Option<String>,
}
