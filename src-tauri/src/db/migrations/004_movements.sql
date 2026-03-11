-- Movimentações de equipamentos entre colaboradores
CREATE TABLE IF NOT EXISTS asset_movements (
    id              TEXT NOT NULL PRIMARY KEY,
    asset_id        TEXT NOT NULL,
    movement_type   TEXT NOT NULL CHECK(movement_type IN ('ASSIGN','RETURN','SWAP')),
    from_employee   TEXT,
    to_employee     TEXT,
    from_status     TEXT NOT NULL,
    to_status       TEXT NOT NULL,
    reason          TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_movements_asset ON asset_movements(asset_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON asset_movements(created_at);
