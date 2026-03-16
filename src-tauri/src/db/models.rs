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
