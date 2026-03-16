-- ============================================================
-- AssetAgro — Migração 010
-- Tabelas: asset_loans (Empréstimos/Retiradas) + notes (Observações)
-- Execute este script no servidor MySQL: 192.168.90.5
-- ============================================================

-- Tabela de Empréstimos e Retiradas para Manutenção
CREATE TABLE IF NOT EXISTS asset_loans (
    id                VARCHAR(36)  NOT NULL PRIMARY KEY,
    asset_id          VARCHAR(36)  NOT NULL,
    tipo              VARCHAR(20)  NOT NULL DEFAULT 'EMPRESTIMO'
                        COMMENT 'EMPRESTIMO | MANUTENCAO',
    responsavel       VARCHAR(255) NOT NULL
                        COMMENT 'Quem levou o equipamento',
    contato           VARCHAR(255) NULL
                        COMMENT 'Telefone ou contato do responsável',
    destino           VARCHAR(255) NOT NULL DEFAULT ''
                        COMMENT 'Para onde foi (texto livre)',
    destino_branch_id VARCHAR(36)  NULL
                        COMMENT 'Filial destino (opcional)',
    data_saida        VARCHAR(30)  NOT NULL
                        COMMENT 'Data/hora que saiu',
    previsao_retorno  VARCHAR(30)  NULL
                        COMMENT 'Previsão de retorno',
    data_retorno      VARCHAR(30)  NULL
                        COMMENT 'Data real de retorno (NULL = ainda fora)',
    status            VARCHAR(20)  NOT NULL DEFAULT 'ATIVO'
                        COMMENT 'ATIVO | DEVOLVIDO | ATRASADO',
    observacoes       TEXT         NOT NULL DEFAULT ''
                        COMMENT 'Observações livres',
    registrado_por    VARCHAR(255) NULL
                        COMMENT 'Usuário do sistema que registrou',
    created_at        VARCHAR(30)  NOT NULL,
    updated_at        VARCHAR(30)  NOT NULL,

    KEY idx_loans_asset  (asset_id),
    KEY idx_loans_status (status),
    KEY idx_loans_tipo   (tipo),
    KEY idx_loans_saida  (data_saida),

    CONSTRAINT fk_loans_asset FOREIGN KEY (asset_id)
        REFERENCES assets(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Empréstimos de equipamentos e retiradas para manutenção';

-- Tabela de Observações (notas gerais do setor de TI)
CREATE TABLE IF NOT EXISTS notes (
    id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    titulo     VARCHAR(255) NOT NULL DEFAULT '',
    corpo      TEXT         NOT NULL,
    categoria  VARCHAR(50)  NOT NULL DEFAULT 'GERAL'
                 COMMENT 'GERAL | TI | REUNIAO | ALERTA | OUTRO',
    autor      VARCHAR(255) NOT NULL DEFAULT '',
    created_at VARCHAR(30)  NOT NULL,
    updated_at VARCHAR(30)  NOT NULL,

    KEY idx_notes_categoria  (categoria),
    KEY idx_notes_created_at (created_at)
) ENGINE=InnoDB COMMENT='Observações e anotações do setor de TI';

-- Registra versão da migração
INSERT IGNORE INTO schema_version (version) VALUES (10);

-- ============================================================
-- Verificação: confirme que as tabelas foram criadas
-- ============================================================
-- SELECT TABLE_NAME, TABLE_COMMENT
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = 'assetagro'
--   AND TABLE_NAME IN ('asset_loans', 'notes');
