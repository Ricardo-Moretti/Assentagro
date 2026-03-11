-- Migration 007: Unique service_tag + coluna is_training
-- Segurança: IF NOT EXISTS / idempotente

-- Índice UNIQUE para service_tag (impede duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_service_tag ON assets(service_tag);

-- Coluna is_training para marcar notebooks de treinamento
ALTER TABLE assets ADD COLUMN is_training INTEGER NOT NULL DEFAULT 0;