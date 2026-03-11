-- AssetAgro — Migracao 006: Tabelas employees e maintenance_records

-- ============================================================
-- TABELA: employees (Cadastro de Colaboradores)
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id         TEXT    NOT NULL PRIMARY KEY,
    name       TEXT    NOT NULL,
    branch_id  TEXT,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (branch_id) REFERENCES branches(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employees_name   ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);

-- Seed: popular employees a partir dos dados existentes em assets
INSERT OR IGNORE INTO employees (id, name, branch_id, active, created_at)
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
    employee_name,
    branch_id,
    1,
    datetime('now')
FROM assets
WHERE employee_name IS NOT NULL AND employee_name != ''
GROUP BY employee_name, branch_id;

-- ============================================================
-- TABELA: maintenance_records (Registros de Manutencao)
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_records (
    id                   TEXT NOT NULL PRIMARY KEY,
    asset_id             TEXT NOT NULL,
    supplier             TEXT NOT NULL DEFAULT '',
    expected_return_date TEXT,
    cost                 REAL NOT NULL DEFAULT 0,
    notes                TEXT NOT NULL DEFAULT '',
    sent_at              TEXT NOT NULL,
    returned_at          TEXT,
    status               TEXT NOT NULL DEFAULT 'OPEN'
        CHECK(status IN ('OPEN','CLOSED')),

    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_maint_asset  ON maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance_records(status);
