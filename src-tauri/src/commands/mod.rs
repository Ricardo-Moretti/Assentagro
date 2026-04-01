use std::path::PathBuf;

use mysql::{Pool, prelude::Queryable};
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

/// Verifica se o usuario tem role admin consultando o banco.
/// Aceita role do frontend apenas como fallback; valida pelo username quando possível.
fn exigir_admin_db(conn: &mut mysql::PooledConn, usuario: &str, role_frontend: &str) -> Result<(), String> {
    // Tentar buscar role real do banco pelo username/name
    let role_db: Option<String> = conn.exec_first(
        "SELECT role FROM users WHERE (username = ? OR name = ?) AND active = 1 LIMIT 1",
        (usuario, usuario),
    ).unwrap_or(None);

    let role_efetivo = role_db.as_deref().unwrap_or(role_frontend);

    if role_efetivo != "admin" {
        return Err("Acesso negado: esta operacao requer permissao de administrador.".to_string());
    }
    Ok(())
}

/// Monta URL da API D4Sign com autenticacao via query params.
/// Usa reqwest::Url para evitar que tokens apareçam em format strings/logs.
/// Monta URL da API D4Sign com autenticacao. Retorna String para compatibilidade com reqwest.
fn d4sign_url(config: &D4SignConfig, path: &str) -> Result<String, String> {
    let base = format!("{}/{}", config.base_url.trim_end_matches('/'), path.trim_start_matches('/'));
    let mut url = reqwest::Url::parse(&base).map_err(|e| format!("URL invalida: {}", e))?;
    url.query_pairs_mut()
        .append_pair("tokenAPI", &config.token_api)
        .append_pair("cryptKey", &config.crypt_key);
    Ok(url.to_string())
}

/// Valida que um caminho de arquivo esta dentro do diretorio seguro do app.
fn validar_path_seguro(caminho: &str, app_dir: &std::path::Path) -> Result<std::path::PathBuf, String> {
    let path = std::path::Path::new(caminho);
    let canonical = if path.exists() {
        path.canonicalize().map_err(|e| format!("Path invalido: {}", e))?
    } else {
        // Se nao existe ainda, verificar que o parent e valido
        let parent = path.parent().ok_or("Path sem diretorio pai")?;
        let _ = std::fs::create_dir_all(parent);
        if parent.exists() {
            let mut canon = parent.canonicalize().map_err(|e| format!("Path invalido: {}", e))?;
            canon.push(path.file_name().ok_or("Sem nome de arquivo")?);
            canon
        } else {
            return Err("Diretorio pai nao pode ser criado".to_string());
        }
    };
    let app_canonical = app_dir.canonicalize().unwrap_or_else(|_| app_dir.to_path_buf());
    if !canonical.starts_with(&app_canonical) {
        return Err(format!("Acesso negado: path fora do diretorio do app"));
    }
    Ok(canonical)
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
pub fn criar_ativo(state: State<'_, AppState>, dados: CreateAssetDto, usuario: String) -> Result<Asset, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_ativo(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn atualizar_ativo(
    state: State<'_, AppState>,
    id: String,
    dados: UpdateAssetDto,
    usuario: String,
) -> Result<Asset, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::atualizar_ativo(&mut conn, &id, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn excluir_ativo(state: State<'_, AppState>, id: String, usuario: String, role: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    exigir_admin_db(&mut conn, &usuario, &role)?;
    queries::excluir_ativo(&mut conn, &id, &usuario).map_err(err)
}

// ============================================================
// Dashboard
// ============================================================

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
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
    usuario: String,
    role: String,
) -> Result<queries::ImportResult, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    exigir_admin_db(&mut conn, &role, &role)?;
    queries::importar_ativos(&mut conn, &ativos, &modo, &usuario).map_err(err)
}

// ============================================================
// Backup / Restore
// ============================================================

#[tauri::command]
pub fn criar_backup(state: State<'_, AppState>, destino: String, role: String) -> Result<String, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    exigir_admin_db(&mut conn, &role, &role)?;
    queries::criar_backup(&mut conn, &destino).map_err(err)
}

#[tauri::command]
pub fn restaurar_backup(state: State<'_, AppState>, origem: String, role: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    exigir_admin_db(&mut conn, &role, &role)?;
    queries::restaurar_backup(&mut conn, &origem).map_err(err)
}

// ============================================================
// Movimentações de equipamentos
// ============================================================

#[tauri::command]
pub fn atribuir_equipamento(
    state: State<'_, AppState>,
    dados: AssignDto,
    usuario: String,
) -> Result<Movement, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::atribuir_equipamento(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn reatribuir_equipamento(
    state: State<'_, AppState>,
    dados: AssignDto,
    usuario: String,
) -> Result<Movement, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::reatribuir_equipamento(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn devolver_equipamento(
    state: State<'_, AppState>,
    dados: ReturnDto,
    usuario: String,
) -> Result<Movement, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::devolver_equipamento(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn trocar_equipamentos(
    state: State<'_, AppState>,
    dados: SwapDto,
    usuario: String,
) -> Result<Vec<Movement>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::trocar_equipamentos(&mut conn, &dados, &usuario).map_err(err)
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

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
pub fn listar_colaboradores(
    state: State<'_, AppState>,
    search: Option<String>,
    branch_id: Option<String>,
) -> Result<Vec<Employee>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_colaboradores(&mut conn, search.as_deref(), branch_id.as_deref(), true).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
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
    usuario: String,
) -> Result<MaintenanceRecord, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::enviar_para_manutencao(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn retornar_de_manutencao(
    state: State<'_, AppState>,
    dados: ReturnMaintenanceDto,
    usuario: String,
) -> Result<MaintenanceRecord, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::retornar_de_manutencao(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
pub fn devolver_em_lote(
    state: State<'_, AppState>,
    asset_ids: Vec<String>,
    reason: String,
    usuario: String,
) -> Result<Vec<Movement>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::devolver_em_lote(&mut conn, &asset_ids, &reason, &usuario).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn baixar_em_lote(
    state: State<'_, AppState>,
    asset_ids: Vec<String>,
    reason: String,
    usuario: String,
    role: String,
) -> Result<usize, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    exigir_admin_db(&mut conn, &role, &role)?;
    queries::baixar_em_lote(&mut conn, &asset_ids, &reason, &usuario).map_err(err)
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

#[tauri::command(rename_all = "snake_case")]
pub fn marcar_como_treinamento(
    state: State<'_, AppState>,
    asset_id: String,
    is_training: bool,
    usuario: String,
) -> Result<Asset, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::marcar_como_treinamento(&mut conn, &asset_id, is_training, &usuario).map_err(err)
}

// ============================================================
// Validação de Service Tag
// ============================================================

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command]
pub fn ler_log_coletor() -> String {
    queries::ler_log_coletor()
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
    role: String,
) -> Result<User, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    exigir_admin_db(&mut conn, &role, &role)?;
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
    role: String,
) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    exigir_admin_db(&mut conn, &role, &role)?;
    queries::alterar_senha(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub fn desativar_usuario(state: State<'_, AppState>, id: String, role: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    exigir_admin_db(&mut conn, &role, &role)?;
    queries::desativar_usuario(&mut conn, &id).map_err(err)
}

// ============================================================
// Utilitário
// ============================================================

#[tauri::command]
pub fn escrever_arquivo(state: State<'_, AppState>, caminho: String, dados: Vec<u8>) -> Result<(), String> {
    // Validar que o path esta dentro do diretorio do app
    let safe_path = validar_path_seguro(&caminho, &state.app_dir)?;
    if let Some(parent) = safe_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Falha ao criar diretório: {}", e))?;
    }
    std::fs::write(&safe_path, &dados).map_err(|e| format!("Falha ao salvar arquivo: {}", e))
}

// ============================================================
// Verificação de conexão
// ============================================================

#[tauri::command]
pub fn verificar_conexao(state: State<'_, AppState>) -> Result<bool, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::verificar_conexao(&mut conn)
}

// ============================================================
// Empréstimos / Retiradas
// ============================================================

#[tauri::command]
pub fn criar_emprestimo(
    state: State<'_, AppState>,
    dados: CreateLoanDto,
    usuario: String,
) -> Result<AssetLoan, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_emprestimo(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn devolver_emprestimo(
    state: State<'_, AppState>,
    id: String,
    observacoes: Option<String>,
    usuario: String,
) -> Result<AssetLoan, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::devolver_emprestimo(&mut conn, &id, observacoes.as_deref(), &usuario).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_emprestimos(
    state: State<'_, AppState>,
    status_filter: Option<String>,
    asset_id: Option<String>,
) -> Result<Vec<AssetLoan>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_emprestimos(&mut conn, status_filter.as_deref(), asset_id.as_deref()).map_err(err)
}

#[tauri::command]
pub fn excluir_emprestimo(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::excluir_emprestimo(&mut conn, &id).map_err(err)
}

// ============================================================
// Observações / Notas
// ============================================================

#[tauri::command(rename_all = "snake_case")]
pub fn listar_notas(
    state: State<'_, AppState>,
    categoria: Option<String>,
) -> Result<Vec<Nota>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_notas(&mut conn, categoria.as_deref()).map_err(err)
}

#[tauri::command]
pub fn criar_nota(
    state: State<'_, AppState>,
    dados: CreateNotaDto,
) -> Result<Nota, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_nota(&mut conn, &dados).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn atualizar_nota(
    state: State<'_, AppState>,
    id: String,
    titulo: String,
    corpo: String,
    categoria: String,
) -> Result<Nota, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::atualizar_nota(&mut conn, &id, &titulo, &corpo, &categoria).map_err(err)
}

#[tauri::command]
pub fn excluir_nota(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::excluir_nota(&mut conn, &id).map_err(err)
}

// ============================================================
// Descarte de equipamentos
// ============================================================

#[tauri::command]
pub fn listar_candidatos_descarte(state: State<'_, AppState>) -> Result<Vec<Asset>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_candidatos_descarte(&mut conn).map_err(err)
}

#[tauri::command]
pub fn criar_descarte(
    state: State<'_, AppState>,
    dados: CreateDescarteDto,
    usuario: String,
) -> Result<Descarte, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_descarte(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn listar_descartes(
    state: State<'_, AppState>,
    status: Option<String>,
) -> Result<Vec<Descarte>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_descartes(&mut conn, status.as_deref()).map_err(err)
}

#[tauri::command]
pub fn concluir_descarte(state: State<'_, AppState>, id: String, usuario: String) -> Result<Descarte, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::concluir_descarte(&mut conn, &id, &usuario).map_err(err)
}

#[tauri::command]
pub fn cancelar_descarte(state: State<'_, AppState>, id: String, usuario: String) -> Result<Descarte, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::cancelar_descarte(&mut conn, &id, &usuario).map_err(err)
}

// ============================================================
// Desligamento de colaboradores
// ============================================================

#[tauri::command]
pub fn desligar_colaborador(
    state: State<'_, AppState>,
    dados: CreateDesligamentoDto,
    usuario: String,
) -> Result<Desligamento, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::desligar_colaborador(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn listar_desligamentos(
    state: State<'_, AppState>,
    status: Option<String>,
) -> Result<Vec<Desligamento>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_desligamentos(&mut conn, status.as_deref()).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_desligamentos_por_ativo(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Vec<Desligamento>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_desligamentos_por_ativo(&mut conn, &asset_id).map_err(err)
}

#[tauri::command]
pub fn confirmar_devolucao(state: State<'_, AppState>, id: String, usuario: String) -> Result<Desligamento, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::confirmar_devolucao(&mut conn, &id, &usuario).map_err(err)
}

#[tauri::command]
pub fn cancelar_desligamento(state: State<'_, AppState>, id: String) -> Result<Desligamento, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::cancelar_desligamento(&mut conn, &id).map_err(err)
}

// ============================================================
// Lixeira — ativos soft-deleted
// ============================================================

#[tauri::command]
pub fn listar_ativos_excluidos(state: State<'_, AppState>) -> Result<Vec<DeletedAsset>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_ativos_excluidos(&mut conn).map_err(err)
}

#[tauri::command]
pub fn restaurar_ativo(
    state: State<'_, AppState>,
    id: String,
    usuario: String,
    role: String,
) -> Result<Asset, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    exigir_admin_db(&mut conn, &role, &role)?;
    queries::restaurar_ativo(&mut conn, &id, &usuario).map_err(err)
}

// ============================================================
// Termos de responsabilidade
// ============================================================

#[tauri::command]
pub fn criar_termo(
    state: State<'_, AppState>,
    dados: CreateTermoDto,
    usuario: String,
) -> Result<Termo, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_termo(&mut conn, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn obter_termo(state: State<'_, AppState>, id: String) -> Result<Termo, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::obter_termo(&mut conn, &id).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_termos(
    state: State<'_, AppState>,
    status: Option<String>,
    tipo: Option<String>,
) -> Result<Vec<Termo>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_termos(&mut conn, status.as_deref(), tipo.as_deref()).map_err(err)
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_termos_por_ativo(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Vec<Termo>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_termos_por_ativo(&mut conn, &asset_id).map_err(err)
}

#[tauri::command]
pub fn atualizar_termo(
    state: State<'_, AppState>,
    id: String,
    dados: UpdateTermoDto,
    usuario: String,
) -> Result<Termo, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::atualizar_termo(&mut conn, &id, &dados, &usuario).map_err(err)
}

#[tauri::command]
pub fn excluir_termo(state: State<'_, AppState>, id: String, usuario: String) -> Result<(), String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::excluir_termo(&mut conn, &id, &usuario).map_err(err)
}

// ============================================================
// Configuração D4Sign
// ============================================================

#[tauri::command]
pub fn obter_d4sign_config(state: State<'_, AppState>) -> Result<Option<D4SignConfig>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::obter_d4sign_config(&mut conn).map_err(err)
}

#[tauri::command]
pub fn salvar_d4sign_config(
    state: State<'_, AppState>,
    dados: SaveD4SignConfigDto,
) -> Result<D4SignConfig, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::salvar_d4sign_config(&mut conn, &dados).map_err(err)
}

#[tauri::command]
pub async fn d4sign_testar_conexao(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    let config = queries::obter_d4sign_config(&mut conn)
        .map_err(err)?
        .ok_or("D4Sign nao configurado")?;

    let url = d4sign_url(&config, "/account")?;
    let resp = reqwest::get(url).await.map_err(|e| format!("Erro de conexao: {}", e))?;
    let status = resp.status();
    let body = resp.text().await.map_err(|e| format!("Erro ao ler resposta: {}", e))?;

    if status.is_success() {
        Ok(body)
    } else {
        Err(format!("D4Sign retornou {}: {}", status, body))
    }
}

#[tauri::command]
pub async fn d4sign_listar_cofres(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    let config = queries::obter_d4sign_config(&mut conn)
        .map_err(err)?
        .ok_or("D4Sign nao configurado")?;

    let url = d4sign_url(&config, "/safes")?;
    let resp = reqwest::get(url).await.map_err(|e| format!("Erro: {}", e))?;
    let body = resp.text().await.map_err(|e| format!("Erro: {}", e))?;
    Ok(body)
}

#[tauri::command]
pub async fn d4sign_upload_documento(
    state: State<'_, AppState>,
    filepath: String,
    filename: String,
) -> Result<String, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    let config = queries::obter_d4sign_config(&mut conn)
        .map_err(err)?
        .ok_or("D4Sign nao configurado")?;

    let file_bytes = std::fs::read(&filepath).map_err(|e| format!("Erro ao ler arquivo: {}", e))?;
    let part = reqwest::multipart::Part::bytes(file_bytes)
        .file_name(filename)
        .mime_str("application/pdf").map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new().part("file", part);

    let url = d4sign_url(&config, &format!("/documents/{}/upload", config.cofre_uuid))?;

    let client = reqwest::Client::new();
    let resp = client.post(url).multipart(form).send().await.map_err(|e| format!("Erro: {}", e))?;
    let body = resp.text().await.map_err(|e| format!("Erro: {}", e))?;
    Ok(body)
}

#[tauri::command]
pub async fn d4sign_adicionar_signatario(
    state: State<'_, AppState>,
    documento_uuid: String,
    email: String,
) -> Result<String, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    let config = queries::obter_d4sign_config(&mut conn)
        .map_err(err)?
        .ok_or("D4Sign nao configurado")?;

    let url = d4sign_url(&config, &format!("/documents/{}/createlist", documento_uuid))?;

    let payload = serde_json::json!({
        "signers": [{
            "email": email,
            "act": "1",
            "foreign": "0",
            "certificadoicpbr": "0",
            "assinatura_presencial": "0",
            "docauth": "0",
            "docauthandselfie": "0",
            "embed_methodauth": "email",
        }]
    });

    let client = reqwest::Client::new();
    let resp = client.post(url)
        .json(&payload)
        .send().await.map_err(|e| format!("Erro: {}", e))?;
    let body = resp.text().await.map_err(|e| format!("Erro: {}", e))?;
    Ok(body)
}

#[tauri::command]
pub async fn d4sign_enviar_para_assinatura(
    state: State<'_, AppState>,
    documento_uuid: String,
) -> Result<String, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    let config = queries::obter_d4sign_config(&mut conn)
        .map_err(err)?
        .ok_or("D4Sign nao configurado")?;

    let url = d4sign_url(&config, &format!("/documents/{}/sendtosigner", documento_uuid))?;

    let msg = config.mensagem_email.unwrap_or_else(|| "Prezado(a), segue o termo para assinatura digital.".to_string());
    let payload = serde_json::json!({
        "message": msg,
        "skip_email": "0",
        "workflow": "0",
    });

    let client = reqwest::Client::new();
    let resp = client.post(url)
        .json(&payload)
        .send().await.map_err(|e| format!("Erro: {}", e))?;
    let body = resp.text().await.map_err(|e| format!("Erro: {}", e))?;
    Ok(body)
}

#[tauri::command]
pub async fn d4sign_consultar_status(
    state: State<'_, AppState>,
    documento_uuid: String,
) -> Result<String, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    let config = queries::obter_d4sign_config(&mut conn)
        .map_err(err)?
        .ok_or("D4Sign nao configurado")?;

    let url = d4sign_url(&config, &format!("/documents/{}", documento_uuid))?;

    let resp = reqwest::get(url).await.map_err(|e| format!("Erro: {}", e))?;
    let body = resp.text().await.map_err(|e| format!("Erro: {}", e))?;
    Ok(body)
}

#[tauri::command]
pub async fn d4sign_baixar_assinado(
    state: State<'_, AppState>,
    documento_uuid: String,
    destino: String,
) -> Result<String, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    let config = queries::obter_d4sign_config(&mut conn)
        .map_err(err)?
        .ok_or("D4Sign nao configurado")?;

    let url = d4sign_url(&config, &format!("/documents/{}/download", documento_uuid))?;

    // 1. POST para obter URL temporaria do PDF
    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "type": "pdf",
        "language": "pt",
    });
    let resp = client.post(&url).json(&payload).send().await
        .map_err(|e| format!("Erro ao solicitar download: {}", e))?;
    let body = resp.text().await.map_err(|e| format!("Erro ao ler resposta: {}", e))?;

    // 2. Extrair URL do JSON (pode ser array ou objeto)
    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("Resposta invalida: {} — body: {}", e, body))?;

    let download_url = if let Some(arr) = json.as_array() {
        arr.first()
            .and_then(|o| o.get("url"))
            .and_then(|u| u.as_str())
            .map(|s| s.to_string())
    } else {
        json.get("url").and_then(|u| u.as_str()).map(|s| s.to_string())
    }.ok_or_else(|| format!("URL de download nao retornada: {}", body))?;

    // 3. Baixar o PDF da URL temporaria
    let pdf_resp = client.get(&download_url).send().await
        .map_err(|e| format!("Erro ao baixar PDF: {}", e))?;
    let pdf_bytes = pdf_resp.bytes().await
        .map_err(|e| format!("Erro ao ler bytes do PDF: {}", e))?;

    // 4. Verificar se e base64 ou binario direto
    let final_bytes = if pdf_bytes.starts_with(b"%PDF") {
        // PDF binario direto
        pdf_bytes.to_vec()
    } else {
        // Pode ser base64 — tentar decodificar
        let text = String::from_utf8_lossy(&pdf_bytes);
        match base64_decode(text.trim()) {
            Some(decoded) if decoded.starts_with(b"%PDF") => decoded,
            _ => pdf_bytes.to_vec(), // Usar como esta
        }
    };

    // 5. Criar diretorio e salvar
    if let Some(parent) = std::path::Path::new(&destino).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&destino, &final_bytes)
        .map_err(|e| format!("Erro ao salvar PDF: {}", e))?;

    Ok(destino)
}

fn base64_decode(input: &str) -> Option<Vec<u8>> {
    // Decodificacao base64 simples sem dependencia externa
    let table = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let input = input.trim().replace('\n', "").replace('\r', "");
    let mut buf = Vec::with_capacity(input.len() * 3 / 4);
    let mut acc = 0u32;
    let mut bits = 0u32;
    for c in input.bytes() {
        if c == b'=' { break; }
        let val = table.iter().position(|&b| b == c)? as u32;
        acc = (acc << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            buf.push((acc >> bits) as u8);
            acc &= (1 << bits) - 1;
        }
    }
    Some(buf)
}
