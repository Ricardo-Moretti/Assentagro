-- Migração 005: Tabela de configurações do app
CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
);
