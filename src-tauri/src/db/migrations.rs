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
