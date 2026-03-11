-- AssetAgro — Migração 003: Adiciona campos model e year
ALTER TABLE assets ADD COLUMN model TEXT NOT NULL DEFAULT '';
ALTER TABLE assets ADD COLUMN year INTEGER;
