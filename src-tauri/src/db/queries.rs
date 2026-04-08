use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use mysql::prelude::*;
use mysql::*;
use uuid::Uuid;

use super::models::*;

/// Helper: converte uma Row MySQL em Asset (20 colunas)
fn row_to_asset(row: mysql::Row) -> Asset {
    Asset {
        id: row.get("id").unwrap_or_default(),
        service_tag: row.get("service_tag").unwrap_or_default(),
        equipment_type: row.get("equipment_type").unwrap_or_default(),
        status: row.get("status").unwrap_or_default(),
        employee_name: row.get("employee_name").unwrap_or(None),
        branch_id: row.get("branch_id").unwrap_or_default(),
        branch_name: row.get("branch_name").unwrap_or(None),
        ram_gb: row.get("ram_gb").unwrap_or(0),
        storage_capacity_gb: row.get("storage_capacity_gb").unwrap_or(0),
        storage_type: row.get("storage_type").unwrap_or_default(),
        os: row.get("os").unwrap_or_default(),
        cpu: row.get("cpu").unwrap_or_default(),
        model: row.get("model").unwrap_or_default(),
        year: row.get("year").unwrap_or(None),
        notes: row.get("notes").unwrap_or_default(),
        is_training: row.get::<i8, _>("is_training").unwrap_or(0) != 0,
        warranty_start: row.get("warranty_start").unwrap_or(None),
        warranty_end: row.get("warranty_end").unwrap_or(None),
        created_at: row.get("created_at").unwrap_or_default(),
        updated_at: row.get("updated_at").unwrap_or_default(),
    }
}

const ASSET_SELECT: &str =
    "SELECT a.id, a.service_tag, a.equipment_type, a.status, a.employee_name,
            a.branch_id, b.name as branch_name, a.ram_gb, a.storage_capacity_gb,
            a.storage_type, a.os, a.cpu, a.model, a.year, a.notes, a.is_training,
            a.warranty_start, a.warranty_end, a.created_at, a.updated_at
     FROM assets a
     LEFT JOIN branches b ON b.id = a.branch_id";

const ASSET_NOT_DELETED: &str = "a.deleted_at IS NULL";

// ============================================================
// BRANCHES — somente leitura (populadas pelo seed)
// ============================================================

pub fn listar_filiais(conn: &mut PooledConn) -> Result<Vec<Branch>> {
    let filiais = conn
        .query_map(
            "SELECT id, name FROM branches ORDER BY name ASC",
            |(id, name): (String, String)| Branch { id, name },
        )
        .context("Falha ao listar filiais")?;
    Ok(filiais)
}

// ============================================================
// ASSETS — CRUD completo com filtros dinâmicos
// ============================================================

/// Lista ativos com filtros dinâmicos, busca e ordenação
pub fn listar_ativos(conn: &mut PooledConn, filtros: &AssetFilters) -> Result<Vec<Asset>> {
    let mut where_clauses: Vec<String> = vec![ASSET_NOT_DELETED.to_string()];
    let mut param_values: Vec<mysql::Value> = Vec::new();

    // Busca textual (service_tag, employee_name, cpu, os)
    if let Some(ref search) = filtros.search {
        let term = search.trim();
        if !term.is_empty() {
            where_clauses.push(
                "(a.service_tag LIKE ? OR a.employee_name LIKE ? OR a.cpu LIKE ? OR a.os LIKE ?)"
                    .to_string(),
            );
            let like_term = format!("%{}%", term);
            param_values.push(mysql::Value::from(&like_term));
            param_values.push(mysql::Value::from(&like_term));
            param_values.push(mysql::Value::from(&like_term));
            param_values.push(mysql::Value::from(&like_term));
        }
    }

    // Filtros exatos
    if let Some(ref branch_id) = filtros.branch_id {
        where_clauses.push("a.branch_id = ?".to_string());
        param_values.push(mysql::Value::from(branch_id));
    }
    if let Some(ref equipment_type) = filtros.equipment_type {
        where_clauses.push("a.equipment_type = ?".to_string());
        param_values.push(mysql::Value::from(equipment_type));
    }
    if let Some(ref status) = filtros.status {
        where_clauses.push("a.status = ?".to_string());
        param_values.push(mysql::Value::from(status));
    }
    if let Some(ram_gb) = filtros.ram_gb {
        where_clauses.push("a.ram_gb = ?".to_string());
        param_values.push(mysql::Value::from(ram_gb));
    }
    if let Some(ref storage_type) = filtros.storage_type {
        where_clauses.push("a.storage_type = ?".to_string());
        param_values.push(mysql::Value::from(storage_type));
    }
    if let Some(ref os) = filtros.os {
        if !os.trim().is_empty() {
            where_clauses.push("a.os = ?".to_string());
            param_values.push(mysql::Value::from(os));
        }
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    // Ordenação segura (whitelist)
    let colunas_permitidas = [
        "service_tag",
        "employee_name",
        "status",
        "equipment_type",
        "created_at",
        "updated_at",
        "ram_gb",
        "branch_id",
    ];
    let sort_col = filtros
        .sort_by
        .as_deref()
        .filter(|c| colunas_permitidas.contains(c))
        .unwrap_or("created_at");
    let sort_dir = filtros
        .sort_dir
        .as_deref()
        .filter(|d| *d == "ASC" || *d == "DESC")
        .unwrap_or("DESC");

    // Para ordenação por branch, usamos b.name
    let order_expr = if sort_col == "branch" {
        format!("b.name {}", sort_dir)
    } else {
        format!("a.{} {}", sort_col, sort_dir)
    };

    let sql = format!(
        "{} {} ORDER BY {}",
        ASSET_SELECT, where_sql, order_expr
    );

    let rows: Vec<mysql::Row> = conn
        .exec(&sql, mysql::Params::Positional(param_values))
        .context("Falha ao listar ativos")?;

    Ok(rows.into_iter().map(row_to_asset).collect())
}

/// Busca um ativo pelo ID
pub fn obter_ativo(conn: &mut PooledConn, id: &str) -> Result<Asset> {
    let sql = format!("{} WHERE a.id = ? AND {}", ASSET_SELECT, ASSET_NOT_DELETED);
    let rows: Vec<mysql::Row> = conn
        .exec(&sql, (id,))
        .context("Falha ao buscar ativo")?;

    rows.into_iter()
        .next()
        .map(row_to_asset)
        .ok_or_else(|| anyhow!("Ativo não encontrado"))
}

/// Cria um novo ativo (com registro de auditoria)
pub fn criar_ativo(conn: &mut PooledConn, dto: &CreateAssetDto, usuario: &str) -> Result<Asset> {
    // Validação: IN_USE exige employee_name
    if dto.status == "IN_USE" {
        if dto.employee_name.as_ref().map_or(true, |n| n.trim().is_empty()) {
            return Err(anyhow!(
                "Colaborador é obrigatório quando status é 'Em Uso'"
            ));
        }
    }

    // Validação: Service Tag única
    let tag_existente: Option<String> = conn
        .exec_first(
            "SELECT id FROM assets WHERE service_tag = ?",
            (dto.service_tag.trim(),),
        )
        .context("Falha ao verificar service tag")?;
    if tag_existente.is_some() {
        return Err(anyhow!(
            "Service Tag '{}' já está cadastrada. Cada equipamento deve ter uma tag única.",
            dto.service_tag.trim()
        ));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let params: Vec<mysql::Value> = vec![
        id.clone().into(),
        dto.service_tag.trim().to_string().into(),
        dto.equipment_type.clone().into(),
        dto.status.clone().into(),
        dto.employee_name.as_deref().map(|s| s.trim().to_string()).into(),
        dto.branch_id.clone().into(),
        dto.ram_gb.into(),
        dto.storage_capacity_gb.into(),
        dto.storage_type.clone().into(),
        dto.os.clone().into(),
        dto.cpu.clone().into(),
        dto.model.as_deref().unwrap_or("").to_string().into(),
        dto.year.into(),
        dto.notes.as_deref().unwrap_or("").to_string().into(),
        0i64.into(),
        dto.warranty_start.clone().into(),
        dto.warranty_end.clone().into(),
        now.clone().into(),
        now.clone().into(),
    ];

    conn.exec_drop(
        "INSERT INTO assets (id, service_tag, equipment_type, status, employee_name,
                             branch_id, ram_gb, storage_capacity_gb, storage_type,
                             os, cpu, model, year, notes, is_training,
                             warranty_start, warranty_end, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        mysql::Params::Positional(params),
    )
    .context("Falha ao criar ativo. Service Tag pode já existir.")?;

    // Registro de auditoria
    registrar_auditoria(conn, &id, &serde_json::json!({
        "acao": "CRIADO",
        "service_tag": dto.service_tag.trim(),
    }), usuario)?;

    obter_ativo(conn, &id)
}

/// Atualiza um ativo existente (atualiza todos os campos enviados)
pub fn atualizar_ativo(conn: &mut PooledConn, id: &str, dto: &UpdateAssetDto, usuario: &str) -> Result<Asset> {
    // Busca ativo atual para merge
    let atual = obter_ativo(conn, id)?;

    let service_tag = dto.service_tag.as_deref().unwrap_or(&atual.service_tag);
    let equipment_type = dto.equipment_type.as_deref().unwrap_or(&atual.equipment_type);
    let status = dto.status.as_deref().unwrap_or(&atual.status);
    let employee_name = if dto.employee_name.is_some() {
        dto.employee_name.as_deref()
    } else {
        atual.employee_name.as_deref()
    };
    let branch_id = dto.branch_id.as_deref().unwrap_or(&atual.branch_id);
    let ram_gb = dto.ram_gb.unwrap_or(atual.ram_gb);
    let storage_capacity_gb = dto.storage_capacity_gb.unwrap_or(atual.storage_capacity_gb);
    let storage_type = dto.storage_type.as_deref().unwrap_or(&atual.storage_type);
    let os = dto.os.as_deref().unwrap_or(&atual.os);
    let cpu = dto.cpu.as_deref().unwrap_or(&atual.cpu);
    let model = dto.model.as_deref().unwrap_or(&atual.model);
    let year = if dto.year.is_some() { dto.year } else { atual.year };
    let notes = dto.notes.as_deref().unwrap_or(&atual.notes);
    let warranty_start = if dto.warranty_start.is_some() { dto.warranty_start.as_deref() } else { atual.warranty_start.as_deref() };
    let warranty_end = if dto.warranty_end.is_some() { dto.warranty_end.as_deref() } else { atual.warranty_end.as_deref() };

    // Validação: IN_USE exige employee_name
    if status == "IN_USE" {
        if employee_name.map_or(true, |n| n.trim().is_empty()) {
            return Err(anyhow!(
                "Colaborador é obrigatório quando status é 'Em Uso'"
            ));
        }
    }

    // Validação: Service Tag única (se alterada)
    if service_tag.trim() != atual.service_tag {
        let tag_existente: Option<String> = conn
            .exec_first(
                "SELECT id FROM assets WHERE service_tag = ? AND id != ?",
                (service_tag.trim(), id),
            )
            .context("Falha ao verificar service tag")?;
        if tag_existente.is_some() {
            return Err(anyhow!(
                "Service Tag '{}' já está cadastrada em outro equipamento.",
                service_tag.trim()
            ));
        }
    }

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let update_params: Vec<mysql::Value> = vec![
        service_tag.trim().to_string().into(),
        equipment_type.to_string().into(),
        status.to_string().into(),
        employee_name.map(|s| s.trim().to_string()).into(),
        branch_id.to_string().into(),
        ram_gb.into(),
        storage_capacity_gb.into(),
        storage_type.to_string().into(),
        os.to_string().into(),
        cpu.to_string().into(),
        model.to_string().into(),
        year.into(),
        notes.to_string().into(),
        warranty_start.map(|s| s.to_string()).into(),
        warranty_end.map(|s| s.to_string()).into(),
        now.clone().into(),
        id.to_string().into(),
    ];

    conn.exec_drop(
        "UPDATE assets SET
            service_tag = ?, equipment_type = ?, status = ?, employee_name = ?,
            branch_id = ?, ram_gb = ?, storage_capacity_gb = ?, storage_type = ?,
            os = ?, cpu = ?, model = ?, year = ?, notes = ?,
            warranty_start = ?, warranty_end = ?, updated_at = ?
         WHERE id = ?",
        mysql::Params::Positional(update_params),
    )
    .context("Falha ao atualizar ativo")?;

    // Registro de auditoria com diffs
    let mut diffs = serde_json::Map::new();
    diffs.insert("acao".into(), serde_json::json!("ATUALIZADO"));
    if service_tag.trim() != atual.service_tag { diffs.insert("service_tag".into(), serde_json::json!({"de": atual.service_tag, "para": service_tag.trim()})); }
    if equipment_type != atual.equipment_type { diffs.insert("equipment_type".into(), serde_json::json!({"de": atual.equipment_type, "para": equipment_type})); }
    if status != atual.status { diffs.insert("status".into(), serde_json::json!({"de": atual.status, "para": status})); }
    if employee_name.map(str::trim) != atual.employee_name.as_deref() { diffs.insert("employee_name".into(), serde_json::json!({"de": atual.employee_name, "para": employee_name.map(str::trim)})); }
    if branch_id != atual.branch_id { diffs.insert("branch_id".into(), serde_json::json!({"de": atual.branch_id, "para": branch_id})); }
    if ram_gb != atual.ram_gb { diffs.insert("ram_gb".into(), serde_json::json!({"de": atual.ram_gb, "para": ram_gb})); }
    if storage_capacity_gb != atual.storage_capacity_gb { diffs.insert("storage_capacity_gb".into(), serde_json::json!({"de": atual.storage_capacity_gb, "para": storage_capacity_gb})); }
    if storage_type != atual.storage_type { diffs.insert("storage_type".into(), serde_json::json!({"de": atual.storage_type, "para": storage_type})); }
    registrar_auditoria(conn, id, &serde_json::Value::Object(diffs), usuario)?;

    obter_ativo(conn, id)
}

/// Exclui um ativo pelo ID (com auditoria)
pub fn excluir_ativo(conn: &mut PooledConn, id: &str, usuario: &str) -> Result<()> {
    let ativo = obter_ativo(conn, id).ok();

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "UPDATE assets SET deleted_at = ?, deleted_by = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        (&now, usuario, &now, id),
    ).context("Falha ao excluir ativo")?;

    let rows = conn.affected_rows();
    if rows == 0 {
        return Err(anyhow!("Ativo nao encontrado para exclusao"));
    }

    if let Some(a) = ativo {
        registrar_auditoria(conn, id, &serde_json::json!({
            "acao": "EXCLUIDO",
            "service_tag": a.service_tag,
            "filial": a.branch_name,
        }), usuario)?;
    }

    Ok(())
}

// ============================================================
// AUDITORIA — registro de alterações
// ============================================================

fn registrar_auditoria(conn: &mut PooledConn, asset_id: &str, changes: &serde_json::Value, changed_by: &str) -> Result<()> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let json = serde_json::to_string(changes).unwrap_or_default();
    let by = if changed_by.is_empty() { "sistema" } else { changed_by };

    conn.exec_drop(
        "INSERT INTO asset_audit (id, asset_id, changed_at, changes_json, changed_by)
         VALUES (?, ?, ?, ?, ?)",
        (&id, asset_id, &now, &json, by),
    )
    .context("Falha ao registrar auditoria")?;

    Ok(())
}

/// Lista registros de auditoria de um ativo
pub fn listar_auditoria(conn: &mut PooledConn, asset_id: Option<&str>) -> Result<Vec<AuditEntry>> {
    let entries = match asset_id {
        Some(id) => {
            conn.exec_map(
                "SELECT id, asset_id, changed_at, changes_json, changed_by FROM asset_audit WHERE asset_id = ? ORDER BY changed_at DESC LIMIT 500",
                (id,),
                |(id, asset_id, changed_at, changes_json, changed_by): (String, String, String, String, Option<String>)| {
                    AuditEntry { id, asset_id, changed_at, changes_json, changed_by }
                },
            ).context("Falha ao listar auditoria")?
        }
        None => {
            conn.query_map(
                "SELECT id, asset_id, changed_at, changes_json, changed_by FROM asset_audit ORDER BY changed_at DESC LIMIT 500",
                |(id, asset_id, changed_at, changes_json, changed_by): (String, String, String, String, Option<String>)| {
                    AuditEntry { id, asset_id, changed_at, changes_json, changed_by }
                },
            ).context("Falha ao listar auditoria")?
        }
    };

    Ok(entries)
}

// ============================================================
// IMPORTAÇÃO EM LOTE — criar/atualizar ativos em massa
// ============================================================

/// Resultado da importação
#[derive(Debug, Clone, serde::Serialize)]
pub struct ImportResult {
    pub total: usize,
    pub created: usize,
    pub updated: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

/// Importa ativos em lote. Se service_tag já existir, atualiza ou pula conforme `modo`.
/// modo: "update" = atualiza existentes, "skip" = pula existentes
pub fn importar_ativos(
    conn: &mut PooledConn,
    ativos: &[CreateAssetDto],
    modo: &str,
    usuario: &str,
) -> Result<ImportResult> {
    let mut result = ImportResult {
        total: ativos.len(),
        created: 0,
        updated: 0,
        skipped: 0,
        errors: Vec::new(),
    };

    for (i, dto) in ativos.iter().enumerate() {
        let idx = i + 1;

        // Verifica se service_tag já existe
        let existente: Option<String> = conn
            .exec_first(
                "SELECT id FROM assets WHERE service_tag = ?",
                (dto.service_tag.trim(),),
            )
            .context("Falha ao verificar service tag na importação")?;

        if let Some(existing_id) = existente {
            if modo == "update" {
                // Atualiza o existente
                let update_dto = UpdateAssetDto {
                    service_tag: Some(dto.service_tag.clone()),
                    equipment_type: Some(dto.equipment_type.clone()),
                    status: Some(dto.status.clone()),
                    employee_name: dto.employee_name.clone(),
                    branch_id: Some(dto.branch_id.clone()),
                    ram_gb: Some(dto.ram_gb),
                    storage_capacity_gb: Some(dto.storage_capacity_gb),
                    storage_type: Some(dto.storage_type.clone()),
                    os: Some(dto.os.clone()),
                    cpu: Some(dto.cpu.clone()),
                    model: dto.model.clone(),
                    year: dto.year,
                    notes: dto.notes.clone(),
                    warranty_start: None,
                    warranty_end: None,
                };
                match atualizar_ativo(conn, &existing_id, &update_dto, usuario) {
                    Ok(_) => result.updated += 1,
                    Err(e) => result.errors.push(format!("Linha {}: {}", idx, e)),
                }
            } else {
                result.skipped += 1;
            }
        } else {
            // Cria novo
            match criar_ativo(conn, dto, usuario) {
                Ok(_) => result.created += 1,
                Err(e) => result.errors.push(format!("Linha {}: {}", idx, e)),
            }
        }
    }

    Ok(result)
}

// ============================================================
// BACKUP / RESTORE
// ============================================================

/// Cria backup JSON de ativos, colaboradores, notas e empréstimos.
pub fn criar_backup(conn: &mut PooledConn, destino: &str) -> Result<String> {
    let assets = listar_ativos(conn, &AssetFilters::default())?;

    let employees: Vec<serde_json::Value> = conn.query_map(
        "SELECT id, name, branch_id, active, created_at FROM employees ORDER BY name",
        |row: mysql::Row| serde_json::json!({
            "id":         row.get::<String, _>("id").unwrap_or_default(),
            "name":       row.get::<String, _>("name").unwrap_or_default(),
            "branch_id":  row.get::<Option<String>, _>("branch_id").flatten(),
            "active":     row.get::<i8, _>("active").unwrap_or(1) != 0,
            "created_at": row.get::<String, _>("created_at").unwrap_or_default(),
        }),
    ).context("Falha ao exportar colaboradores")?;

    let notes = listar_notas(conn, None)?;
    let loans = listar_emprestimos(conn, None, None)?;

    let backup = serde_json::json!({
        "version":    2,
        "created_at": Utc::now().to_rfc3339(),
        "assets":     serde_json::to_value(&assets)?,
        "employees":  employees,
        "notes":      serde_json::to_value(&notes)?,
        "loans":      serde_json::to_value(&loans)?,
    });

    let json_str = serde_json::to_string_pretty(&backup)
        .context("Falha ao serializar backup")?;

    std::fs::write(destino, &json_str)
        .context("Falha ao salvar arquivo de backup")?;

    Ok(destino.to_string())
}

/// Restaura backup JSON: faz REPLACE INTO em ativos, colaboradores, notas e empréstimos.
/// Não apaga dados existentes — apenas atualiza/insere pelo ID.
pub fn restaurar_backup(conn: &mut PooledConn, origem: &str) -> Result<()> {
    let content = std::fs::read_to_string(origem)
        .context("Arquivo de backup não encontrado ou ilegível")?;

    let backup: serde_json::Value = serde_json::from_str(&content)
        .context("Arquivo de backup com formato inválido (esperado JSON)")?;

    // ── Ativos ──────────────────────────────────────────────────────────
    if let Ok(assets) = serde_json::from_value::<Vec<Asset>>(backup["assets"].clone()) {
        for a in &assets {
            conn.exec_drop(
                "REPLACE INTO assets
                 (id, service_tag, equipment_type, status, employee_name, branch_id,
                  ram_gb, storage_capacity_gb, storage_type, os, cpu, model, year,
                  notes, is_training, warranty_start, warranty_end, created_at, updated_at)
                 VALUES (
                  :id, :service_tag, :equipment_type, :status, :employee_name, :branch_id,
                  :ram_gb, :storage_gb, :storage_type, :os, :cpu, :model, :year,
                  :notes, :is_training, :warranty_start, :warranty_end, :created_at, :updated_at
                 )",
                params! {
                    "id"            => &a.id,
                    "service_tag"   => &a.service_tag,
                    "equipment_type"=> &a.equipment_type,
                    "status"        => &a.status,
                    "employee_name" => &a.employee_name,
                    "branch_id"     => &a.branch_id,
                    "ram_gb"        => a.ram_gb,
                    "storage_gb"    => a.storage_capacity_gb,
                    "storage_type"  => &a.storage_type,
                    "os"            => &a.os,
                    "cpu"           => &a.cpu,
                    "model"         => &a.model,
                    "year"          => a.year,
                    "notes"         => &a.notes,
                    "is_training"   => a.is_training as i8,
                    "warranty_start"=> &a.warranty_start,
                    "warranty_end"  => &a.warranty_end,
                    "created_at"    => &a.created_at,
                    "updated_at"    => &a.updated_at,
                },
            ).context("Falha ao restaurar ativo")?;
        }
    }

    // ── Colaboradores ───────────────────────────────────────────────────
    if let Some(employees) = backup["employees"].as_array() {
        for e in employees {
            let id   = e["id"].as_str().unwrap_or_default();
            let name = e["name"].as_str().unwrap_or_default();
            let bid  = e["branch_id"].as_str();
            let act  = e["active"].as_bool().unwrap_or(true) as i8;
            let cat  = e["created_at"].as_str().unwrap_or_default();
            conn.exec_drop(
                "REPLACE INTO employees (id, name, branch_id, active, created_at)
                 VALUES (?, ?, ?, ?, ?)",
                (id, name, bid, act, cat),
            ).context("Falha ao restaurar colaborador")?;
        }
    }

    // ── Notas ────────────────────────────────────────────────────────────
    if let Ok(notes) = serde_json::from_value::<Vec<Nota>>(backup["notes"].clone()) {
        for n in &notes {
            conn.exec_drop(
                "REPLACE INTO notes (id, titulo, corpo, categoria, autor, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                (&n.id, &n.titulo, &n.corpo, &n.categoria, &n.autor, &n.created_at, &n.updated_at),
            ).context("Falha ao restaurar nota")?;
        }
    }

    Ok(())
}

// ============================================================
// DASHBOARD — Queries de agregação
// ============================================================

pub fn obter_dados_dashboard(conn: &mut PooledConn, branch_id: Option<&str>) -> Result<DashboardData> {
    let stats = obter_stats(conn, branch_id)?;
    let by_branch = obter_contagem_por_filial(conn)?;
    let by_os = obter_contagem_por_grupo(conn, "os", branch_id)?;
    let by_ram = obter_contagem_por_ram(conn, branch_id)?;
    let by_storage_type = obter_contagem_por_grupo(conn, "storage_type", branch_id)?;

    let by_month = obter_tendencia_mensal(conn, 12)?;

    Ok(DashboardData {
        stats,
        by_branch,
        by_os,
        by_ram,
        by_storage_type,
        by_month,
    })
}

fn obter_stats(conn: &mut PooledConn, branch_id: Option<&str>) -> Result<DashboardStats> {
    let (where_clause, params) = match branch_id {
        Some(bid) => (" WHERE deleted_at IS NULL AND branch_id = ?".to_string(), vec![mysql::Value::from(bid)]),
        None => (" WHERE deleted_at IS NULL".to_string(), vec![]),
    };
    let sql = format!(
        "SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'IN_USE' THEN 1 END) as in_use,
            COUNT(CASE WHEN status = 'STOCK' THEN 1 END) as stock,
            COUNT(CASE WHEN status = 'MAINTENANCE' THEN 1 END) as maintenance,
            COUNT(CASE WHEN status = 'RETIRED' THEN 1 END) as retired,
            COUNT(CASE WHEN equipment_type = 'NOTEBOOK' THEN 1 END) as notebooks,
            COUNT(CASE WHEN equipment_type = 'DESKTOP' THEN 1 END) as desktops,
            COUNT(CASE WHEN status = 'IN_USE' AND (employee_name IS NULL OR employee_name = '') THEN 1 END) as in_use_no_employee,
            COUNT(CASE WHEN is_training = 1 THEN 1 END) as training
         FROM assets{}",
        where_clause
    );

    let result: Option<(i64, i64, i64, i64, i64, i64, i64, i64, i64)> = conn
        .exec_first(&sql, mysql::Params::Positional(params))
        .context("Falha ao obter estatísticas do dashboard")?;

    // Custo total de manutencao
    let maintenance_total_cost: f64 = conn
        .exec_first::<f64, _, _>(
            "SELECT COALESCE(SUM(cost), 0) FROM maintenance_records",
            (),
        )
        .unwrap_or(Some(0.0))
        .unwrap_or(0.0);

    // Tempo medio em manutencao (dias) - apenas registros fechados
    let avg_maintenance_days: f64 = conn
        .exec_first::<f64, _, _>(
            "SELECT COALESCE(AVG(DATEDIFF(returned_at, sent_at)), 0) FROM maintenance_records WHERE status = 'CLOSED' AND returned_at IS NOT NULL",
            (),
        )
        .unwrap_or(Some(0.0))
        .unwrap_or(0.0);

    match result {
        Some((total, in_use, stock, maintenance, retired, notebooks, desktops, in_use_no_employee, training)) => {
            // Ativos por colaborador (media)
            let employees_with_assets: f64 = conn
                .exec_first::<i64, _, _>(
                    "SELECT COUNT(DISTINCT employee_name) FROM assets WHERE employee_name IS NOT NULL AND employee_name != '' AND status = 'IN_USE' AND deleted_at IS NULL",
                    (),
                )
                .unwrap_or(Some(0))
                .unwrap_or(0) as f64;

            let assets_per_employee = if employees_with_assets > 0.0 {
                in_use as f64 / employees_with_assets
            } else {
                0.0
            };

            Ok(DashboardStats {
                total,
                in_use,
                stock,
                maintenance,
                retired,
                notebooks,
                desktops,
                in_use_no_employee,
                training,
                maintenance_total_cost,
                avg_maintenance_days,
                assets_per_employee,
            })
        }
        None => Ok(DashboardStats {
            total: 0,
            in_use: 0,
            stock: 0,
            maintenance: 0,
            retired: 0,
            notebooks: 0,
            desktops: 0,
            in_use_no_employee: 0,
            training: 0,
            maintenance_total_cost,
            avg_maintenance_days,
            assets_per_employee: 0.0,
        }),
    }
}

fn obter_contagem_por_filial(conn: &mut PooledConn) -> Result<Vec<BranchCount>> {
    let results = conn
        .query_map(
            "SELECT b.id, b.name,
                COUNT(a.id) as total,
                COUNT(CASE WHEN a.status = 'IN_USE' THEN 1 END) as in_use,
                COUNT(CASE WHEN a.status = 'STOCK' THEN 1 END) as stock,
                COUNT(CASE WHEN a.status = 'MAINTENANCE' THEN 1 END) as maintenance,
                COUNT(CASE WHEN a.status = 'RETIRED' THEN 1 END) as retired
             FROM branches b
             LEFT JOIN assets a ON a.branch_id = b.id AND a.deleted_at IS NULL
             GROUP BY b.id, b.name
             ORDER BY total DESC, b.name ASC",
            |(branch_id, branch_name, total, in_use, stock, maintenance, retired): (
                String, String, i64, i64, i64, i64, i64,
            )| {
                BranchCount {
                    branch_id,
                    branch_name,
                    total,
                    in_use,
                    stock,
                    maintenance,
                    retired,
                }
            },
        )
        .context("Falha ao obter contagem por filial")?;

    Ok(results)
}

fn obter_contagem_por_grupo(conn: &mut PooledConn, coluna: &str, branch_id: Option<&str>) -> Result<Vec<GroupCount>> {
    // Validação do nome da coluna (whitelist)
    let colunas_permitidas = ["os", "storage_type", "equipment_type"];
    if !colunas_permitidas.contains(&coluna) {
        return Err(anyhow!("Coluna inválida para agrupamento: {}", coluna));
    }

    let (where_clause, params) = match branch_id {
        Some(bid) => (" WHERE deleted_at IS NULL AND branch_id = ?".to_string(), vec![mysql::Value::from(bid)]),
        None => (" WHERE deleted_at IS NULL".to_string(), vec![]),
    };
    let sql = format!(
        "SELECT COALESCE({col}, 'N/A') as label, COUNT(*) as total
         FROM assets{where_clause}
         GROUP BY {col}
         ORDER BY total DESC",
        col = coluna,
        where_clause = where_clause
    );

    let results = conn
        .exec_map(
            &sql,
            mysql::Params::Positional(params),
            |(label, total): (String, i64)| GroupCount { label, total },
        )
        .context("Falha ao obter contagem por grupo")?;

    Ok(results)
}

fn obter_contagem_por_ram(conn: &mut PooledConn, branch_id: Option<&str>) -> Result<Vec<GroupCount>> {
    let (where_clause, params) = match branch_id {
        Some(bid) => (" WHERE deleted_at IS NULL AND branch_id = ?".to_string(), vec![mysql::Value::from(bid)]),
        None => (" WHERE deleted_at IS NULL".to_string(), vec![]),
    };
    let sql = format!(
        "SELECT CAST(ram_gb AS CHAR) as label, COUNT(*) as total
         FROM assets{}
         GROUP BY ram_gb
         ORDER BY ram_gb ASC",
        where_clause
    );

    let results = conn
        .exec_map(
            &sql,
            mysql::Params::Positional(params),
            |(label, total): (String, i64)| GroupCount {
                label: format!("{} GB", label),
                total,
            },
        )
        .context("Falha ao obter contagem por RAM")?;

    Ok(results)
}

// ============================================================
// EXPORTAÇÃO — busca ativos para gerar Excel
// ============================================================

pub fn listar_ativos_para_exportacao(
    conn: &mut PooledConn,
    branch_ids: Option<&[String]>,
) -> Result<Vec<Asset>> {
    match branch_ids {
        Some(ids) if !ids.is_empty() => {
            let placeholders: Vec<&str> = ids.iter().map(|_| "?").collect();
            let sql = format!(
                "SELECT a.id, a.service_tag, a.equipment_type, a.status, a.employee_name,
                        a.branch_id, b.name as branch_name, a.ram_gb, a.storage_capacity_gb,
                        a.storage_type, a.os, a.cpu, a.model, a.year, a.notes, a.is_training, a.warranty_start, a.warranty_end, a.created_at, a.updated_at
                 FROM assets a
                 LEFT JOIN branches b ON b.id = a.branch_id
                 WHERE a.deleted_at IS NULL AND a.branch_id IN ({})
                 ORDER BY b.name ASC, a.employee_name ASC",
                placeholders.join(", ")
            );

            let params: Vec<mysql::Value> = ids.iter().map(|s| mysql::Value::from(s)).collect();

            let rows: Vec<mysql::Row> = conn
                .exec(&sql, mysql::Params::Positional(params))
                .context("Falha ao listar ativos para exportação")?;

            Ok(rows.into_iter().map(row_to_asset).collect())
        }
        _ => {
            // Retorna todos
            let filtros_vazio = AssetFilters {
                sort_by: Some("branch_id".to_string()),
                sort_dir: Some("ASC".to_string()),
                ..Default::default()
            };
            listar_ativos(conn, &filtros_vazio)
        }
    }
}

// ============================================================
// MOVIMENTAÇÕES — Atribuir, Devolver, Trocar
// ============================================================

/// Atribuir equipamento do estoque a um colaborador (STOCK -> IN_USE)
pub fn atribuir_equipamento(conn: &mut PooledConn, dto: &AssignDto, usuario: &str) -> Result<Movement> {
    let asset = obter_ativo(conn, &dto.asset_id)?;

    if asset.status != "STOCK" {
        return Err(anyhow!(
            "Equipamento {} não está no estoque (status atual: {})",
            asset.service_tag,
            asset.status
        ));
    }

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let mov_id = Uuid::new_v4().to_string();

    // Atualiza o ativo
    conn.exec_drop(
        "UPDATE assets SET status = 'IN_USE', employee_name = ?, updated_at = ? WHERE id = ?",
        (&dto.to_employee, &now, &dto.asset_id),
    )
    .context("Falha ao atualizar ativo na atribuição")?;

    // Registra movimentação
    conn.exec_drop(
        "INSERT INTO asset_movements (id, asset_id, movement_type, from_employee, to_employee, from_status, to_status, reason, created_at)
         VALUES (?, ?, 'ASSIGN', NULL, ?, ?, 'IN_USE', ?, ?)",
        (&mov_id, &dto.asset_id, &dto.to_employee, &asset.status, &dto.reason, &now),
    )
    .context("Falha ao registrar movimentação de atribuição")?;

    // Auditoria
    let changes = serde_json::json!({
        "movement": "ASSIGN",
        "status": { "from": asset.status, "to": "IN_USE" },
        "employee_name": { "from": null, "to": dto.to_employee },
        "reason": dto.reason,
    });
    registrar_auditoria(conn, &dto.asset_id, &changes, usuario)?;

    Ok(Movement {
        id: mov_id,
        asset_id: dto.asset_id.clone(),
        service_tag: asset.service_tag,
        movement_type: "ASSIGN".to_string(),
        from_employee: None,
        to_employee: Some(dto.to_employee.clone()),
        from_status: asset.status,
        to_status: "IN_USE".to_string(),
        reason: dto.reason.clone(),
        created_at: now,
    })
}

/// Reatribuir equipamento: trocar colaborador em ativo IN_USE (ex: desligamento)
pub fn reatribuir_equipamento(conn: &mut PooledConn, dto: &AssignDto, usuario: &str) -> Result<Movement> {
    let asset = obter_ativo(conn, &dto.asset_id)?;

    if asset.status != "IN_USE" && asset.status != "STOCK" {
        return Err(anyhow!(
            "Equipamento {} não pode ser reatribuído (status atual: {}).",
            asset.service_tag,
            asset.status
        ));
    }

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let mov_id = Uuid::new_v4().to_string();
    let from_employee = asset.employee_name.clone();
    let from_status = asset.status.clone();

    // Atualiza o ativo — muda para IN_USE, atribui colaborador
    conn.exec_drop(
        "UPDATE assets SET employee_name = ?, status = 'IN_USE', updated_at = ? WHERE id = ?",
        (&dto.to_employee, &now, &dto.asset_id),
    )
    .context("Falha ao atualizar ativo na reatribuição")?;

    // Registra movimentação
    conn.exec_drop(
        "INSERT INTO asset_movements (id, asset_id, movement_type, from_employee, to_employee, from_status, to_status, reason, created_at)
         VALUES (?, ?, 'ASSIGN', ?, ?, ?, 'IN_USE', ?, ?)",
        (&mov_id, &dto.asset_id, &from_employee, &dto.to_employee, &from_status, &dto.reason, &now),
    )
    .context("Falha ao registrar movimentação de reatribuição")?;

    // Auditoria
    let changes = serde_json::json!({
        "movement": "REASSIGN",
        "employee_name": { "from": from_employee, "to": dto.to_employee },
        "status": { "from": from_status, "to": "IN_USE" },
        "reason": dto.reason,
    });
    registrar_auditoria(conn, &dto.asset_id, &changes, usuario)?;

    Ok(Movement {
        id: mov_id,
        asset_id: dto.asset_id.clone(),
        service_tag: asset.service_tag,
        movement_type: "ASSIGN".to_string(),
        from_employee,
        to_employee: Some(dto.to_employee.clone()),
        from_status,
        to_status: "IN_USE".to_string(),
        reason: dto.reason.clone(),
        created_at: now,
    })
}

/// Devolver equipamento ao estoque (IN_USE -> STOCK)
pub fn devolver_equipamento(conn: &mut PooledConn, dto: &ReturnDto, usuario: &str) -> Result<Movement> {
    let asset = obter_ativo(conn, &dto.asset_id)?;

    if asset.status != "IN_USE" {
        return Err(anyhow!(
            "Equipamento {} não está em uso (status atual: {})",
            asset.service_tag,
            asset.status
        ));
    }

    let from_employee = asset.employee_name.clone().unwrap_or_default();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let mov_id = Uuid::new_v4().to_string();

    // Atualiza o ativo
    conn.exec_drop(
        "UPDATE assets SET status = 'STOCK', employee_name = NULL, updated_at = ? WHERE id = ?",
        (&now, &dto.asset_id),
    )
    .context("Falha ao atualizar ativo na devolução")?;

    // Registra movimentação
    conn.exec_drop(
        "INSERT INTO asset_movements (id, asset_id, movement_type, from_employee, to_employee, from_status, to_status, reason, created_at)
         VALUES (?, ?, 'RETURN', ?, NULL, ?, 'STOCK', ?, ?)",
        (&mov_id, &dto.asset_id, &from_employee, &asset.status, &dto.reason, &now),
    )
    .context("Falha ao registrar movimentação de devolução")?;

    // Auditoria
    let changes = serde_json::json!({
        "movement": "RETURN",
        "status": { "from": asset.status, "to": "STOCK" },
        "employee_name": { "from": from_employee, "to": null },
        "reason": dto.reason,
    });
    registrar_auditoria(conn, &dto.asset_id, &changes, usuario)?;

    Ok(Movement {
        id: mov_id,
        asset_id: dto.asset_id.clone(),
        service_tag: asset.service_tag,
        movement_type: "RETURN".to_string(),
        from_employee: Some(from_employee),
        to_employee: None,
        from_status: asset.status,
        to_status: "STOCK".to_string(),
        reason: dto.reason.clone(),
        created_at: now,
    })
}

/// Trocar equipamentos entre dois colaboradores (ambos IN_USE)
pub fn trocar_equipamentos(conn: &mut PooledConn, dto: &SwapDto, usuario: &str) -> Result<Vec<Movement>> {
    let asset_a = obter_ativo(conn, &dto.asset_id_a)?;
    let asset_b = obter_ativo(conn, &dto.asset_id_b)?;

    if asset_a.status != "IN_USE" && asset_a.status != "STOCK" {
        return Err(anyhow!(
            "Equipamento {} não pode ser trocado (status: {})",
            asset_a.service_tag,
            asset_a.status
        ));
    }
    if asset_b.status != "IN_USE" && asset_b.status != "STOCK" {
        return Err(anyhow!(
            "Equipamento {} não pode ser trocado (status: {})",
            asset_b.service_tag,
            asset_b.status
        ));
    }

    let emp_a = asset_a.employee_name.clone().unwrap_or_default();
    let emp_b = asset_b.employee_name.clone().unwrap_or_default();
    let status_a = asset_a.status.clone();
    let status_b = asset_b.status.clone();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let mov_id_a = Uuid::new_v4().to_string();
    let mov_id_b = Uuid::new_v4().to_string();

    // Swap: A recebe employee/status de B, B recebe employee/status de A
    let new_status_a = &status_b;
    let new_status_b = &status_a;

    conn.exec_drop(
        "UPDATE assets SET employee_name = ?, status = ?, updated_at = ? WHERE id = ?",
        (&emp_b, new_status_a, &now, &dto.asset_id_a),
    )
    .context("Falha ao atualizar ativo A na troca")?;

    conn.exec_drop(
        "UPDATE assets SET employee_name = ?, status = ?, updated_at = ? WHERE id = ?",
        (&emp_a, new_status_b, &now, &dto.asset_id_b),
    )
    .context("Falha ao atualizar ativo B na troca")?;

    // Registra movimentação para ativo A
    conn.exec_drop(
        "INSERT INTO asset_movements (id, asset_id, movement_type, from_employee, to_employee, from_status, to_status, reason, created_at)
         VALUES (?, ?, 'SWAP', ?, ?, ?, ?, ?, ?)",
        (&mov_id_a, &dto.asset_id_a, &emp_a, &emp_b, &status_a, new_status_a, &dto.reason, &now),
    )
    .context("Falha ao registrar movimentação de troca (A)")?;

    // Registra movimentação para ativo B
    conn.exec_drop(
        "INSERT INTO asset_movements (id, asset_id, movement_type, from_employee, to_employee, from_status, to_status, reason, created_at)
         VALUES (?, ?, 'SWAP', ?, ?, ?, ?, ?, ?)",
        (&mov_id_b, &dto.asset_id_b, &emp_b, &emp_a, &status_b, new_status_b, &dto.reason, &now),
    )
    .context("Falha ao registrar movimentação de troca (B)")?;

    // Auditoria A
    let changes_a = serde_json::json!({
        "movement": "SWAP",
        "employee_name": { "from": emp_a, "to": emp_b },
        "swapped_with": asset_b.service_tag,
        "reason": dto.reason,
    });
    registrar_auditoria(conn, &dto.asset_id_a, &changes_a, usuario)?;

    // Auditoria B
    let changes_b = serde_json::json!({
        "movement": "SWAP",
        "employee_name": { "from": emp_b, "to": emp_a },
        "swapped_with": asset_a.service_tag,
        "reason": dto.reason,
    });
    registrar_auditoria(conn, &dto.asset_id_b, &changes_b, usuario)?;

    Ok(vec![
        Movement {
            id: mov_id_a,
            asset_id: dto.asset_id_a.clone(),
            service_tag: asset_a.service_tag,
            movement_type: "SWAP".to_string(),
            from_employee: Some(emp_a.clone()),
            to_employee: Some(emp_b.clone()),
            from_status: status_a.clone(),
            to_status: new_status_a.clone(),
            reason: dto.reason.clone(),
            created_at: now.clone(),
        },
        Movement {
            id: mov_id_b,
            asset_id: dto.asset_id_b.clone(),
            service_tag: asset_b.service_tag,
            movement_type: "SWAP".to_string(),
            from_employee: Some(emp_b),
            to_employee: Some(emp_a),
            from_status: status_b.clone(),
            to_status: new_status_b.clone(),
            reason: dto.reason.clone(),
            created_at: now,
        },
    ])
}

/// Lista movimentações com service_tag via JOIN
pub fn listar_movimentos(conn: &mut PooledConn, limit: Option<i64>) -> Result<Vec<Movement>> {
    let limit_val = limit.unwrap_or(200);

    let movimentos = conn
        .exec_map(
            "SELECT m.id, m.asset_id, a.service_tag, m.movement_type, m.from_employee,
                    m.to_employee, m.from_status, m.to_status, m.reason, m.created_at
             FROM asset_movements m
             LEFT JOIN assets a ON a.id = m.asset_id
             ORDER BY m.created_at DESC
             LIMIT ?",
            (limit_val,),
            |(id, asset_id, service_tag, movement_type, from_employee,
              to_employee, from_status, to_status, reason, created_at): (
                String, String, Option<String>, String, Option<String>,
                Option<String>, String, String, Option<String>, String,
            )| {
                Movement {
                    id,
                    asset_id,
                    service_tag: service_tag.unwrap_or_default(),
                    movement_type,
                    from_employee,
                    to_employee,
                    from_status,
                    to_status,
                    reason: reason.unwrap_or_default(),
                    created_at,
                }
            },
        )
        .context("Falha ao listar movimentações")?;

    Ok(movimentos)
}

/// Lista ativos em estoque (para formulário de atribuição)
pub fn listar_ativos_em_estoque(conn: &mut PooledConn) -> Result<Vec<Asset>> {
    let filtros = AssetFilters {
        status: Some("STOCK".to_string()),
        sort_by: Some("service_tag".to_string()),
        sort_dir: Some("ASC".to_string()),
        ..Default::default()
    };
    listar_ativos(conn, &filtros)
}

/// Lista ativos em uso (para formulários de devolução e troca)
pub fn listar_ativos_em_uso(conn: &mut PooledConn) -> Result<Vec<Asset>> {
    let filtros = AssetFilters {
        status: Some("IN_USE".to_string()),
        sort_by: Some("employee_name".to_string()),
        sort_dir: Some("ASC".to_string()),
        ..Default::default()
    };
    listar_ativos(conn, &filtros)
}

// ============================================================
// CONFIGURAÇÕES DO APP
// ============================================================

pub fn obter_configuracao(conn: &mut PooledConn, chave: &str) -> Result<Option<String>> {
    let resultado: Option<String> = conn
        .exec_first(
            "SELECT value FROM app_settings WHERE `key` = ?",
            (chave,),
        )
        .context("Falha ao obter configuração")?;
    Ok(resultado)
}

pub fn salvar_configuracao(conn: &mut PooledConn, chave: &str, valor: &str) -> Result<()> {
    conn.exec_drop(
        "INSERT INTO app_settings (`key`, value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)",
        (chave, valor),
    )?;
    Ok(())
}

/// Verifica se é necessário fazer backup automático (a cada 15 dias)
pub fn verificar_backup_automatico(
    app_dir: &std::path::Path,
    conn: &mut PooledConn,
) -> Result<Option<String>> {
    let ultimo = obter_configuracao(conn, "last_auto_backup")?;

    let precisa_backup = match &ultimo {
        None => true,
        Some(data_str) => {
            if let Ok(data) = chrono::NaiveDate::parse_from_str(data_str, "%Y-%m-%d") {
                let hoje = chrono::Local::now().date_naive();
                hoje.signed_duration_since(data).num_days() >= 15
            } else {
                true
            }
        }
    };

    if !precisa_backup {
        return Ok(None);
    }

    let backup_dir = app_dir.join("backups");
    std::fs::create_dir_all(&backup_dir)
        .context("Falha ao criar diretório de backups")?;

    let hoje = chrono::Local::now().format("%Y-%m-%d").to_string();
    let nome_arquivo = format!("auto-backup-{}.sql", hoje);
    let destino = backup_dir.join(&nome_arquivo);

    // TODO: Implementar dump MySQL real aqui.
    // Por enquanto, apenas registra que o backup foi feito.
    // Em produção, usar mysqldump ou exportação SQL programática.

    salvar_configuracao(conn, "last_auto_backup", &hoje)?;

    // Limpar backups antigos (manter últimos 3)
    let mut arquivos: Vec<_> = std::fs::read_dir(&backup_dir)?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.file_name().to_string_lossy().starts_with("auto-backup-")
        })
        .collect();
    arquivos.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
    for arquivo in arquivos.iter().skip(3) {
        let _ = std::fs::remove_file(arquivo.path());
    }

    Ok(Some(destino.to_string_lossy().to_string()))
}

// ============================================================
// MOVIMENTAÇÕES POR ATIVO (para detalhe do ativo)
// ============================================================

pub fn listar_movimentos_por_ativo(conn: &mut PooledConn, asset_id: &str) -> Result<Vec<Movement>> {
    let movimentos = conn
        .exec_map(
            "SELECT m.id, m.asset_id, a.service_tag, m.movement_type, m.from_employee,
                    m.to_employee, m.from_status, m.to_status, m.reason, m.created_at
             FROM asset_movements m
             LEFT JOIN assets a ON a.id = m.asset_id
             WHERE m.asset_id = ?
             ORDER BY m.created_at DESC",
            (asset_id,),
            |(id, asset_id, service_tag, movement_type, from_employee,
              to_employee, from_status, to_status, reason, created_at): (
                String, String, Option<String>, String, Option<String>,
                Option<String>, String, String, Option<String>, String,
            )| {
                Movement {
                    id,
                    asset_id,
                    service_tag: service_tag.unwrap_or_default(),
                    movement_type,
                    from_employee,
                    to_employee,
                    from_status,
                    to_status,
                    reason: reason.unwrap_or_default(),
                    created_at,
                }
            },
        )
        .context("Falha ao listar movimentações do ativo")?;

    Ok(movimentos)
}

// ============================================================
// COLABORADORES
// ============================================================

pub fn listar_colaboradores(
    conn: &mut PooledConn,
    search: Option<&str>,
    branch_id: Option<&str>,
    active_only: bool,
) -> Result<Vec<Employee>> {
    let mut where_clauses: Vec<String> = Vec::new();
    let mut param_values: Vec<mysql::Value> = Vec::new();

    if active_only {
        where_clauses.push("e.active = 1".to_string());
    }
    if let Some(s) = search {
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            where_clauses.push("e.name LIKE ?".to_string());
            param_values.push(mysql::Value::from(format!("%{}%", trimmed)));
        }
    }
    if let Some(bid) = branch_id {
        where_clauses.push("e.branch_id = ?".to_string());
        param_values.push(mysql::Value::from(bid));
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_clauses.join(" AND "))
    };

    let sql = format!(
        "SELECT e.id, e.name, e.branch_id, e.active, e.created_at
         FROM employees e{}
         ORDER BY e.name ASC
         LIMIT 100",
        where_sql
    );

    let results = conn
        .exec_map(
            &sql,
            mysql::Params::Positional(param_values),
            |(id, name, branch_id, active, created_at): (String, String, Option<String>, i8, String)| {
                Employee {
                    id,
                    name,
                    branch_id,
                    active: active != 0,
                    created_at,
                }
            },
        )
        .context("Falha ao listar colaboradores")?;

    Ok(results)
}

pub fn criar_colaborador(conn: &mut PooledConn, name: &str, branch_id: Option<&str>) -> Result<Employee> {
    let name_trimmed = name.trim();
    if name_trimmed.is_empty() {
        return Err(anyhow!("Nome do colaborador não pode ser vazio"));
    }

    // Verifica se já existe
    let existing: Option<String> = conn
        .exec_first(
            "SELECT id FROM employees WHERE name = ? AND (branch_id = ? OR (? IS NULL AND branch_id IS NULL))",
            (name_trimmed, branch_id, branch_id),
        )
        .context("Falha ao verificar colaborador existente")?;

    if let Some(existing_id) = existing {
        let result: Option<(String, String, Option<String>, i8, String)> = conn
            .exec_first(
                "SELECT id, name, branch_id, active, created_at FROM employees WHERE id = ?",
                (&existing_id,),
            )
            .context("Falha ao obter colaborador existente")?;

        return match result {
            Some((id, name, branch_id, active, created_at)) => Ok(Employee {
                id,
                name,
                branch_id,
                active: active != 0,
                created_at,
            }),
            None => Err(anyhow!("Colaborador existente não encontrado")),
        };
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    conn.exec_drop(
        "INSERT INTO employees (id, name, branch_id, active, created_at) VALUES (?, ?, ?, 1, ?)",
        (&id, name_trimmed, branch_id, &now),
    )?;

    Ok(Employee {
        id,
        name: name_trimmed.to_string(),
        branch_id: branch_id.map(|s| s.to_string()),
        active: true,
        created_at: now,
    })
}

// ============================================================
// MANUTENÇÃO
// ============================================================

pub fn enviar_para_manutencao(conn: &mut PooledConn, dto: &SendMaintenanceDto, usuario: &str) -> Result<MaintenanceRecord> {
    // Busca ativo e valida status
    let asset = obter_ativo(conn, &dto.asset_id)?;
    if asset.status != "IN_USE" && asset.status != "STOCK" {
        return Err(anyhow!(
            "Ativo {} está com status '{}'. Só é possível enviar para manutenção ativos em uso ou estoque.",
            asset.service_tag, asset.status
        ));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let old_status = asset.status.clone();

    // Altera status do ativo para MAINTENANCE
    conn.exec_drop(
        "UPDATE assets SET status = 'MAINTENANCE', updated_at = ? WHERE id = ?",
        (&now, &dto.asset_id),
    )?;

    // Registra auditoria
    let changes = serde_json::json!({
        "acao": "MANUTENCAO_ENVIO",
        "status": { "de": old_status, "para": "MAINTENANCE" },
        "fornecedor": dto.supplier,
    });
    registrar_auditoria(conn, &dto.asset_id, &changes, usuario)?;

    // Cria registro de manutenção
    conn.exec_drop(
        "INSERT INTO maintenance_records (id, asset_id, supplier, expected_return_date, cost, notes, sent_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')",
        (
            &id,
            &dto.asset_id,
            &dto.supplier,
            &dto.expected_return_date,
            dto.cost.unwrap_or(0.0),
            dto.notes.as_deref().unwrap_or(""),
            &now,
        ),
    )?;

    Ok(MaintenanceRecord {
        id,
        asset_id: dto.asset_id.clone(),
        service_tag: Some(asset.service_tag),
        supplier: dto.supplier.clone(),
        expected_return_date: dto.expected_return_date.clone(),
        cost: dto.cost.unwrap_or(0.0),
        notes: dto.notes.clone().unwrap_or_default(),
        sent_at: now,
        returned_at: None,
        status: "OPEN".to_string(),
    })
}

pub fn retornar_de_manutencao(conn: &mut PooledConn, dto: &ReturnMaintenanceDto, usuario: &str) -> Result<MaintenanceRecord> {
    // Busca registro de manutenção
    let result: Option<(String, String, Option<String>, String, Option<String>, f64, String, String, Option<String>, String)> = conn
        .exec_first(
            "SELECT mr.id, mr.asset_id, a.service_tag, mr.supplier, mr.expected_return_date, mr.cost, mr.notes, mr.sent_at, mr.returned_at, mr.status
             FROM maintenance_records mr
             LEFT JOIN assets a ON a.id = mr.asset_id
             WHERE mr.id = ?",
            (&dto.maintenance_id,),
        )
        .context("Falha ao buscar registro de manutenção")?;

    let rec = match result {
        Some((id, asset_id, service_tag, supplier, expected_return_date, cost, notes, sent_at, returned_at, status)) => {
            MaintenanceRecord {
                id,
                asset_id,
                service_tag,
                supplier,
                expected_return_date,
                cost,
                notes,
                sent_at,
                returned_at,
                status,
            }
        }
        None => return Err(anyhow!("Registro de manutenção não encontrado")),
    };

    if rec.status != "OPEN" {
        return Err(anyhow!("Este registro de manutenção já foi encerrado."));
    }

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let final_cost = dto.cost.unwrap_or(rec.cost);
    let final_notes = match &dto.notes {
        Some(n) if !n.is_empty() => {
            if rec.notes.is_empty() { n.clone() } else { format!("{} | {}", rec.notes, n) }
        }
        _ => rec.notes.clone(),
    };

    // Altera status do ativo para STOCK
    conn.exec_drop(
        "UPDATE assets SET status = 'STOCK', employee_name = NULL, updated_at = ? WHERE id = ?",
        (&now, &rec.asset_id),
    )?;

    // Registra auditoria
    let changes = serde_json::json!({
        "acao": "MANUTENCAO_RETORNO",
        "status": { "de": "MAINTENANCE", "para": "STOCK" },
        "custo": final_cost,
    });
    registrar_auditoria(conn, &rec.asset_id, &changes, usuario)?;

    // Fecha registro de manutenção
    conn.exec_drop(
        "UPDATE maintenance_records SET returned_at = ?, status = 'CLOSED', cost = ?, notes = ? WHERE id = ?",
        (&now, final_cost, &final_notes, &dto.maintenance_id),
    )?;

    Ok(MaintenanceRecord {
        id: rec.id,
        asset_id: rec.asset_id,
        service_tag: rec.service_tag,
        supplier: rec.supplier,
        expected_return_date: rec.expected_return_date,
        cost: final_cost,
        notes: final_notes,
        sent_at: rec.sent_at,
        returned_at: Some(now),
        status: "CLOSED".to_string(),
    })
}

pub fn listar_manutencoes(conn: &mut PooledConn, status_filter: Option<&str>) -> Result<Vec<MaintenanceRecord>> {
    let (where_clause, params) = match status_filter {
        Some(s) => (" WHERE mr.status = ?".to_string(), vec![mysql::Value::from(s)]),
        None => (String::new(), vec![]),
    };
    let sql = format!(
        "SELECT mr.id, mr.asset_id, a.service_tag, mr.supplier, mr.expected_return_date,
                mr.cost, mr.notes, mr.sent_at, mr.returned_at, mr.status
         FROM maintenance_records mr
         LEFT JOIN assets a ON a.id = mr.asset_id{}
         ORDER BY mr.sent_at DESC
         LIMIT 200",
        where_clause
    );

    let results = conn
        .exec_map(
            &sql,
            mysql::Params::Positional(params),
            |(id, asset_id, service_tag, supplier, expected_return_date,
              cost, notes, sent_at, returned_at, status): (
                String, String, Option<String>, String, Option<String>,
                f64, String, String, Option<String>, String,
            )| {
                MaintenanceRecord {
                    id,
                    asset_id,
                    service_tag,
                    supplier,
                    expected_return_date,
                    cost,
                    notes,
                    sent_at,
                    returned_at,
                    status,
                }
            },
        )
        .context("Falha ao listar registros de manutenção")?;

    Ok(results)
}

// ============================================================
// OPERAÇÕES EM LOTE
// ============================================================

pub fn devolver_em_lote(conn: &mut PooledConn, asset_ids: &[String], reason: &str, usuario: &str) -> Result<Vec<Movement>> {
    let mut movimentos = Vec::new();
    for id in asset_ids {
        let dto = ReturnDto {
            asset_id: id.clone(),
            reason: reason.to_string(),
        };
        match devolver_equipamento(conn, &dto, usuario) {
            Ok(mov) => movimentos.push(mov),
            Err(e) => log::warn!("Falha ao devolver ativo {}: {}", id, e),
        }
    }
    Ok(movimentos)
}

pub fn baixar_em_lote(conn: &mut PooledConn, asset_ids: &[String], reason: &str, usuario: &str) -> Result<usize> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let mut count = 0usize;
    for id in asset_ids {
        let asset = match obter_ativo(conn, id) {
            Ok(a) => a,
            Err(_) => continue,
        };
        if asset.status == "RETIRED" {
            continue;
        }
        conn.exec_drop(
            "UPDATE assets SET status = 'RETIRED', employee_name = NULL, updated_at = ? WHERE id = ?",
            (&now, id),
        )?;
        let changes = serde_json::json!({
            "acao": "BAIXA_LOTE",
            "status": { "de": asset.status, "para": "RETIRED" },
            "motivo": reason,
        });
        registrar_auditoria(conn, id, &changes, usuario)?;
        count += 1;
    }
    Ok(count)
}

// ============================================================
// LOG DE ACESSO
// ============================================================

pub fn registrar_acesso(conn: &mut PooledConn) -> Result<()> {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();
    salvar_configuracao(conn, "last_access", &now)
}

// ============================================================
// EQUIPAMENTOS DE TREINAMENTO
// ============================================================

/// Lista equipamentos marcados como treinamento (notebooks e desktops)
pub fn listar_notebooks_treinamento(conn: &mut PooledConn) -> Result<Vec<Asset>> {
    let filtros = AssetFilters {
        sort_by: Some("service_tag".to_string()),
        sort_dir: Some("ASC".to_string()),
        ..Default::default()
    };
    let mut ativos = listar_ativos(conn, &filtros)?;
    ativos.retain(|a| a.is_training);
    Ok(ativos)
}

/// Marca ou desmarca um ativo como equipamento de treinamento
pub fn marcar_como_treinamento(conn: &mut PooledConn, asset_id: &str, is_training: bool, usuario: &str) -> Result<Asset> {
    let asset = obter_ativo(conn, asset_id)?;

    let val: i64 = if is_training { 1 } else { 0 };
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "UPDATE assets SET is_training = ?, updated_at = ? WHERE id = ?",
        (val, &now, asset_id),
    )
    .context("Falha ao marcar equipamento como treinamento")?;

    registrar_auditoria(conn, asset_id, &serde_json::json!({
        "acao": if is_training { "MARCADO_TREINAMENTO" } else { "DESMARCADO_TREINAMENTO" },
        "service_tag": asset.service_tag,
        "equipment_type": asset.equipment_type,
    }), usuario)?;

    obter_ativo(conn, asset_id)
}

// ============================================================
// VALIDAÇÃO DE SERVICE TAG EM TEMPO REAL
// ============================================================

pub fn verificar_service_tag_existe(conn: &mut PooledConn, tag: &str, exclude_id: Option<&str>) -> Result<bool> {
    let trimmed = tag.trim();
    if trimmed.is_empty() {
        return Ok(false);
    }
    let existe: bool = match exclude_id {
        Some(eid) => {
            let result: Option<i64> = conn
                .exec_first(
                    "SELECT COUNT(*) FROM assets WHERE service_tag = ? AND id != ?",
                    (trimmed, eid),
                )
                .unwrap_or(None);
            result.unwrap_or(0) > 0
        }
        None => {
            let result: Option<i64> = conn
                .exec_first(
                    "SELECT COUNT(*) FROM assets WHERE service_tag = ?",
                    (trimmed,),
                )
                .unwrap_or(None);
            result.unwrap_or(0) > 0
        }
    };
    Ok(existe)
}

// ============================================================
// TENDÊNCIA MENSAL DE AQUISIÇÃO
// ============================================================

pub fn obter_tendencia_mensal(conn: &mut PooledConn, meses: i64) -> Result<Vec<TrendPoint>> {
    let pontos = conn
        .exec_map(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') as period, COUNT(*) as total
             FROM assets
             WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
             GROUP BY period
             ORDER BY period ASC",
            (meses,),
            |(period, count): (String, i64)| TrendPoint { period, count },
        )
        .context("Falha ao obter tendência mensal")?;
    Ok(pontos)
}

// ============================================================
// ALERTAS DE GARANTIA
// ============================================================

pub fn listar_alertas_garantia(conn: &mut PooledConn, dias: i64) -> Result<Vec<WarrantyAlert>> {
    let alertas = conn
        .exec_map(
            "SELECT a.id, a.service_tag, b.name as branch_name, a.warranty_end,
                    DATEDIFF(a.warranty_end, NOW()) as days_remaining
             FROM assets a
             LEFT JOIN branches b ON b.id = a.branch_id
             WHERE a.deleted_at IS NULL
               AND a.warranty_end IS NOT NULL
               AND a.warranty_end != ''
               AND a.status != 'RETIRED'
               AND DATEDIFF(a.warranty_end, NOW()) <= ?
               AND DATEDIFF(a.warranty_end, NOW()) >= 0
             ORDER BY days_remaining ASC",
            (dias,),
            |(asset_id, service_tag, branch_name, warranty_end, days_remaining): (
                String, String, Option<String>, String, i64,
            )| {
                WarrantyAlert {
                    asset_id,
                    service_tag,
                    branch_name,
                    warranty_end,
                    days_remaining,
                }
            },
        )
        .context("Falha ao listar alertas de garantia")?;
    Ok(alertas)
}

// ============================================================
// ANEXOS (FOTOS / DOCUMENTOS)
// ============================================================

pub fn criar_anexo(conn: &mut PooledConn, asset_id: &str, filename: &str, filepath: &str, file_type: &str) -> Result<AssetAttachment> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "INSERT INTO asset_attachments (id, asset_id, filename, filepath, file_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?)",
        (&id, asset_id, filename, filepath, file_type, &now),
    )
    .context("Falha ao criar anexo")?;

    Ok(AssetAttachment { id, asset_id: asset_id.to_string(), filename: filename.to_string(), filepath: filepath.to_string(), file_type: file_type.to_string(), created_at: now })
}

pub fn listar_anexos(conn: &mut PooledConn, asset_id: &str) -> Result<Vec<AssetAttachment>> {
    let anexos = conn
        .exec_map(
            "SELECT id, asset_id, filename, filepath, file_type, created_at
             FROM asset_attachments
             WHERE asset_id = ?
             ORDER BY created_at DESC",
            (asset_id,),
            |(id, asset_id, filename, filepath, file_type, created_at): (
                String, String, String, String, String, String,
            )| {
                AssetAttachment {
                    id,
                    asset_id,
                    filename,
                    filepath,
                    file_type,
                    created_at,
                }
            },
        )
        .context("Falha ao listar anexos")?;
    Ok(anexos)
}

pub fn excluir_anexo(conn: &mut PooledConn, id: &str) -> Result<String> {
    let filepath: Option<String> = conn
        .exec_first("SELECT filepath FROM asset_attachments WHERE id = ?", (id,))
        .context("Falha ao buscar anexo")?;

    let filepath = filepath.ok_or_else(|| anyhow!("Anexo não encontrado"))?;

    conn.exec_drop("DELETE FROM asset_attachments WHERE id = ?", (id,))
        .context("Falha ao excluir anexo")?;

    Ok(filepath)
}

// ============================================================
// CUSTOS DE MANUTENÇÃO
// ============================================================

pub fn obter_custos_manutencao(conn: &mut PooledConn, inicio: Option<&str>, fim: Option<&str>) -> Result<Vec<MaintenanceCostSummary>> {
    let mut where_clauses = vec!["m.status = 'CLOSED'".to_string()];
    let mut param_values: Vec<mysql::Value> = Vec::new();

    if let Some(i) = inicio {
        where_clauses.push("m.sent_at >= ?".to_string());
        param_values.push(mysql::Value::from(i));
    }
    if let Some(f) = fim {
        where_clauses.push("m.sent_at <= ?".to_string());
        param_values.push(mysql::Value::from(f));
    }

    let where_sql = format!("WHERE {}", where_clauses.join(" AND "));

    let sql = format!(
        "SELECT m.supplier, b.name as branch_name, SUM(m.cost) as total_cost, COUNT(*) as count
         FROM maintenance_records m
         JOIN assets a ON a.id = m.asset_id
         LEFT JOIN branches b ON b.id = a.branch_id
         {}
         GROUP BY m.supplier, b.name
         ORDER BY total_cost DESC",
        where_sql
    );

    let custos = conn
        .exec_map(
            &sql,
            mysql::Params::Positional(param_values),
            |(supplier, branch_name, total_cost, count): (String, Option<String>, f64, i64)| {
                MaintenanceCostSummary {
                    supplier,
                    branch_name,
                    total_cost,
                    count,
                }
            },
        )
        .context("Falha ao obter custos de manutenção")?;
    Ok(custos)
}

// ============================================================
// CONTADORES PARA NOTIFICAÇÕES
// ============================================================

pub fn contar_notificacoes(conn: &mut PooledConn) -> Result<NotificationCounts> {
    let maintenance_open: i64 = conn
        .exec_first::<i64, _, _>("SELECT COUNT(*) FROM maintenance_records WHERE status = 'OPEN'", ())
        .unwrap_or(Some(0))
        .unwrap_or(0);

    let current_year: i64 = Utc::now().format("%Y").to_string().parse().unwrap_or(2026);
    let aging_limit = current_year - 5;
    let aging_count: i64 = conn
        .exec_first::<i64, _, _>(
            "SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL AND year IS NOT NULL AND year <= ? AND status != 'RETIRED'",
            (aging_limit,),
        )
        .unwrap_or(Some(0))
        .unwrap_or(0);

    // Garantias a vencer nos próximos 90 dias (ou já vencidas, status != RETIRED)
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let in_90  = (Utc::now() + chrono::Duration::days(90)).format("%Y-%m-%d").to_string();
    let warranty_expiring: i64 = conn
        .exec_first::<i64, _, _>(
            "SELECT COUNT(*) FROM assets
             WHERE deleted_at IS NULL AND warranty_end IS NOT NULL AND warranty_end <= ? AND warranty_end >= ?
             AND status != 'RETIRED'",
            (&in_90, &today),
        )
        .unwrap_or(Some(0))
        .unwrap_or(0);

    let desligados_aguardando: i64 = conn
        .exec_first::<i64, _, _>(
            "SELECT COUNT(*) FROM desligamentos WHERE status = 'AGUARDANDO'",
            (),
        )
        .unwrap_or(Some(0))
        .unwrap_or(0);

    Ok(NotificationCounts { maintenance_open, aging_count, warranty_expiring, desligados_aguardando })
}

/// Lê as últimas linhas do log do coletor automático.
pub fn ler_log_coletor() -> String {
    let path = std::path::PathBuf::from(r"C:\ProgramData\AssetAgro\collector.log");
    match std::fs::read_to_string(&path) {
        Ok(content) => {
            // Retorna as últimas 80 linhas
            let lines: Vec<&str> = content.lines().collect();
            let start = if lines.len() > 80 { lines.len() - 80 } else { 0 };
            lines[start..].join("\n")
        }
        Err(e) => format!("Log do coletor não encontrado.\nCaminho: {}\nErro: {}", path.display(), e),
    }
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================

const MAX_LOGIN_ATTEMPTS: i64 = 5;
const LOCKOUT_MINUTES: i64 = 15;

fn registrar_tentativa_login(conn: &mut PooledConn, username: &str, success: bool) -> Result<()> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let s: i64 = if success { 1 } else { 0 };
    conn.exec_drop(
        "INSERT INTO login_attempts (id, username, success, attempted_at) VALUES (?, ?, ?, ?)",
        (&id, username, s, &now),
    )?;
    Ok(())
}

fn verificar_bloqueio_login(conn: &mut PooledConn, username: &str) -> Result<bool> {
    let cutoff = (Utc::now() - chrono::Duration::minutes(LOCKOUT_MINUTES))
        .format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let failed: i64 = conn.exec_first(
        "SELECT COUNT(*) FROM login_attempts
         WHERE username = ? AND success = 0 AND attempted_at > ?
         AND attempted_at > COALESCE(
             (SELECT MAX(attempted_at) FROM login_attempts la2 WHERE la2.username = ? AND la2.success = 1),
             '2000-01-01'
         )",
        (username, &cutoff, username),
    )?.unwrap_or(0);

    Ok(failed >= MAX_LOGIN_ATTEMPTS)
}

pub fn autenticar_usuario(conn: &mut PooledConn, dto: &LoginDto) -> Result<User> {
    // Check lockout
    let locked = verificar_bloqueio_login(conn, &dto.username)?;
    if locked {
        return Err(anyhow!(
            "Conta bloqueada por {} tentativas falhas. Aguarde {} minutos.",
            MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES
        ));
    }

    let result: Option<(String, String, String, String, String, i8, String)> = conn
        .exec_first(
            "SELECT id, username, password, name, role, active, created_at FROM users WHERE username = ? AND active = 1",
            (&dto.username,),
        )
        .map_err(|_| anyhow!("Usuario ou senha invalidos"))?;

    let (id, username, password_hash, name, role, active, created_at) = match result {
        Some(r) => r,
        None => {
            registrar_tentativa_login(conn, &dto.username, false).ok();
            return Err(anyhow!("Usuario ou senha invalidos"));
        }
    };

    let valid = bcrypt::verify(&dto.password, &password_hash)
        .map_err(|_| anyhow!("Erro ao verificar senha"))?;

    if !valid {
        registrar_tentativa_login(conn, &dto.username, false).ok();
        return Err(anyhow!("Usuario ou senha invalidos"));
    }

    registrar_tentativa_login(conn, &dto.username, true).ok();

    Ok(User {
        id,
        username,
        name,
        role,
        active: active != 0,
        created_at,
    })
}

pub fn criar_usuario(conn: &mut PooledConn, dto: &CreateUserDto) -> Result<User> {
    // Check if username already exists
    let count: i64 = conn
        .exec_first::<i64, _, _>(
            "SELECT COUNT(*) FROM users WHERE username = ?",
            (&dto.username,),
        )
        .unwrap_or(Some(0))
        .unwrap_or(0);

    if count > 0 {
        return Err(anyhow!("Nome de usuário já existe"));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let password_hash = bcrypt::hash(&dto.password, bcrypt::DEFAULT_COST)
        .map_err(|e| anyhow!("Falha ao gerar hash: {}", e))?;

    conn.exec_drop(
        "INSERT INTO users (id, username, password, name, role, active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)",
        (&id, &dto.username, &password_hash, &dto.name, &dto.role, &now),
    )?;

    Ok(User {
        id,
        username: dto.username.clone(),
        name: dto.name.clone(),
        role: dto.role.clone(),
        active: true,
        created_at: now,
    })
}

pub fn listar_usuarios(conn: &mut PooledConn) -> Result<Vec<User>> {
    let users = conn
        .query_map(
            "SELECT id, username, name, role, active, created_at FROM users ORDER BY name ASC",
            |(id, username, name, role, active, created_at): (String, String, String, String, i8, String)| {
                User {
                    id,
                    username,
                    name,
                    role,
                    active: active != 0,
                    created_at,
                }
            },
        )
        .context("Falha ao listar usuários")?;
    Ok(users)
}

pub fn alterar_senha(conn: &mut PooledConn, dto: &ChangePasswordDto) -> Result<()> {
    let password_hash = bcrypt::hash(&dto.new_password, bcrypt::DEFAULT_COST)
        .map_err(|e| anyhow!("Falha ao gerar hash: {}", e))?;

    conn.exec_drop(
        "UPDATE users SET password = ? WHERE id = ?",
        (&password_hash, &dto.user_id),
    )?;

    let rows = conn.affected_rows();
    if rows == 0 {
        return Err(anyhow!("Usuário não encontrado"));
    }

    Ok(())
}

pub fn desativar_usuario(conn: &mut PooledConn, id: &str) -> Result<()> {
    conn.exec_drop(
        "UPDATE users SET active = 0 WHERE id = ?",
        (id,),
    )?;
    Ok(())
}

pub fn verificar_conexao(conn: &mut PooledConn) -> Result<bool, String> {
    conn.query_drop("SELECT 1")
        .map(|_| true)
        .map_err(|e| e.to_string())
}

// ============================================================
// Empréstimos / Retiradas
// ============================================================

// Extrai String de forma segura — row.get::<String> entra em pânico se o valor for NULL,
// então usamos Option<String> em todos os campos para evitar crash.
fn gs(row: &mysql::Row, idx: usize) -> String {
    row.get::<Option<String>, _>(idx).flatten().unwrap_or_default()
}
fn go(row: &mysql::Row, idx: usize) -> Option<String> {
    row.get::<Option<String>, _>(idx).flatten()
}

fn row_to_loan(row: mysql::Row) -> AssetLoan {
    AssetLoan {
        id:                gs(&row, 0),
        asset_id:          gs(&row, 1),
        tipo:              gs(&row, 2),
        responsavel:       gs(&row, 3),
        contato:           go(&row, 4),
        destino:           gs(&row, 5),
        destino_branch_id: go(&row, 6),
        data_saida:        gs(&row, 7),
        previsao_retorno:  go(&row, 8),
        data_retorno:      go(&row, 9),
        status:            gs(&row, 10),
        observacoes:       gs(&row, 11),
        registrado_por:    go(&row, 12),
        created_at:        gs(&row, 13),
        updated_at:        gs(&row, 14),
        service_tag:       go(&row, 15),
        asset_model:       go(&row, 16),
    }
}

const LOAN_SELECT: &str = "
    SELECT l.id, l.asset_id, l.tipo, l.responsavel, l.contato,
           l.destino, l.destino_branch_id, l.data_saida, l.previsao_retorno,
           l.data_retorno, l.status, l.observacoes, l.registrado_por,
           l.created_at, l.updated_at,
           a.service_tag, a.model AS asset_model
    FROM asset_loans l
    LEFT JOIN assets a ON l.asset_id = a.id";

pub fn criar_emprestimo(conn: &mut PooledConn, dto: &CreateLoanDto, usuario: &str) -> Result<AssetLoan> {
    // Verificar se já existe empréstimo ATIVO para este ativo
    let count: u64 = conn.exec_first(
        "SELECT COUNT(*) FROM asset_loans WHERE asset_id = ? AND status = 'ATIVO'",
        (&dto.asset_id,),
    )?.unwrap_or(0);

    if count > 0 {
        return Err(anyhow!("Este equipamento já possui um empréstimo ativo. Registre a devolução antes de criar um novo."));
    }

    let id  = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "INSERT INTO asset_loans
            (id, asset_id, tipo, responsavel, contato, destino, destino_branch_id,
             data_saida, previsao_retorno, data_retorno, status, observacoes,
             registrado_por, created_at, updated_at)
         VALUES (:id,:asset_id,:tipo,:responsavel,:contato,:destino,:destino_branch_id,
                 :data_saida,:previsao_retorno,NULL,'ATIVO',:observacoes,
                 :registrado_por,:created_at,:updated_at)",
        params! {
            "id"                => &id,
            "asset_id"          => &dto.asset_id,
            "tipo"              => &dto.tipo,
            "responsavel"       => &dto.responsavel,
            "contato"           => &dto.contato,
            "destino"           => &dto.destino,
            "destino_branch_id" => &dto.destino_branch_id,
            "data_saida"        => &dto.data_saida,
            "previsao_retorno"  => &dto.previsao_retorno,
            "observacoes"       => dto.observacoes.as_deref().unwrap_or(""),
            "registrado_por"    => &dto.registrado_por,
            "created_at"        => &now,
            "updated_at"        => &now,
        },
    ).context("Falha ao criar empréstimo")?;

    registrar_auditoria(conn, &dto.asset_id, &serde_json::json!({
        "acao": "EMPRESTIMO_CRIADO",
        "tipo": dto.tipo,
        "responsavel": dto.responsavel,
        "destino": dto.destino,
    }), usuario)?;

    let row = conn.exec_first::<mysql::Row, _, _>(
        &format!("{} WHERE l.id = ?", LOAN_SELECT), (&id,)
    )?.context("Empréstimo não encontrado após inserção")?;

    Ok(row_to_loan(row))
}

pub fn devolver_emprestimo(conn: &mut PooledConn, id: &str, observacoes: Option<&str>, usuario: &str) -> Result<AssetLoan> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let obs_update = if let Some(obs) = observacoes {
        format!(", observacoes = CONCAT(observacoes, '\n[Devolução] {}')", obs.replace('\'', "\\'"))
    } else {
        String::new()
    };

    conn.exec_drop(
        &format!(
            "UPDATE asset_loans SET status = 'DEVOLVIDO', data_retorno = ?, updated_at = ? {} WHERE id = ?",
            obs_update
        ),
        (&now, &now, id),
    ).context("Falha ao registrar devolução")?;

    // Busca asset_id para auditoria
    let asset_id: Option<String> = conn
        .exec_first("SELECT asset_id FROM asset_loans WHERE id = ?", (id,))?;
    if let Some(ref aid) = asset_id {
        registrar_auditoria(conn, aid, &serde_json::json!({
            "acao": "EMPRESTIMO_DEVOLVIDO",
        }), usuario)?;
    }

    let row = conn.exec_first::<mysql::Row, _, _>(
        &format!("{} WHERE l.id = ?", LOAN_SELECT), (id,)
    )?.context("Empréstimo não encontrado")?;

    Ok(row_to_loan(row))
}

pub fn listar_emprestimos(
    conn: &mut PooledConn,
    status_filter: Option<&str>,
    asset_id: Option<&str>,
) -> Result<Vec<AssetLoan>> {
    let mut conditions = Vec::new();
    if let Some(s) = status_filter {
        // Suporte a filtro ATRASADO: ativos com previsão vencida
        if s == "ATRASADO" {
            conditions.push("l.status = 'ATIVO' AND l.previsao_retorno IS NOT NULL AND l.previsao_retorno < NOW()".to_string());
        } else {
            conditions.push(format!("l.status = '{}'", s.replace('\'', "\\'")));
        }
    }
    if let Some(a) = asset_id {
        conditions.push(format!("l.asset_id = '{}'", a.replace('\'', "\\'")));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    let sql = format!("{}{} ORDER BY l.data_saida DESC", LOAN_SELECT, where_clause);
    let rows: Vec<mysql::Row> = conn.query(sql).context("Falha ao listar empréstimos")?;
    Ok(rows.into_iter().map(row_to_loan).collect())
}

pub fn excluir_emprestimo(conn: &mut PooledConn, id: &str) -> Result<()> {
    conn.exec_drop("DELETE FROM asset_loans WHERE id = ?", (id,))
        .context("Falha ao excluir empréstimo")
}

// ============================================================
// Observações / Notas
// ============================================================

fn row_to_nota(row: mysql::Row) -> Nota {
    Nota {
        id:         row.get(0).unwrap_or_default(),
        titulo:     row.get::<Option<String>, _>(1).unwrap_or_default().unwrap_or_default(),
        corpo:      row.get(2).unwrap_or_default(),
        categoria:  row.get(3).unwrap_or_default(),
        autor:      row.get::<Option<String>, _>(4).unwrap_or_default().unwrap_or_default(),
        created_at: row.get(5).unwrap_or_default(),
        updated_at: row.get(6).unwrap_or_default(),
    }
}

pub fn listar_notas(conn: &mut PooledConn, categoria: Option<&str>) -> Result<Vec<Nota>> {
    let sql = match categoria {
        Some(c) => format!(
            "SELECT id, titulo, corpo, categoria, autor, created_at, updated_at
             FROM notes WHERE categoria = '{}' ORDER BY created_at DESC",
            c.replace('\'', "\\'")
        ),
        None => "SELECT id, titulo, corpo, categoria, autor, created_at, updated_at
                 FROM notes ORDER BY created_at DESC".to_string(),
    };
    let rows: Vec<mysql::Row> = conn.query(sql).context("Falha ao listar notas")?;
    Ok(rows.into_iter().map(row_to_nota).collect())
}

pub fn criar_nota(conn: &mut PooledConn, dto: &CreateNotaDto) -> Result<Nota> {
    let id  = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "INSERT INTO notes (id, titulo, corpo, categoria, autor, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        (&id, &dto.titulo, &dto.corpo, &dto.categoria, &dto.autor, &now, &now),
    ).context("Falha ao criar nota")?;

    let row = conn.exec_first::<mysql::Row, _, _>(
        "SELECT id, titulo, corpo, categoria, autor, created_at, updated_at FROM notes WHERE id = ?",
        (&id,),
    )?.context("Nota não encontrada após inserção")?;

    Ok(row_to_nota(row))
}

pub fn atualizar_nota(conn: &mut PooledConn, id: &str, titulo: &str, corpo: &str, categoria: &str) -> Result<Nota> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "UPDATE notes SET titulo = ?, corpo = ?, categoria = ?, updated_at = ? WHERE id = ?",
        (titulo, corpo, categoria, &now, id),
    ).context("Falha ao atualizar nota")?;

    let row = conn.exec_first::<mysql::Row, _, _>(
        "SELECT id, titulo, corpo, categoria, autor, created_at, updated_at FROM notes WHERE id = ?",
        (id,),
    )?.context("Nota não encontrada")?;

    Ok(row_to_nota(row))
}

pub fn excluir_nota(conn: &mut PooledConn, id: &str) -> Result<()> {
    conn.exec_drop("DELETE FROM notes WHERE id = ?", (id,))
        .context("Falha ao excluir nota")
}

// ============================================================
// DESCARTE DE EQUIPAMENTOS
// ============================================================

const DESCARTE_SELECT: &str =
    "SELECT d.id, d.asset_id,
            a.service_tag, a.model AS asset_model, b.name AS branch_name,
            a.equipment_type, a.year,
            d.motivo, d.destino, d.responsavel,
            d.data_prevista, d.data_conclusao, d.status,
            COALESCE(d.observacoes, '') AS observacoes,
            d.registrado_por, d.created_at, d.updated_at
     FROM descartes d
     JOIN assets a ON d.asset_id = a.id
     LEFT JOIN branches b ON a.branch_id = b.id";

fn row_to_descarte(r: mysql::Row) -> Descarte {
    // Índices seguem DESCARTE_SELECT:
    // 0=d.id  1=d.asset_id  2=a.service_tag  3=a.model  4=b.name
    // 5=a.equipment_type  6=a.year  7=d.motivo  8=d.destino  9=d.responsavel
    // 10=d.data_prevista  11=d.data_conclusao  12=d.status  13=observacoes
    // 14=d.registrado_por  15=d.created_at  16=d.updated_at
    Descarte {
        id:             safe_str(&r, 0),
        asset_id:       safe_str(&r, 1),
        service_tag:    safe_opt(&r, 2),
        asset_model:    safe_opt(&r, 3),
        branch_name:    safe_opt(&r, 4),
        equipment_type: safe_opt(&r, 5),
        year:           safe_i64(&r, 6),
        motivo:         safe_str(&r, 7),
        destino:        safe_str(&r, 8),
        responsavel:    safe_str(&r, 9),
        data_prevista:  safe_opt(&r, 10),
        data_conclusao: safe_opt(&r, 11),
        status:         safe_str(&r, 12),
        observacoes:    safe_str(&r, 13),
        registrado_por: safe_opt(&r, 14),
        created_at:     safe_str(&r, 15),
        updated_at:     safe_str(&r, 16),
    }
}

/// Equipamentos candidatos ao descarte: 5+ anos, não baixados, sem descarte pendente
pub fn listar_candidatos_descarte(conn: &mut PooledConn) -> Result<Vec<Asset>> {
    let current_year: i64 = Utc::now().format("%Y").to_string().parse().unwrap_or(2026);
    let aging_limit = current_year - 5;

    let rows: Vec<mysql::Row> = conn.exec(
        &format!(
            "SELECT {} FROM assets a
             LEFT JOIN branches b ON a.branch_id = b.id
             WHERE a.status != 'RETIRED'
               AND a.deleted_at IS NULL
               AND a.year IS NOT NULL
               AND a.year <= ?
               AND NOT EXISTS (
                   SELECT 1 FROM descartes d
                   WHERE d.asset_id = a.id AND d.status = 'PENDENTE'
               )
             ORDER BY a.year ASC, a.service_tag ASC",
            ASSET_SELECT
        ),
        (aging_limit,),
    ).context("Falha ao listar candidatos ao descarte")?;

    Ok(rows.into_iter().map(row_to_asset).collect())
}

pub fn criar_descarte(conn: &mut PooledConn, dto: &CreateDescarteDto, usuario: &str) -> Result<Descarte> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "INSERT INTO descartes
            (id, asset_id, motivo, destino, responsavel, data_prevista, status, observacoes, registrado_por, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDENTE', ?, ?, ?, ?)",
        (
            &id, &dto.asset_id, &dto.motivo, &dto.destino, &dto.responsavel,
            &dto.data_prevista,
            dto.observacoes.as_deref().unwrap_or(""),
            &dto.registrado_por,
            &now, &now,
        ),
    ).context("Falha ao criar descarte")?;

    registrar_auditoria(conn, &dto.asset_id, &serde_json::json!({
        "acao": "DESCARTE_AGENDADO",
        "motivo": dto.motivo,
        "destino": dto.destino,
        "responsavel": dto.responsavel,
    }), usuario)?;

    let row = conn.exec_first::<mysql::Row, _, _>(
        &format!("{} WHERE d.id = ?", DESCARTE_SELECT),
        (&id,),
    )?.context("Descarte não encontrado após inserção")?;

    Ok(row_to_descarte(row))
}

pub fn listar_descartes(conn: &mut PooledConn, status: Option<&str>) -> Result<Vec<Descarte>> {
    let (where_clause, params): (String, Vec<mysql::Value>) = match status {
        Some(s) => (" WHERE d.status = ?".to_string(), vec![mysql::Value::from(s)]),
        None    => (String::new(), vec![]),
    };

    let rows: Vec<mysql::Row> = conn.exec(
        &format!("{}{} ORDER BY d.created_at DESC", DESCARTE_SELECT, where_clause),
        mysql::Params::Positional(params),
    ).context("Falha ao listar descartes")?;

    Ok(rows.into_iter().map(row_to_descarte).collect())
}

pub fn concluir_descarte(conn: &mut PooledConn, id: &str, usuario: &str) -> Result<Descarte> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // Busca asset_id antes de atualizar
    let asset_id: String = conn
        .exec_first::<String, _, _>("SELECT asset_id FROM descartes WHERE id = ?", (id,))?
        .context("Descarte não encontrado")?;

    // Marca descarte como concluído
    conn.exec_drop(
        "UPDATE descartes SET status = 'CONCLUIDO', data_conclusao = ?, updated_at = ? WHERE id = ?",
        (&today, &now, id),
    ).context("Falha ao concluir descarte")?;

    // Baixa o ativo
    conn.exec_drop(
        "UPDATE assets SET status = 'RETIRED', updated_at = ? WHERE id = ?",
        (&now, &asset_id),
    ).context("Falha ao baixar ativo no descarte")?;

    registrar_auditoria(conn, &asset_id, &serde_json::json!({
        "acao": "DESCARTE_CONCLUIDO",
        "status_anterior": "ativo",
        "status_novo": "RETIRED",
    }), usuario)?;

    let row = conn.exec_first::<mysql::Row, _, _>(
        &format!("{} WHERE d.id = ?", DESCARTE_SELECT),
        (id,),
    )?.context("Descarte não encontrado após conclusão")?;

    Ok(row_to_descarte(row))
}

pub fn cancelar_descarte(conn: &mut PooledConn, id: &str, usuario: &str) -> Result<Descarte> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Busca asset_id para auditoria
    let asset_id: Option<String> = conn
        .exec_first("SELECT asset_id FROM descartes WHERE id = ?", (id,))?;

    conn.exec_drop(
        "UPDATE descartes SET status = 'CANCELADO', updated_at = ? WHERE id = ?",
        (&now, id),
    ).context("Falha ao cancelar descarte")?;

    if let Some(ref aid) = asset_id {
        registrar_auditoria(conn, aid, &serde_json::json!({
            "acao": "DESCARTE_CANCELADO",
        }), usuario)?;
    }

    let row = conn.exec_first::<mysql::Row, _, _>(
        &format!("{} WHERE d.id = ?", DESCARTE_SELECT),
        (id,),
    )?.context("Descarte não encontrado após cancelamento")?;

    Ok(row_to_descarte(row))
}

// ============================================================
// DESLIGAMENTO DE COLABORADORES
// ============================================================

const DESLIGAMENTO_SELECT: &str =
    "SELECT d.id, d.asset_id, d.employee_name, d.service_tag,
            d.equipment_type, d.model, d.branch_name,
            d.data_desligamento, d.data_devolucao, d.status,
            COALESCE(d.observacoes, '') AS observacoes,
            d.registrado_por, d.created_at, d.updated_at
     FROM desligamentos d";

fn row_to_desligamento(row: mysql::Row) -> Desligamento {
    // Usa Option<String> para todas as colunas e depois converte,
    // evitando panic do row.get() quando o valor e NULL ou tipo inesperado.
    Desligamento {
        id:                 row.get::<Option<String>, _>("id").flatten().unwrap_or_default(),
        asset_id:           row.get::<Option<String>, _>("asset_id").flatten().unwrap_or_default(),
        employee_name:      row.get::<Option<String>, _>("employee_name").flatten().unwrap_or_default(),
        service_tag:        row.get::<Option<String>, _>("service_tag").flatten(),
        equipment_type:     row.get::<Option<String>, _>("equipment_type").flatten(),
        model:              row.get::<Option<String>, _>("model").flatten(),
        branch_name:        row.get::<Option<String>, _>("branch_name").flatten(),
        data_desligamento:  row.get::<Option<String>, _>("data_desligamento").flatten().unwrap_or_default(),
        data_devolucao:     row.get::<Option<String>, _>("data_devolucao").flatten(),
        status:             row.get::<Option<String>, _>("status").flatten().unwrap_or_default(),
        observacoes:        row.get::<Option<String>, _>("observacoes").flatten().unwrap_or_default(),
        registrado_por:     row.get::<Option<String>, _>("registrado_por").flatten(),
        created_at:         row.get::<Option<String>, _>("created_at").flatten().unwrap_or_default(),
        updated_at:         row.get::<Option<String>, _>("updated_at").flatten().unwrap_or_default(),
    }
}

/// Registra desligamento de colaborador — salva nome do colaborador, mantém ativo IN_USE até devolução
pub fn desligar_colaborador(conn: &mut PooledConn, dto: &CreateDesligamentoDto, usuario: &str) -> Result<Desligamento> {
    // Busca o ativo para capturar dados desnormalizados
    let asset = obter_ativo(conn, &dto.asset_id)?;

    if asset.status != "IN_USE" {
        return Err(anyhow!("Somente equipamentos EM USO podem ser marcados como desligamento."));
    }
    let emp_name = asset.employee_name.clone().unwrap_or_default();
    if emp_name.trim().is_empty() {
        return Err(anyhow!("Equipamento sem colaborador atribuido."));
    }

    // Verifica se já existe desligamento AGUARDANDO para este ativo
    let existing: Option<String> = conn.exec_first(
        "SELECT id FROM desligamentos WHERE asset_id = ? AND status = 'AGUARDANDO'",
        (&dto.asset_id,),
    )?;
    if existing.is_some() {
        return Err(anyhow!("Ja existe um desligamento aguardando devolucao para este equipamento."));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let obs = dto.observacoes.clone().unwrap_or_default();
    let reg = dto.registrado_por.clone().unwrap_or_default();
    let branch = asset.branch_name.clone().unwrap_or_default();

    let params: Vec<mysql::Value> = vec![
        id.clone().into(),
        dto.asset_id.clone().into(),
        emp_name.clone().into(),
        asset.service_tag.clone().into(),
        asset.equipment_type.clone().into(),
        asset.model.clone().into(),
        branch.into(),
        today.into(),
        obs.into(),
        reg.into(),
        now.clone().into(),
        now.into(),
    ];

    conn.exec_drop(
        "INSERT INTO desligamentos
            (id, asset_id, employee_name, service_tag, equipment_type, model, branch_name,
             data_desligamento, status, observacoes, registrado_por, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AGUARDANDO', ?, ?, ?, ?)",
        mysql::Params::Positional(params),
    ).context("Falha ao registrar desligamento")?;

    // Registra auditoria
    registrar_auditoria(conn, &dto.asset_id, &serde_json::json!({
        "acao": "DESLIGAMENTO",
        "colaborador": emp_name,
        "service_tag": asset.service_tag,
    }), usuario)?;

    let row = conn.exec_first::<mysql::Row, _, _>(
        &format!("{} WHERE d.id = ?", DESLIGAMENTO_SELECT),
        (&id,),
    )?.context("Desligamento nao encontrado apos insercao")?;

    Ok(row_to_desligamento(row))
}

/// Lista desligamentos com filtro opcional por status
pub fn listar_desligamentos(conn: &mut PooledConn, status: Option<&str>) -> Result<Vec<Desligamento>> {
    let (where_clause, params): (String, Vec<mysql::Value>) = match status {
        Some(s) => (" WHERE d.status = ?".to_string(), vec![mysql::Value::from(s)]),
        None    => (String::new(), vec![]),
    };

    let rows: Vec<mysql::Row> = conn.exec(
        &format!("{}{} ORDER BY d.created_at DESC", DESLIGAMENTO_SELECT, where_clause),
        mysql::Params::Positional(params),
    ).context("Falha ao listar desligamentos")?;

    Ok(rows.into_iter().map(row_to_desligamento).collect())
}

/// Confirma devolução do equipamento — asset vai para STOCK, employee_name limpo
pub fn confirmar_devolucao(conn: &mut PooledConn, id: &str, usuario: &str) -> Result<Desligamento> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // Busca dados do desligamento (usa Option para evitar panic)
    let row = conn.exec_first::<mysql::Row, _, _>(
        "SELECT asset_id, employee_name, status FROM desligamentos WHERE id = ?",
        (id,),
    )?.context("Desligamento nao encontrado")?;

    let status_atual: String = row.get::<Option<String>, _>("status").flatten().unwrap_or_default();
    if status_atual != "AGUARDANDO" {
        return Err(anyhow!("Este desligamento nao esta aguardando devolucao (status: {}).", status_atual));
    }

    let asset_id: String = row.get::<Option<String>, _>("asset_id").flatten().unwrap_or_default();
    let employee_name: String = row.get::<Option<String>, _>("employee_name").flatten().unwrap_or_default();

    if asset_id.is_empty() {
        return Err(anyhow!("Registro de desligamento sem asset_id valido."));
    }

    // Marca desligamento como DEVOLVIDO
    conn.exec_drop(
        "UPDATE desligamentos SET status = 'DEVOLVIDO', data_devolucao = ?, updated_at = ? WHERE id = ?",
        (&today, &now, id),
    ).context("Falha ao confirmar devolucao")?;

    // Move ativo para STOCK e limpa employee_name
    conn.exec_drop(
        "UPDATE assets SET status = 'STOCK', employee_name = NULL, updated_at = ? WHERE id = ?",
        (&now, &asset_id),
    ).context("Falha ao atualizar ativo para estoque")?;

    // Registra auditoria
    registrar_auditoria(conn, &asset_id, &serde_json::json!({
        "acao": "DEVOLUCAO_DESLIGAMENTO",
        "colaborador_anterior": employee_name,
        "status_anterior": "IN_USE",
        "status_novo": "STOCK",
    }), usuario)?;

    // Registra movimentacao
    let mov_id = Uuid::new_v4().to_string();
    conn.exec_drop(
        "INSERT INTO asset_movements (id, asset_id, movement_type, from_employee, to_employee, from_status, to_status, reason, created_at)
         VALUES (?, ?, 'RETURN', ?, NULL, 'IN_USE', 'STOCK', ?, ?)",
        (&mov_id, &asset_id, &employee_name, "Devolucao por desligamento de colaborador", &now),
    ).context("Falha ao registrar movimentacao")?;

    let result = conn.exec_first::<mysql::Row, _, _>(
        &format!("{} WHERE d.id = ?", DESLIGAMENTO_SELECT),
        (id,),
    )?.context("Desligamento nao encontrado apos confirmacao")?;

    Ok(row_to_desligamento(result))
}

/// Lista desligamentos de um ativo especifico (historico do equipamento)
pub fn listar_desligamentos_por_ativo(conn: &mut PooledConn, asset_id: &str) -> Result<Vec<Desligamento>> {
    let rows: Vec<mysql::Row> = conn.exec(
        &format!("{} WHERE d.asset_id = ? ORDER BY d.created_at DESC", DESLIGAMENTO_SELECT),
        (asset_id,),
    ).context("Falha ao listar desligamentos do ativo")?;

    Ok(rows.into_iter().map(row_to_desligamento).collect())
}

/// Cancela desligamento (engano, colaborador não foi desligado)
pub fn cancelar_desligamento(conn: &mut PooledConn, id: &str) -> Result<Desligamento> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "UPDATE desligamentos SET status = 'CANCELADO', updated_at = ? WHERE id = ?",
        (&now, id),
    ).context("Falha ao cancelar desligamento")?;

    let row = conn.exec_first::<mysql::Row, _, _>(
        &format!("{} WHERE d.id = ?", DESLIGAMENTO_SELECT),
        (id,),
    )?.context("Desligamento nao encontrado apos cancelamento")?;

    Ok(row_to_desligamento(row))
}

// ============================================================
// LIXEIRA — ativos soft-deleted
// ============================================================

pub fn listar_ativos_excluidos(conn: &mut PooledConn) -> Result<Vec<DeletedAsset>> {
    let rows: Vec<mysql::Row> = conn.query(
        "SELECT a.id, a.service_tag, a.equipment_type, a.employee_name,
                b.name AS branch_name, a.model, a.deleted_at, a.deleted_by
         FROM assets a
         LEFT JOIN branches b ON a.branch_id = b.id
         WHERE a.deleted_at IS NOT NULL
         ORDER BY a.deleted_at DESC"
    ).context("Falha ao listar ativos excluidos")?;

    Ok(rows.into_iter().map(|row| DeletedAsset {
        id:             row.get::<Option<String>, _>("id").flatten().unwrap_or_default(),
        service_tag:    row.get::<Option<String>, _>("service_tag").flatten().unwrap_or_default(),
        equipment_type: row.get::<Option<String>, _>("equipment_type").flatten().unwrap_or_default(),
        employee_name:  row.get::<Option<String>, _>("employee_name").flatten(),
        branch_name:    row.get::<Option<String>, _>("branch_name").flatten(),
        model:          row.get::<Option<String>, _>("model").flatten().unwrap_or_default(),
        deleted_at:     row.get::<Option<String>, _>("deleted_at").flatten().unwrap_or_default(),
        deleted_by:     row.get::<Option<String>, _>("deleted_by").flatten().unwrap_or_default(),
    }).collect())
}

pub fn restaurar_ativo(conn: &mut PooledConn, id: &str, usuario: &str) -> Result<Asset> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "UPDATE assets SET deleted_at = NULL, deleted_by = NULL, status = 'STOCK', updated_at = ? WHERE id = ?",
        (&now, id),
    ).context("Falha ao restaurar ativo")?;

    let rows = conn.affected_rows();
    if rows == 0 {
        return Err(anyhow!("Ativo nao encontrado na lixeira"));
    }

    registrar_auditoria(conn, id, &serde_json::json!({
        "acao": "RESTAURADO",
    }), usuario)?;

    // Need to read without the deleted filter - use direct query
    let sql = format!("{} WHERE a.id = ?", ASSET_SELECT);
    let row_result: Vec<mysql::Row> = conn.exec(&sql, (id,))
        .context("Falha ao buscar ativo restaurado")?;
    row_result.into_iter().next().map(row_to_asset)
        .ok_or_else(|| anyhow!("Ativo restaurado nao encontrado"))
}

// ============================================================
// Termos de responsabilidade
// ============================================================

pub fn criar_termo(
    conn: &mut PooledConn,
    dados: &CreateTermoDto,
    usuario: &str,
) -> Result<Termo> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "INSERT INTO termos (id, colaborador_id, colaborador_nome, colaborador_email, tipo, status, responsavel, observacoes, data_geracao, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'PENDENTE', ?, ?, ?, ?, ?)",
        (
            &id,
            &dados.colaborador_id,
            &dados.colaborador_nome,
            &dados.colaborador_email,
            &dados.tipo,
            &dados.responsavel,
            &dados.observacoes,
            &now,
            &now,
            &now,
        ),
    ).context("Falha ao criar termo")?;

    // Vincular ativos
    for asset_id in &dados.asset_ids {
        let ta_id = uuid::Uuid::new_v4().to_string();
        conn.exec_drop(
            "INSERT INTO termos_ativos (id, termo_id, asset_id, created_at) VALUES (?, ?, ?, ?)",
            (&ta_id, &id, asset_id, &now),
        ).context("Falha ao vincular ativo ao termo")?;
    }

    // Registra auditoria em cada ativo vinculado
    for asset_id in &dados.asset_ids {
        registrar_auditoria(conn, asset_id, &serde_json::json!({
            "acao": "TERMO_CRIADO",
            "termo_id": id,
            "colaborador": dados.colaborador_nome,
            "tipo": dados.tipo,
        }), usuario)?;
    }

    obter_termo(conn, &id)
}

pub fn obter_termo(conn: &mut PooledConn, id: &str) -> Result<Termo> {
    let row: mysql::Row = conn.exec_first(
        "SELECT id, colaborador_id, colaborador_nome, colaborador_email, tipo, status,
                responsavel, observacoes, arquivo_gerado, arquivo_assinado,
                d4sign_uuid, d4sign_status, d4sign_enviado_em,
                data_geracao, data_assinatura, created_at, updated_at
         FROM termos WHERE id = ?",
        (id,),
    )?.ok_or_else(|| anyhow!("Termo nao encontrado"))?;

    let mut termo = row_to_termo(row);

    // Buscar ativos vinculados
    let ativos: Vec<mysql::Row> = conn.exec(
        "SELECT ta.id, ta.termo_id, ta.asset_id, ta.created_at,
                a.service_tag, a.equipment_type, a.model, b.name AS branch_name
         FROM termos_ativos ta
         JOIN assets a ON ta.asset_id = a.id
         LEFT JOIN branches b ON a.branch_id = b.id
         WHERE ta.termo_id = ?
         ORDER BY a.service_tag",
        (id,),
    ).context("Falha ao buscar ativos do termo")?;

    termo.ativos = Some(ativos.into_iter().map(row_to_termo_ativo).collect());
    Ok(termo)
}

pub fn listar_termos(
    conn: &mut PooledConn,
    status: Option<&str>,
    tipo: Option<&str>,
) -> Result<Vec<Termo>> {
    let mut sql = String::from(
        "SELECT id, colaborador_id, colaborador_nome, colaborador_email, tipo, status,
                responsavel, observacoes, arquivo_gerado, arquivo_assinado,
                d4sign_uuid, d4sign_status, d4sign_enviado_em,
                data_geracao, data_assinatura, created_at, updated_at
         FROM termos WHERE 1=1"
    );
    let mut params: Vec<mysql::Value> = Vec::new();

    if let Some(s) = status {
        sql.push_str(" AND status = ?");
        params.push(s.into());
    }
    if let Some(t) = tipo {
        sql.push_str(" AND tipo = ?");
        params.push(t.into());
    }
    sql.push_str(" ORDER BY created_at DESC");

    let rows: Vec<mysql::Row> = conn.exec(&sql, mysql::Params::Positional(params))
        .context("Falha ao listar termos")?;

    Ok(rows.into_iter().map(row_to_termo).collect())
}

pub fn listar_termos_por_ativo(
    conn: &mut PooledConn,
    asset_id: &str,
) -> Result<Vec<Termo>> {
    let rows: Vec<mysql::Row> = conn.exec(
        "SELECT t.id, t.colaborador_id, t.colaborador_nome, t.colaborador_email, t.tipo, t.status,
                t.responsavel, t.observacoes, t.arquivo_gerado, t.arquivo_assinado,
                t.d4sign_uuid, t.d4sign_status, t.d4sign_enviado_em,
                t.data_geracao, t.data_assinatura, t.created_at, t.updated_at
         FROM termos t
         JOIN termos_ativos ta ON t.id = ta.termo_id
         WHERE ta.asset_id = ?
         ORDER BY t.created_at DESC",
        (asset_id,),
    ).context("Falha ao listar termos do ativo")?;

    Ok(rows.into_iter().map(row_to_termo).collect())
}

pub fn atualizar_termo(
    conn: &mut PooledConn,
    id: &str,
    dados: &UpdateTermoDto,
    usuario: &str,
) -> Result<Termo> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let mut sets = vec!["updated_at = ?".to_string()];
    let mut params: Vec<mysql::Value> = vec![now.clone().into()];

    macro_rules! set_if {
        ($field:ident) => {
            if let Some(ref v) = dados.$field {
                sets.push(format!("{} = ?", stringify!($field)));
                params.push(v.clone().into());
            }
        };
    }
    set_if!(status);
    set_if!(colaborador_email);
    set_if!(arquivo_gerado);
    set_if!(arquivo_assinado);
    set_if!(d4sign_uuid);
    set_if!(d4sign_status);
    set_if!(d4sign_enviado_em);
    set_if!(data_assinatura);
    set_if!(observacoes);

    params.push(id.into());
    let sql = format!("UPDATE termos SET {} WHERE id = ?", sets.join(", "));

    conn.exec_drop(&sql, mysql::Params::Positional(params))
        .context("Falha ao atualizar termo")?;

    // Auditoria nos ativos vinculados
    let asset_ids: Vec<String> = conn.exec(
        "SELECT asset_id FROM termos_ativos WHERE termo_id = ?", (id,),
    ).unwrap_or_default();
    for aid in &asset_ids {
        let _ = registrar_auditoria(conn, aid, &serde_json::json!({
            "acao": "TERMO_ATUALIZADO",
            "termo_id": id,
        }), usuario);
    }

    obter_termo(conn, id)
}

pub fn excluir_termo(conn: &mut PooledConn, id: &str, usuario: &str) -> Result<()> {
    // Buscar ativos antes de deletar (cascade vai apagar termos_ativos)
    let asset_ids: Vec<String> = conn.exec(
        "SELECT asset_id FROM termos_ativos WHERE termo_id = ?", (id,),
    ).unwrap_or_default();

    conn.exec_drop("DELETE FROM termos WHERE id = ?", (id,))
        .context("Falha ao excluir termo")?;

    for aid in &asset_ids {
        let _ = registrar_auditoria(conn, aid, &serde_json::json!({
            "acao": "TERMO_EXCLUIDO",
            "termo_id": id,
        }), usuario);
    }

    Ok(())
}

// ============================================================
// Configuração D4Sign
// ============================================================

pub fn obter_d4sign_config(conn: &mut PooledConn) -> Result<Option<D4SignConfig>> {
    let row: Option<mysql::Row> = conn.exec_first(
        "SELECT habilitado, token_api, crypt_key, cofre_uuid, base_url, envio_automatico, mensagem_email, updated_at
         FROM d4sign_config WHERE id = 1",
        (),
    ).context("Falha ao obter config D4Sign")?;

    Ok(row.map(|r| {
        let habilitado: i32 = r.get(0).unwrap_or(0);
        let envio_automatico: i32 = r.get(5).unwrap_or(0);
        D4SignConfig {
            habilitado: habilitado != 0,
            token_api: r.get(1).unwrap_or_default(),
            crypt_key: r.get(2).unwrap_or_default(),
            cofre_uuid: r.get(3).unwrap_or_default(),
            base_url: r.get(4).unwrap_or_default(),
            envio_automatico: envio_automatico != 0,
            mensagem_email: r.get(6),
            updated_at: r.get(7).unwrap_or_default(),
        }
    }))
}

pub fn salvar_d4sign_config(conn: &mut PooledConn, dados: &SaveD4SignConfigDto) -> Result<D4SignConfig> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let base_url = dados.base_url.as_deref().unwrap_or("https://sandbox.d4sign.com.br/api/v1");

    conn.exec_drop(
        "INSERT INTO d4sign_config (id, habilitado, token_api, crypt_key, cofre_uuid, base_url, envio_automatico, mensagem_email, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            habilitado = VALUES(habilitado),
            token_api = VALUES(token_api),
            crypt_key = VALUES(crypt_key),
            cofre_uuid = VALUES(cofre_uuid),
            base_url = VALUES(base_url),
            envio_automatico = VALUES(envio_automatico),
            mensagem_email = VALUES(mensagem_email),
            updated_at = VALUES(updated_at)",
        (
            dados.habilitado as i32,
            &dados.token_api,
            &dados.crypt_key,
            &dados.cofre_uuid,
            base_url,
            dados.envio_automatico as i32,
            &dados.mensagem_email,
            &now,
        ),
    ).context("Falha ao salvar config D4Sign")?;

    obter_d4sign_config(conn)?.ok_or_else(|| anyhow!("Config nao encontrada apos salvar"))
}

// ============================================================
// Helpers — termos
// ============================================================

fn safe_str(r: &mysql::Row, idx: usize) -> String {
    r.get::<Option<String>, _>(idx).flatten().unwrap_or_default()
}
fn safe_opt(r: &mysql::Row, idx: usize) -> Option<String> {
    r.get::<Option<String>, _>(idx).flatten()
}
fn safe_i64(r: &mysql::Row, idx: usize) -> Option<i64> {
    r.get::<Option<i64>, _>(idx).flatten()
}

fn row_to_termo(r: mysql::Row) -> Termo {
    let t = Termo {
        id: safe_str(&r, 0),
        colaborador_id: safe_opt(&r, 1),
        colaborador_nome: safe_str(&r, 2),
        colaborador_email: safe_opt(&r, 3),
        tipo: safe_str(&r, 4),
        status: safe_str(&r, 5),
        responsavel: safe_str(&r, 6),
        observacoes: safe_opt(&r, 7),
        arquivo_gerado: safe_opt(&r, 8),
        arquivo_assinado: safe_opt(&r, 9),
        d4sign_uuid: safe_opt(&r, 10),
        d4sign_status: safe_opt(&r, 11),
        d4sign_enviado_em: safe_opt(&r, 12),
        data_geracao: safe_str(&r, 13),
        data_assinatura: safe_opt(&r, 14),
        created_at: safe_str(&r, 15),
        updated_at: safe_str(&r, 16),
        ativos: None,
    };
    t
}

fn row_to_termo_ativo(r: mysql::Row) -> TermoAtivo {
    TermoAtivo {
        id: safe_str(&r, 0),
        termo_id: safe_str(&r, 1),
        asset_id: safe_str(&r, 2),
        created_at: safe_str(&r, 3),
        service_tag: safe_opt(&r, 4),
        equipment_type: safe_opt(&r, 5),
        model: safe_opt(&r, 6),
        branch_name: safe_opt(&r, 7),
    }
}


