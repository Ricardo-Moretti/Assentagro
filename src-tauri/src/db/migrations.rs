use anyhow::{Context, Result};
use bcrypt::{hash, DEFAULT_COST};
use log::info;
use mysql::prelude::*;
use mysql::*;

/// Executa migrações pendentes — cria tabelas se não existem
pub fn executar_migracoes(conn: &mut PooledConn) -> Result<()> {
    // Tabela de controle de versão do schema
    conn.query_drop(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version    INT      NOT NULL PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB"
    ).context("Falha ao criar tabela schema_version")?;

    let versao_atual: i32 = conn
        .query_first("SELECT COALESCE(MAX(version), 0) FROM schema_version")
        .context("Falha ao obter versão atual")?
        .unwrap_or(0);

    if versao_atual < 1 {
        info!("Executando migrações MySQL...");

        // Branches
        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS branches (
                id   VARCHAR(36)  NOT NULL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            ) ENGINE=InnoDB"
        )?;

        // Seed branches
        conn.query_drop(
            "INSERT IGNORE INTO branches (id, name) VALUES
                ('br-riopreto','Rio Preto'),('br-catanduva','Catanduva'),
                ('br-jales','Jales'),('br-votuporanga','Votuporanga'),
                ('br-tupa','Tupã'),('br-marilia','Marília'),
                ('br-ituverava','Ituverava'),('br-guaira','Guairá'),
                ('br-barretos','Barretos'),('br-araraquara','Araraquara'),
                ('br-montealto','Monte Alto'),('br-bebedouro','Bebedouro'),
                ('br-orlandia','Orlândia'),('br-franca','Franca'),
                ('br-itapolis','Itápolis'),('br-ribeirao','Ribeirão')"
        )?;

        // Assets
        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS assets (
                id                  VARCHAR(36)  NOT NULL PRIMARY KEY,
                service_tag         VARCHAR(100) NOT NULL,
                equipment_type      VARCHAR(20)  NOT NULL,
                status              VARCHAR(20)  NOT NULL,
                employee_name       VARCHAR(255) NULL,
                branch_id           VARCHAR(36)  NOT NULL,
                ram_gb              INT          NOT NULL DEFAULT 0,
                storage_capacity_gb INT          NOT NULL DEFAULT 0,
                storage_type        VARCHAR(20)  NOT NULL DEFAULT 'SSD_SATA',
                os                  VARCHAR(100) NOT NULL DEFAULT '',
                cpu                 VARCHAR(100) NOT NULL DEFAULT '',
                notes               TEXT         NOT NULL,
                model               VARCHAR(100) NOT NULL DEFAULT '',
                year                INT          NULL,
                is_training         TINYINT(1)   NOT NULL DEFAULT 0,
                warranty_start      VARCHAR(30)  NULL,
                warranty_end        VARCHAR(30)  NULL,
                created_at          VARCHAR(30)  NOT NULL,
                updated_at          VARCHAR(30)  NOT NULL,
                UNIQUE KEY idx_assets_service_tag (service_tag),
                KEY idx_assets_branch_id      (branch_id),
                KEY idx_assets_status         (status),
                KEY idx_assets_equipment_type (equipment_type),
                KEY idx_assets_employee_name  (employee_name),
                KEY idx_assets_created_at     (created_at),
                CONSTRAINT fk_assets_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
                    ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB"
        )?;

        // Audit
        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS asset_audit (
                id           VARCHAR(36) NOT NULL PRIMARY KEY,
                asset_id     VARCHAR(36) NOT NULL,
                changed_at   VARCHAR(30) NOT NULL,
                changes_json TEXT        NOT NULL,
                KEY idx_audit_asset_id (asset_id),
                CONSTRAINT fk_audit_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB"
        )?;

        // Movements
        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS asset_movements (
                id              VARCHAR(36)  NOT NULL PRIMARY KEY,
                asset_id        VARCHAR(36)  NOT NULL,
                movement_type   VARCHAR(20)  NOT NULL,
                from_employee   VARCHAR(255) NULL,
                to_employee     VARCHAR(255) NULL,
                from_status     VARCHAR(20)  NOT NULL,
                to_status       VARCHAR(20)  NOT NULL,
                reason          TEXT         NOT NULL,
                created_at      VARCHAR(30)  NOT NULL,
                KEY idx_movements_asset (asset_id),
                KEY idx_movements_date  (created_at),
                CONSTRAINT fk_movements_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB"
        )?;

        // App settings
        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS app_settings (
                `key`   VARCHAR(100) NOT NULL PRIMARY KEY,
                `value` TEXT         NOT NULL
            ) ENGINE=InnoDB"
        )?;

        // Employees
        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS employees (
                id         VARCHAR(36)  NOT NULL PRIMARY KEY,
                name       VARCHAR(255) NOT NULL,
                branch_id  VARCHAR(36)  NULL,
                active     TINYINT(1)   NOT NULL DEFAULT 1,
                created_at VARCHAR(30)  NOT NULL,
                KEY idx_employees_name   (name),
                KEY idx_employees_branch (branch_id),
                CONSTRAINT fk_employees_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
                    ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB"
        )?;

        // Maintenance records
        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS maintenance_records (
                id                   VARCHAR(36)    NOT NULL PRIMARY KEY,
                asset_id             VARCHAR(36)    NOT NULL,
                supplier             VARCHAR(255)   NOT NULL DEFAULT '',
                expected_return_date VARCHAR(30)    NULL,
                cost                 DECIMAL(10,2)  NOT NULL DEFAULT 0,
                notes                TEXT           NOT NULL,
                sent_at              VARCHAR(30)    NOT NULL,
                returned_at          VARCHAR(30)    NULL,
                status               VARCHAR(20)    NOT NULL DEFAULT 'OPEN',
                KEY idx_maint_asset  (asset_id),
                KEY idx_maint_status (status),
                CONSTRAINT fk_maint_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB"
        )?;

        // Attachments
        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS asset_attachments (
                id         VARCHAR(36)  NOT NULL PRIMARY KEY,
                asset_id   VARCHAR(36)  NOT NULL,
                filename   VARCHAR(255) NOT NULL,
                filepath   VARCHAR(500) NOT NULL,
                file_type  VARCHAR(20)  NOT NULL DEFAULT 'image',
                created_at VARCHAR(30)  NOT NULL,
                KEY idx_attachments_asset (asset_id),
                CONSTRAINT fk_attachments_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB"
        )?;

        // Users
        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS users (
                id         VARCHAR(36)  NOT NULL PRIMARY KEY,
                username   VARCHAR(100) NOT NULL,
                password   VARCHAR(255) NOT NULL,
                name       VARCHAR(255) NOT NULL,
                role       VARCHAR(20)  NOT NULL DEFAULT 'user',
                active     TINYINT(1)   NOT NULL DEFAULT 1,
                created_at VARCHAR(30)  NOT NULL,
                UNIQUE KEY idx_users_username (username)
            ) ENGINE=InnoDB"
        )?;

        // Register all versions
        conn.query_drop(
            "INSERT IGNORE INTO schema_version (version) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9)"
        )?;

        info!("Migrações MySQL concluídas.");
    }

    // Migration 010 — Empréstimos e Observações
    if versao_atual < 10 {
        info!("Executando migração 010: asset_loans + notes...");

        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS asset_loans (
                id                VARCHAR(36)  NOT NULL PRIMARY KEY,
                asset_id          VARCHAR(36)  NOT NULL,
                tipo              VARCHAR(20)  NOT NULL DEFAULT 'EMPRESTIMO',
                responsavel       VARCHAR(255) NOT NULL,
                contato           VARCHAR(255) NULL,
                destino           VARCHAR(255) NOT NULL DEFAULT '',
                destino_branch_id VARCHAR(36)  NULL,
                data_saida        VARCHAR(30)  NOT NULL,
                previsao_retorno  VARCHAR(30)  NULL,
                data_retorno      VARCHAR(30)  NULL,
                status            VARCHAR(20)  NOT NULL DEFAULT 'ATIVO',
                observacoes       TEXT         NULL,
                registrado_por    VARCHAR(255) NULL,
                created_at        VARCHAR(30)  NOT NULL,
                updated_at        VARCHAR(30)  NOT NULL,
                KEY idx_loans_asset  (asset_id),
                KEY idx_loans_status (status),
                KEY idx_loans_tipo   (tipo),
                CONSTRAINT fk_loans_asset FOREIGN KEY (asset_id)
                    REFERENCES assets(id) ON DELETE CASCADE
            ) ENGINE=InnoDB"
        )?;

        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS notes (
                id         VARCHAR(36)  NOT NULL PRIMARY KEY,
                titulo     VARCHAR(255) NOT NULL DEFAULT '',
                corpo      TEXT         NOT NULL,
                categoria  VARCHAR(50)  NOT NULL DEFAULT 'GERAL',
                autor      VARCHAR(255) NOT NULL DEFAULT '',
                created_at VARCHAR(30)  NOT NULL,
                updated_at VARCHAR(30)  NOT NULL,
                KEY idx_notes_categoria  (categoria),
                KEY idx_notes_created_at (created_at)
            ) ENGINE=InnoDB"
        )?;

        conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (10)")?;
        info!("Migração 010 concluída.");
    }

    // Migration 011 — Descarte de equipamentos
    if versao_atual < 11 {
        info!("Executando migração 011: descartes...");

        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS descartes (
                id              VARCHAR(36)  NOT NULL PRIMARY KEY,
                asset_id        VARCHAR(36)  NOT NULL,
                motivo          VARCHAR(50)  NOT NULL DEFAULT 'OBSOLESCENCIA',
                destino         VARCHAR(255) NOT NULL DEFAULT '',
                responsavel     VARCHAR(255) NOT NULL DEFAULT '',
                data_prevista   VARCHAR(30)  NULL,
                data_conclusao  VARCHAR(30)  NULL,
                status          VARCHAR(20)  NOT NULL DEFAULT 'PENDENTE',
                observacoes     TEXT         NULL,
                registrado_por  VARCHAR(255) NULL,
                created_at      VARCHAR(30)  NOT NULL,
                updated_at      VARCHAR(30)  NOT NULL,
                KEY idx_descartes_asset  (asset_id),
                KEY idx_descartes_status (status),
                CONSTRAINT fk_descartes_asset FOREIGN KEY (asset_id)
                    REFERENCES assets(id) ON DELETE CASCADE
            ) ENGINE=InnoDB"
        )?;

        conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (11)")?;
        info!("Migração 011 concluída.");
    }

    // Migration 012 — Desligamento de colaboradores
    if versao_atual < 12 {
        info!("Executando migracao 012: desligamentos...");

        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS desligamentos (
                id               VARCHAR(36)  NOT NULL PRIMARY KEY,
                asset_id         VARCHAR(36)  NOT NULL,
                employee_name    VARCHAR(255) NOT NULL,
                service_tag      VARCHAR(100) NULL,
                equipment_type   VARCHAR(20)  NULL,
                model            VARCHAR(255) NULL,
                branch_name      VARCHAR(255) NULL,
                data_desligamento VARCHAR(30) NOT NULL,
                data_devolucao   VARCHAR(30)  NULL,
                status           VARCHAR(20)  NOT NULL DEFAULT 'AGUARDANDO',
                observacoes      TEXT         NULL,
                registrado_por   VARCHAR(255) NULL,
                created_at       VARCHAR(30)  NOT NULL,
                updated_at       VARCHAR(30)  NOT NULL,
                KEY idx_deslig_asset  (asset_id),
                KEY idx_deslig_status (status),
                CONSTRAINT fk_deslig_asset FOREIGN KEY (asset_id)
                    REFERENCES assets(id) ON DELETE CASCADE
            ) ENGINE=InnoDB"
        )?;

        conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (12)")?;
        info!("Migracao 012 concluida.");
    }

    // Migration 013 — Auditoria com rastreamento de usuario
    if versao_atual < 13 {
        info!("Executando migracao 013: audit changed_by...");
        conn.query_drop(
            "ALTER TABLE asset_audit ADD COLUMN changed_by VARCHAR(255) NULL AFTER changes_json"
        )?;
        conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (13)")?;
        info!("Migracao 013 concluida.");
    }

    // Migration 014 — Controle de tentativas de login
    if versao_atual < 14 {
        info!("Executando migracao 014: login_attempts...");

        conn.query_drop(
            "CREATE TABLE IF NOT EXISTS login_attempts (
                id           VARCHAR(36)  NOT NULL PRIMARY KEY,
                username     VARCHAR(100) NOT NULL,
                success      TINYINT(1)   NOT NULL DEFAULT 0,
                ip_info      VARCHAR(100) NULL,
                attempted_at VARCHAR(30)  NOT NULL,
                KEY idx_attempts_user (username),
                KEY idx_attempts_at   (attempted_at)
            ) ENGINE=InnoDB"
        )?;

        conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (14)")?;
        info!("Migracao 014 concluida.");
    }

    // Migration 015 — Soft delete de ativos
    if versao_atual < 15 {
        info!("Executando migracao 015: soft delete...");

        conn.query_drop(
            "ALTER TABLE assets ADD COLUMN deleted_at VARCHAR(30) NULL"
        )?;
        conn.query_drop(
            "ALTER TABLE assets ADD COLUMN deleted_by VARCHAR(255) NULL"
        )?;

        conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (15)")?;
        info!("Migracao 015 concluida.");
    }

    // Seed default admin user
    seed_admin_user(conn)?;

    Ok(())
}

/// Creates the default admin user if no users exist
fn seed_admin_user(conn: &mut PooledConn) -> Result<()> {
    let count: i64 = conn
        .query_first("SELECT COUNT(*) FROM users")
        .context("Falha ao contar users")?
        .unwrap_or(0);

    if count == 0 {
        let password_hash =
            hash("Tracbel@2025!", DEFAULT_COST).context("Falha ao gerar hash da senha")?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();

        conn.exec_drop(
            "INSERT INTO users (id, username, password, name, role, active, created_at)
             VALUES (?, ?, ?, ?, ?, 1, ?)",
            (&id, "admin", &password_hash, "Administrador", "admin", &now),
        )?;
        info!("Usuário admin padrão criado.");
    }

    Ok(())
}
