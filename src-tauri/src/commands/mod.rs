use std::path::PathBuf;

use mysql::Pool;
use tauri::State;

use crate::db::models::*;
use crate::db::queries;

// ============================================================
// Estado global do app
// ============================================================

pub struct AppState {
    pub db: Pool,
    pub app_dir: PathBuf,
}

/// Helper para converter anyhow::Error em String (exigido pelo Tauri)
fn err(e: anyhow::Error) -> String {
    format!("{:#}", e)
}

// ============================================================
// Filiais
// ============================================================

#[tauri::command]
pub fn listar_filiais(state: State<'_, AppState>) -> Result<Vec<Branch>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_filiais(&mut conn).map_err(err)
}

// ============================================================
// Ativos — CRUD
// ============================================================

#[tauri::command]
pub fn listar_ativos(
    state: State<'_, AppState>,
    filtros: Option<AssetFilters>,
) -> Result<Vec<Asset>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_ativos(&mut conn, &filtros.unwrap_or_default()).map_err(err)
}

#[tauri::command]
pub fn obter_ativo(state: State<'_, AppState>, id: String) -> Result<Asset, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::obter_ativo(&mut conn, &id).map_err(err)
}

#[tauri::command]
pub fn criar_ativo(state: State<'_, AppState>, dados: CreateAssetDto) -> Result<Asset, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_ativo(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn atualizar_ativo(
    state: State<'_, AppState>,
    id: String,
    dados: UpdateAssetDto,
) -> Result<Asset, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::atualizar_ativo(&mut conn, &id, &dados).map_err(err)
}

#[tauri::command]
pub fn excluir_ativo(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::excluir_ativo(&mut conn, &id).map_err(err)
}

// ============================================================
// Dashboard
// ============================================================

#[tauri::command]
pub fn obter_dados_dashboard(
    state: State<'_, AppState>,
    branch_id: Option<String>,
) -> Result<DashboardData, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::obter_dados_dashboard(&mut conn, branch_id.as_deref()).map_err(err)
}

// ============================================================
// Exportação
// ============================================================

#[tauri::command]
pub fn listar_ativos_para_exportacao(
    state: State<'_, AppState>,
    branch_ids: Option<Vec<String>>,
) -> Result<Vec<Asset>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_ativos_para_exportacao(&mut conn, branch_ids.as_deref()).map_err(err)
}

// ============================================================
// Auditoria
// ============================================================

#[tauri::command]
pub fn listar_auditoria(
    state: State<'_, AppState>,
    asset_id: Option<String>,
) -> Result<Vec<AuditEntry>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_auditoria(&mut conn, asset_id.as_deref()).map_err(err)
}

// ============================================================
// Importação em lote
// ============================================================

#[tauri::command]
pub fn importar_ativos(
    state: State<'_, AppState>,
    ativos: Vec<CreateAssetDto>,
    modo: String,
) -> Result<queries::ImportResult, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::importar_ativos(&mut conn, &ativos, &modo).map_err(err)
}

// ============================================================
// Backup / Restore
// ============================================================

#[tauri::command]
pub fn criar_backup(state: State<'_, AppState>, destino: String) -> Result<String, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_backup(&mut conn, &destino).map_err(err)
}

#[tauri::command]
pub fn restaurar_backup(state: State<'_, AppState>, origem: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::restaurar_backup(&mut conn, &origem).map_err(err)
}

// ============================================================
// Movimentações de equipamentos
// ============================================================

#[tauri::command]
pub fn atribuir_equipamento(
    state: State<'_, AppState>,
    dados: AssignDto,
) -> Result<Movement, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::atribuir_equipamento(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn reatribuir_equipamento(
    state: State<'_, AppState>,
    dados: AssignDto,
) -> Result<Movement, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::reatribuir_equipamento(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn devolver_equipamento(
    state: State<'_, AppState>,
    dados: ReturnDto,
) -> Result<Movement, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::devolver_equipamento(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn trocar_equipamentos(
    state: State<'_, AppState>,
    dados: SwapDto,
) -> Result<Vec<Movement>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::trocar_equipamentos(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn listar_movimentos(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<Movement>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_movimentos(&mut conn, limit).map_err(err)
}

#[tauri::command]
pub fn listar_ativos_em_estoque(state: State<'_, AppState>) -> Result<Vec<Asset>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_ativos_em_estoque(&mut conn).map_err(err)
}

#[tauri::command]
pub fn listar_ativos_em_uso(state: State<'_, AppState>) -> Result<Vec<Asset>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_ativos_em_uso(&mut conn).map_err(err)
}

// ============================================================
// Configurações + Backup automático
// ============================================================

#[tauri::command]
pub fn verificar_backup_automatico(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::verificar_backup_automatico(&state.app_dir, &mut conn).map_err(err)
}

#[tauri::command]
pub fn obter_configuracao(
    state: State<'_, AppState>,
    chave: String,
) -> Result<Option<String>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::obter_configuracao(&mut conn, &chave).map_err(err)
}

// ============================================================
// Movimentações por ativo
// ============================================================

#[tauri::command]
pub fn listar_movimentos_por_ativo(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Vec<Movement>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_movimentos_por_ativo(&mut conn, &asset_id).map_err(err)
}

// ============================================================
// Colaboradores
// ============================================================

#[tauri::command]
pub fn listar_colaboradores(
    state: State<'_, AppState>,
    search: Option<String>,
    branch_id: Option<String>,
) -> Result<Vec<Employee>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_colaboradores(&mut conn, search.as_deref(), branch_id.as_deref(), true).map_err(err)
}

#[tauri::command]
pub fn criar_colaborador(
    state: State<'_, AppState>,
    name: String,
    branch_id: Option<String>,
) -> Result<Employee, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_colaborador(&mut conn, &name, branch_id.as_deref()).map_err(err)
}

// ============================================================
// Manutenção
// ============================================================

#[tauri::command]
pub fn enviar_para_manutencao(
    state: State<'_, AppState>,
    dados: SendMaintenanceDto,
) -> Result<MaintenanceRecord, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::enviar_para_manutencao(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn retornar_de_manutencao(
    state: State<'_, AppState>,
    dados: ReturnMaintenanceDto,
) -> Result<MaintenanceRecord, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::retornar_de_manutencao(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn listar_manutencoes(
    state: State<'_, AppState>,
    status_filter: Option<String>,
) -> Result<Vec<MaintenanceRecord>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_manutencoes(&mut conn, status_filter.as_deref()).map_err(err)
}

// ============================================================
// Operações em lote
// ============================================================

#[tauri::command]
pub fn devolver_em_lote(
    state: State<'_, AppState>,
    asset_ids: Vec<String>,
    reason: String,
) -> Result<Vec<Movement>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::devolver_em_lote(&mut conn, &asset_ids, &reason).map_err(err)
}

#[tauri::command]
pub fn baixar_em_lote(
    state: State<'_, AppState>,
    asset_ids: Vec<String>,
    reason: String,
) -> Result<usize, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::baixar_em_lote(&mut conn, &asset_ids, &reason).map_err(err)
}

// ============================================================
// Log de acesso
// ============================================================

#[tauri::command]
pub fn registrar_acesso(state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::registrar_acesso(&mut conn).map_err(err)
}

// ============================================================
// Notebooks de treinamento
// ============================================================

#[tauri::command]
pub fn listar_notebooks_treinamento(state: State<'_, AppState>) -> Result<Vec<Asset>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_notebooks_treinamento(&mut conn).map_err(err)
}

#[tauri::command]
pub fn marcar_como_treinamento(
    state: State<'_, AppState>,
    asset_id: String,
    is_training: bool,
) -> Result<Asset, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::marcar_como_treinamento(&mut conn, &asset_id, is_training).map_err(err)
}

// ============================================================
// Validação de Service Tag
// ============================================================

#[tauri::command]
pub fn verificar_service_tag(
    state: State<'_, AppState>,
    tag: String,
    exclude_id: Option<String>,
) -> Result<bool, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::verificar_service_tag_existe(&mut conn, &tag, exclude_id.as_deref()).map_err(err)
}

// ============================================================
// Alertas de garantia
// ============================================================

#[tauri::command]
pub fn listar_alertas_garantia(
    state: State<'_, AppState>,
    dias: Option<i64>,
) -> Result<Vec<WarrantyAlert>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_alertas_garantia(&mut conn, dias.unwrap_or(90)).map_err(err)
}

// ============================================================
// Anexos (fotos/documentos)
// ============================================================

#[tauri::command]
pub fn criar_anexo(
    state: State<'_, AppState>,
    asset_id: String,
    source_path: String,
) -> Result<AssetAttachment, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;

    let attachments_dir = state.app_dir.join("attachments");
    std::fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Falha ao criar diretório de anexos: {}", e))?;

    let source = std::path::Path::new(&source_path);
    let ext = source.extension().and_then(|e| e.to_str()).unwrap_or("bin");
    let filename = source.file_name().and_then(|n| n.to_str()).unwrap_or("arquivo");
    let dest_name = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    let dest_path = attachments_dir.join(&dest_name);

    std::fs::copy(&source, &dest_path)
        .map_err(|e| format!("Falha ao copiar arquivo: {}", e))?;

    let file_type = match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" => "image",
        "pdf" => "pdf",
        _ => "other",
    };

    queries::criar_anexo(&mut conn, &asset_id, filename, dest_path.to_str().unwrap_or(""), file_type).map_err(err)
}

#[tauri::command]
pub fn listar_anexos(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Vec<AssetAttachment>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_anexos(&mut conn, &asset_id).map_err(err)
}

#[tauri::command]
pub fn excluir_anexo(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    let filepath = queries::excluir_anexo(&mut conn, &id).map_err(err)?;
    let _ = std::fs::remove_file(&filepath);
    Ok(())
}

// ============================================================
// Custos de manutenção
// ============================================================

#[tauri::command]
pub fn obter_custos_manutencao(
    state: State<'_, AppState>,
    inicio: Option<String>,
    fim: Option<String>,
) -> Result<Vec<MaintenanceCostSummary>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::obter_custos_manutencao(&mut conn, inicio.as_deref(), fim.as_deref()).map_err(err)
}

// ============================================================
// Notificações
// ============================================================

#[tauri::command]
pub fn contar_notificacoes(state: State<'_, AppState>) -> Result<NotificationCounts, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::contar_notificacoes(&mut conn).map_err(err)
}

// ============================================================
// Autenticação
// ============================================================

#[tauri::command]
pub fn autenticar_usuario(
    state: State<'_, AppState>,
    dados: LoginDto,
) -> Result<User, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::autenticar_usuario(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn criar_usuario(
    state: State<'_, AppState>,
    dados: CreateUserDto,
) -> Result<User, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_usuario(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn listar_usuarios(state: State<'_, AppState>) -> Result<Vec<User>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_usuarios(&mut conn).map_err(err)
}

#[tauri::command]
pub fn alterar_senha(
    state: State<'_, AppState>,
    dados: ChangePasswordDto,
) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::alterar_senha(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn desativar_usuario(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::desativar_usuario(&mut conn, &id).map_err(err)
}

// ============================================================
// Utilitário
// ============================================================

#[tauri::command]
pub fn escrever_arquivo(caminho: String, dados: Vec<u8>) -> Result<(), String> {
    std::fs::write(&caminho, &dados).map_err(|e| format!("Falha ao salvar arquivo: {}", e))
}

// ============================================================
// Verificação de conexão
// ============================================================

#[tauri::command]
pub fn verificar_conexao(state: State<'_, AppState>) -> Result<bool, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::verificar_conexao(&mut conn)
}
