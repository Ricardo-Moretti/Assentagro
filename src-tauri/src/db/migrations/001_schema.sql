-- AssetAgro — Migração 001: Schema Principal
-- Tabelas, constraints e índices para gestão de ativos de TI

-- ============================================================
-- TABELA: branches (Filiais fixas, gerenciadas pelo seed)
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
    id   TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- ============================================================
-- TABELA: assets (Ativos de TI)
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
    id                  TEXT    NOT NULL PRIMARY KEY,
    service_tag         TEXT    NOT NULL UNIQUE,
    equipment_type      TEXT    NOT NULL CHECK(equipment_type IN ('NOTEBOOK','DESKTOP')),
    status              TEXT    NOT NULL CHECK(status IN ('IN_USE','STOCK','MAINTENANCE','RETIRED')),
    employee_name       TEXT,
    branch_id           TEXT    NOT NULL,
    ram_gb              INTEGER NOT NULL DEFAULT 0,
    storage_capacity_gb INTEGER NOT NULL DEFAULT 0,
    storage_type        TEXT    NOT NULL DEFAULT 'SSD_SATA' CHECK(storage_type IN ('SSD_SATA','SSD_NVME','HDD')),
    os                  TEXT    NOT NULL DEFAULT '',
    cpu                 TEXT    NOT NULL DEFAULT '',
    notes               TEXT    NOT NULL DEFAULT '',
    created_at          TEXT    NOT NULL,
    updated_at          TEXT    NOT NULL,

    FOREIGN KEY (branch_id) REFERENCES branches(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- ============================================================
-- TABELA: asset_audit (Log de alterações — Phase 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_audit (
    id           TEXT NOT NULL PRIMARY KEY,
    asset_id     TEXT NOT NULL,
    changed_at   TEXT NOT NULL,
    changes_json TEXT NOT NULL,

    FOREIGN KEY (asset_id) REFERENCES assets(id)
        ON DELETE CASCADE
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_assets_service_tag     ON assets(service_tag);
CREATE INDEX IF NOT EXISTS idx_assets_branch_id       ON assets(branch_id);
CREATE INDEX IF NOT EXISTS idx_assets_status          ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_equipment_type  ON assets(equipment_type);
CREATE INDEX IF NOT EXISTS idx_assets_employee_name   ON assets(employee_name);
CREATE INDEX IF NOT EXISTS idx_assets_created_at      ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_asset_id         ON asset_audit(asset_id);
