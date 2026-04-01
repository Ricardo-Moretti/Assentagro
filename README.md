# AssetAgro — Controle de Ativos de TI

**Sistema de gestao de ativos de tecnologia para filiais — Tracbel Agro**

Versao atual: **1.8.5** | Plataforma: **Windows (desktop)** | Banco: **MySQL 8.0**

---

## Visao Geral

AssetAgro e um aplicativo desktop desenvolvido para o controle completo do ciclo de vida dos equipamentos de TI (notebooks, desktops, perifericos) distribuidos nas 16 filiais da Tracbel Agro. O sistema opera 100% na rede interna da empresa, com atualizacao automatica via servidor dedicado.

### Numeros do Projeto

| Metrica | Valor |
|---|---|
| Linhas de codigo Rust (backend) | 5.466 |
| Linhas de codigo TypeScript/React (frontend) | 15.264 |
| Modulos de funcionalidades | 17 |
| Tabelas no banco de dados | 18 |
| Commands registrados no Tauri | 113 |
| Commits no repositorio | 49+ |

---

## Tecnologias

### Backend (Rust + Tauri 2)
- **Tauri 2** — framework desktop com WebView2
- **MySQL 25** — conector nativo MySQL
- **Reqwest 0.12** — HTTP client para API D4Sign
- **Bcrypt 0.17** — hash de senhas
- **Tokio** — runtime assincrono
- **Serde/Serde JSON** — serializacao de dados

### Frontend (React + TypeScript)
- **React 18.3** + **TypeScript 5.7**
- **Vite 6** — build tool
- **Tailwind CSS 3.4** — estilizacao
- **Zustand 5** — gerenciamento de estado
- **Framer Motion** — animacoes
- **Recharts** — graficos e dashboards
- **pdf-lib** — geracao de PDFs
- **xlsx** — exportacao Excel
- **Lucide React** — icones

---

## Funcionalidades

### Gestao de Ativos
- Cadastro completo de equipamentos (service tag, modelo, CPU, RAM, disco, SO)
- Status de lifecycle: **Estoque**, **Em Uso**, **Manutencao**, **Baixado**
- Atribuicao, reatribuicao, devolucao e troca de equipamentos entre colaboradores
- Busca avancada com filtros por filial, tipo, status, RAM, disco, SO
- Ordenacao por qualquer coluna
- Service tag unica com validacao

### Dashboard Interativo
- Visao geral com totais por status, tipo e filial
- Grid ano/filial clicavel com detalhamento
- Graficos de distribuicao por OS, RAM, tipo de disco
- Tendencia mensal de aquisicoes
- Alertas de envelhecimento de equipamentos
- Alertas de garantia expirando

### Movimentacoes
- Registro completo de todas as transferencias
- Historico por ativo e por colaborador
- Operacoes em lote (devolucao e baixa)
- Timeline visual no detalhe do ativo

### Manutencao
- Envio para manutencao com fornecedor e custo
- Rastreamento de prazo e retorno
- Relatorio de custos por fornecedor e filial

### Termos de Responsabilidade + Assinatura Digital (D4Sign)
- Criacao de termos de entrega, devolucao e troca
- Geracao de PDF profissional com logo, dados do colaborador, tabela de equipamentos e clausulas
- Integracao com **D4Sign** para assinatura digital:
  - Upload automatico do PDF
  - Envio para assinatura via email
  - Consulta de status em tempo real
  - Download do documento assinado
- Visualizacao inline do PDF no app
- Termos vinculados ao ativo (visivel na ficha do equipamento)

### Emprestimos e Retiradas
- Registro de emprestimos com responsavel, destino e previsao
- Controle de atraso automatico
- Devolucao com observacoes

### Desligamento de Colaboradores
- Workflow de desligamento com rastreamento de devolucao
- Lista de equipamentos pendentes de devolucao
- Confirmacao de devolucao e cancelamento

### Descarte de Equipamentos
- Candidatos ao descarte
- Motivos: obsolescencia, defeito irreparavel, furto, perda, doacao, venda
- Fluxo: pendente → concluido / cancelado

### Lixeira (Soft Delete)
- Exclusao segura com possibilidade de restauracao
- Registro de quem excluiu e quando
- Restauracao apenas por administradores

### Importacao e Exportacao
- Importacao em lote via Excel
- Exportacao Excel com filtros por filial
- 4 relatorios profissionais (por colaborador, por filial, manutencoes, geral)

### Auditoria
- Registro automatico de todas as alteracoes
- Rastreamento de usuario responsavel
- Exportacao do log de auditoria

### Coletor Automatico de Hardware
- Executavel separado (`assetagro-collector`) que roda nas maquinas
- Coleta automatica: service tag, CPU, RAM, disco, SO, modelo
- Envia dados direto para o banco MySQL
- Cria ou atualiza ativos automaticamente

### Atualizacao Automatica
- Servidor de atualizacao na rede interna (HTTP + assinatura Ed25519)
- Clientes verificam e instalam atualizacoes automaticamente ao iniciar
- Assinatura criptografica garante integridade do instalador

---

## Arquitetura de Seguranca

### Autenticacao e Controle de Acesso

| Mecanismo | Implementacao |
|---|---|
| Hash de senhas | **bcrypt** com 12 rounds (DEFAULT_COST) |
| Bloqueio de conta | 5 tentativas falhadas → lockout de 15 minutos |
| Rastreamento de login | Tabela `login_attempts` registra todas as tentativas |
| Controle de acesso | RBAC com perfis **admin** e **user** |
| Validacao de role | Verificado no backend via banco (nao confia no frontend) |
| Timeout de sessao | Sessao expira apos inatividade prolongada |

### Protecao de Dados

| Mecanismo | Implementacao |
|---|---|
| Queries parametrizadas | Todas as queries usam prepared statements (anti SQL injection) |
| Auditoria completa | Tabela `asset_audit` com JSON de alteracoes + usuario |
| Soft delete | Ativos excluidos sao marcados, nao apagados |
| Validacao de paths | `validar_path_seguro()` previne path traversal |
| Escopo de filesystem | Restrito a `$APPDATA/com.tracbelagro.assetagro/**` |
| CSP (Content Security Policy) | Configurado no Tauri para prevenir XSS |

### Integracao D4Sign

| Mecanismo | Implementacao |
|---|---|
| Tokens da API | Armazenados no banco, nao no codigo-fonte |
| Montagem de URLs | Helper `d4sign_url()` evita exposicao em logs |
| Comunicacao | HTTPS com API D4Sign (producao) |
| Assinatura de documentos | Ed25519 via D4Sign com verificacao de email |

### Credenciais e Segredos

| Item | Status |
|---|---|
| Senhas de banco | Carregadas de `db_config.json` ou variaveis de ambiente |
| Chave de assinatura do app | Arquivo `.key` no .gitignore (nunca versionado) |
| Senha da chave de assinatura | Exigida via variavel de ambiente no deploy |
| Senha admin padrao | Gerada aleatoriamente na primeira execucao |
| Tokens D4Sign | Configurados via interface do app, salvos no banco |
| IP do servidor | Nao exposto na interface do usuario |

### Atualizacao Segura

| Mecanismo | Implementacao |
|---|---|
| Assinatura do instalador | Ed25519 — chave publica embutida no app |
| Verificacao de integridade | Tauri verifica assinatura antes de instalar |
| Servidor de atualizacao | Rede interna (192.168.x.x) com HTTP |
| Protecao path traversal | Servidor de update valida paths solicitados |

---

## Estrutura do Projeto

```
AssentAgro/
├── src-tauri/                    # Backend Rust (Tauri 2)
│   ├── src/
│   │   ├── commands/mod.rs       # 113 handlers de comandos
│   │   ├── db/
│   │   │   ├── connection.rs     # Pool MySQL com config externa
│   │   │   ├── migrations.rs     # 16 migracoes (18 tabelas)
│   │   │   ├── models.rs         # Structs e DTOs
│   │   │   └── queries.rs        # Todas as queries (prepared statements)
│   │   └── lib.rs                # Setup do app + registro de commands
│   ├── capabilities/default.json # Permissoes do app
│   ├── tauri.conf.json           # Configuracao do Tauri
│   └── Cargo.toml                # Dependencias Rust
│
├── src/                          # Frontend React + TypeScript
│   ├── features/                 # 17 modulos de funcionalidade
│   │   ├── assets/               # Gestao de ativos (14 arquivos)
│   │   ├── dashboard/            # Dashboard interativo (14 arquivos)
│   │   ├── movements/            # Movimentacoes
│   │   ├── termos/               # Termos + D4Sign
│   │   ├── export/               # Exportacao e relatorios
│   │   ├── import/               # Importacao em lote
│   │   ├── audit/                # Auditoria
│   │   ├── loans/                # Emprestimos
│   │   ├── desligados/           # Desligamentos
│   │   ├── disposal/             # Descarte
│   │   ├── trash/                # Lixeira
│   │   ├── training/             # Treinamento
│   │   ├── users/                # Usuarios
│   │   ├── settings/             # Configuracoes
│   │   ├── notes/                # Observacoes
│   │   ├── auth/                 # Login
│   │   └── help/                 # Ajuda
│   ├── components/               # 13 componentes reutilizaveis
│   ├── hooks/                    # 5 hooks customizados
│   ├── stores/                   # 4 stores Zustand
│   ├── data/commands.ts          # Wrappers tipados para invoke
│   └── domain/models.ts          # Interfaces TypeScript
│
├── collector/                    # Coletor de hardware (Rust separado)
├── scripts/
│   ├── deploy-update.ps1         # Script de build + deploy
│   └── install-update-server.ps1 # Instalacao do servidor de update
└── docs/                         # Documentacao tecnica
```

---

## Banco de Dados (MySQL 8.0)

### Tabelas Principais

| Tabela | Funcao |
|---|---|
| `assets` | Equipamentos de TI |
| `branches` | 16 filiais |
| `employees` | Colaboradores |
| `asset_movements` | Historico de movimentacoes |
| `maintenance_records` | Registros de manutencao |
| `asset_attachments` | Anexos (fotos, documentos) |
| `asset_audit` | Auditoria de alteracoes |
| `asset_loans` | Emprestimos e retiradas |
| `descartes` | Descarte de equipamentos |
| `desligamentos` | Desligamento de colaboradores |
| `termos` | Termos de responsabilidade |
| `termos_ativos` | Vinculo termo ↔ ativos (N:N) |
| `d4sign_config` | Configuracao D4Sign |
| `users` | Usuarios do sistema |
| `login_attempts` | Tentativas de login |
| `notes` | Observacoes gerais |
| `app_settings` | Configuracoes da aplicacao |
| `schema_version` | Controle de migracoes |

### Migracoes

O sistema executa migracoes automaticamente ao iniciar. Atualmente na versao 16, com controle de versao via tabela `schema_version`.

---

## Deploy e Atualizacao

### Build e Publicacao

```powershell
# 1. Definir senha da chave de assinatura
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "sua-senha"

# 2. Executar script de deploy
powershell -ExecutionPolicy Bypass -File scripts\deploy-update.ps1
```

O script:
1. Compila o frontend (TypeScript + Vite)
2. Compila o backend (Rust release)
3. Gera instalador NSIS (.exe)
4. Assina o instalador com chave Ed25519
5. Gera `latest.json` para o updater
6. Copia tudo para o servidor de atualizacao

### Servidor de Atualizacao

- Roda como servico Windows na porta 8765
- Serve `latest.json` e instaladores via HTTP
- Clientes verificam automaticamente ao iniciar o app

---

## Requisitos

### Servidor
- MySQL 8.0+
- Windows Server (para servidor de atualizacao)
- Rede interna acessivel nas filiais

### Estacoes de Trabalho
- Windows 10/11
- WebView2 (incluido no Windows 11, instalado automaticamente no 10)
- Acesso a rede interna (MySQL + servidor de update)

---

## Configuracao Inicial

### 1. Banco de Dados
O app cria as tabelas automaticamente na primeira execucao. Configuracao de conexao em:
```
%APPDATA%\com.tracbelagro.assetagro\db_config.json
```

### 2. Usuario Admin
Criado automaticamente na primeira execucao. Senha gerada aleatoriamente ou via variavel de ambiente `ASSETAGRO_ADMIN_PASS`.

### 3. D4Sign
Configuravel pela interface: **Termos → D4Sign**
- Token API e Crypt Key obtidos no painel D4Sign
- UUID do cofre selecionado na interface
- Teste de conexao integrado

---

## Licenca

Software proprietario — Tracbel Agro. Todos os direitos reservados.

---

*Desenvolvido pelo Departamento de TI — Tracbel Agro*
*Versao 1.8.5 — Abril 2026*
