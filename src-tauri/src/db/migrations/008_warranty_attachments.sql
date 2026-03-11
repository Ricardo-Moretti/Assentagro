-- Migration 008: Warranty columns + Attachments table
-- Todas as alterações são aditivas — dados existentes preservados

-- Colunas de garantia no assets (NULL default para registros existentes)
ALTER TABLE assets ADD COLUMN warranty_start TEXT;
ALTER TABLE assets ADD COLUMN warranty_end TEXT;

-- Tabela de anexos (fotos/documentos) dos equipamentos
CREATE TABLE IF NOT EXISTS asset_attachments (
    id         TEXT NOT NULL PRIMARY KEY,
    asset_id   TEXT NOT NULL,
    filename   TEXT NOT NULL,
    filepath   TEXT NOT NULL,
    file_type  TEXT NOT NULL DEFAULT 'image',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_asset ON asset_attachments(asset_id);
