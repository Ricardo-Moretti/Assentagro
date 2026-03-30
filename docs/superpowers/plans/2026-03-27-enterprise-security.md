# Enterprise Security & Robustness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Controle de Ativos from prototype to enterprise-grade with audit user tracking, RBAC, session management, login security, soft-delete, and management dashboard metrics.

**Architecture:** 6 incremental migrations (013-018) add columns/tables without touching existing data. Backend gets a `changed_by` param threaded through all audit calls, plus RBAC guard functions. Frontend gets session timeout hook, role-based UI gating, and a trash/recovery page. Each task is independently deployable.

**Tech Stack:** Tauri 2, Rust (mysql crate 25), React 18, TypeScript 5.7, Zustand 5, Tailwind CSS 3

**Current Version:** 1.5.0 -> Target: 1.6.0

---

## File Map

### Backend (Rust)

| File | Changes |
|------|---------|
| `src-tauri/src/db/migrations.rs` | Add migrations 013-018 |
| `src-tauri/src/db/queries.rs` | Modify `registrar_auditoria` signature, add RBAC helpers, soft-delete, login attempts, dashboard metrics |
| `src-tauri/src/db/models.rs` | Add `LoginAttemptInfo`, extend `DashboardStats`, add `DeletedAsset` struct |
| `src-tauri/src/commands/mod.rs` | Add `usuario` param to mutating commands, RBAC guard, new commands |
| `src-tauri/src/lib.rs` | Register new commands |

### Frontend (TypeScript/React)

| File | Changes |
|------|---------|
| `src/stores/useAuthStore.ts` | Add `loginAt` timestamp, session expiry |
| `src/hooks/useSessionTimeout.ts` | New: idle + absolute timeout hook |
| `src/hooks/useRBAC.ts` | New: permission check hook |
| `src/domain/models.ts` | Add `DeletedAsset`, extend `DashboardStats`, `LoginAttemptInfo` |
| `src/data/commands.ts` | Add new command wrappers, add `usuario` param to mutating commands |
| `src/App.tsx` | Add `useSessionTimeout` hook |
| `src/features/assets/components/AssetTable.tsx` | Hide delete button for non-admin |
| `src/components/layout/Sidebar.tsx` | Hide admin-only nav items for user role |
| `src/features/trash/pages/TrashPage.tsx` | New: soft-deleted assets recovery page |
| `src/features/dashboard/pages/DashboardPage.tsx` | Add management metrics cards |

---

## Task 1: Migration 013 - Audit User Tracking

**Files:**
- Modify: `src-tauri/src/db/migrations.rs`

- [ ] **Step 1: Add migration 013 to add `changed_by` column to `asset_audit`**

In `src-tauri/src/db/migrations.rs`, before the `// Seed default admin user` line, add:

```rust
// Migration 013 — Auditoria com rastreamento de usuario
if versao_atual < 13 {
    info!("Executando migracao 013: audit changed_by...");

    conn.query_drop(
        "ALTER TABLE asset_audit ADD COLUMN changed_by VARCHAR(255) NULL AFTER changes_json"
    )?;

    conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (13)")?;
    info!("Migracao 013 concluida.");
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: `Finished dev profile`

---

## Task 2: Thread `changed_by` Through Audit System

**Files:**
- Modify: `src-tauri/src/db/queries.rs` (registrar_auditoria function, line ~366)
- Modify: ALL callers of `registrar_auditoria` in queries.rs

- [ ] **Step 1: Update `registrar_auditoria` signature to accept `changed_by`**

Change the function at line ~366 from:

```rust
fn registrar_auditoria(conn: &mut PooledConn, asset_id: &str, changes: &serde_json::Value) -> Result<()> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let json = serde_json::to_string(changes).unwrap_or_default();

    conn.exec_drop(
        "INSERT INTO asset_audit (id, asset_id, changed_at, changes_json)
         VALUES (?, ?, ?, ?)",
        (&id, asset_id, &now, &json),
    )
    .context("Falha ao registrar auditoria")?;

    Ok(())
}
```

To:

```rust
fn registrar_auditoria(conn: &mut PooledConn, asset_id: &str, changes: &serde_json::Value, changed_by: &str) -> Result<()> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let json = serde_json::to_string(changes).unwrap_or_default();
    let by = if changed_by.is_empty() { "sistema" } else { changed_by };

    conn.exec_drop(
        "INSERT INTO asset_audit (id, asset_id, changed_at, changes_json, changed_by)
         VALUES (?, ?, ?, ?, ?)",
        (&id, asset_id, &now, &json, by),
    )
    .context("Falha ao registrar auditoria")?;

    Ok(())
}
```

- [ ] **Step 2: Update ALL public query functions that call `registrar_auditoria` to accept `usuario: &str`**

Every function that calls `registrar_auditoria` needs a new `usuario: &str` parameter added as the LAST parameter. Find all callers with `grep -n "registrar_auditoria" src-tauri/src/db/queries.rs` and update each.

Functions to update (add `usuario: &str` as last param, pass to `registrar_auditoria`):
- `criar_ativo(conn, dto)` -> `criar_ativo(conn, dto, usuario)`
- `atualizar_ativo(conn, id, ...)` -> add `usuario: &str` as last param
- `excluir_ativo(conn, id)` -> `excluir_ativo(conn, id, usuario)`
- `atribuir_equipamento(conn, dto)` -> add `usuario`
- `reatribuir_equipamento(conn, dto)` -> add `usuario`
- `devolver_equipamento(conn, dto)` -> add `usuario`
- `trocar_equipamentos(conn, dto)` -> add `usuario`
- `enviar_para_manutencao(conn, dto)` -> add `usuario`
- `retornar_de_manutencao(conn, ...)` -> add `usuario`
- `devolver_em_lote(conn, ids)` -> add `usuario`
- `baixar_em_lote(conn, ids)` -> add `usuario`
- `marcar_como_treinamento(conn, id, flag)` -> add `usuario`
- `desligar_colaborador(conn, dto)` -> add `usuario`
- `confirmar_devolucao(conn, id)` -> add `usuario`
- `criar_descarte(conn, dto)` -> add `usuario`
- `concluir_descarte(conn, id)` -> add `usuario`
- `cancelar_descarte(conn, id)` -> add `usuario`
- `criar_emprestimo(conn, dto)` -> add `usuario`
- `devolver_emprestimo(conn, id, obs)` -> add `usuario`

For each call to `registrar_auditoria(conn, asset_id, &json)`, change to `registrar_auditoria(conn, asset_id, &json, usuario)`.

- [ ] **Step 3: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: Errors in commands/mod.rs because commands don't pass `usuario` yet. That's OK - fixed in Task 3.

---

## Task 3: Pass User Context Through Commands

**Files:**
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Add `usuario` parameter to ALL mutating commands**

Every command that calls a query function modified in Task 2 needs `usuario: String` added as a parameter. Example pattern:

```rust
#[tauri::command]
pub fn criar_ativo(
    state: State<'_, AppState>,
    dados: CreateAssetDto,
    usuario: String,  // NEW
) -> Result<Asset, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::criar_ativo(&mut conn, &dados, &usuario).map_err(err)
}
```

Apply this pattern to ALL commands that correspond to the query functions updated in Task 2:
- `criar_ativo` - add `usuario: String`
- `atualizar_ativo` - add `usuario: String`
- `excluir_ativo` - add `usuario: String`
- `atribuir_equipamento` - add `usuario: String`
- `reatribuir_equipamento` - add `usuario: String`
- `devolver_equipamento` - add `usuario: String`
- `trocar_equipamentos` - add `usuario: String`
- `enviar_para_manutencao` - add `usuario: String`
- `retornar_de_manutencao` - add `usuario: String`
- `devolver_em_lote` - add `usuario: String`
- `baixar_em_lote` - add `usuario: String`
- `marcar_como_treinamento` - add `usuario: String`
- `desligar_colaborador` - add `usuario: String`
- `confirmar_devolucao` - add `usuario: String`
- `criar_descarte` - add `usuario: String`
- `concluir_descarte` - add `usuario: String`
- `cancelar_descarte` - add `usuario: String`
- `criar_emprestimo` - add `usuario: String`
- `devolver_emprestimo` - add `usuario: String`

- [ ] **Step 2: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: `Finished dev profile`

---

## Task 4: Frontend - Pass User to All Commands

**Files:**
- Modify: `src/data/commands.ts`
- Modify: All frontend callers that invoke mutating commands

- [ ] **Step 1: Update command wrappers in `src/data/commands.ts`**

Add `usuario` parameter to each mutating command wrapper. Example:

```typescript
// Before:
export const criarAtivo = (dados: CreateAssetDto): Promise<Asset> =>
  invoke('criar_ativo', { dados });

// After:
export const criarAtivo = (dados: CreateAssetDto, usuario: string): Promise<Asset> =>
  invoke('criar_ativo', { dados, usuario });
```

Apply to ALL commands modified in Task 3.

- [ ] **Step 2: Update all frontend callers to pass `user?.name ?? 'sistema'`**

Search the codebase for each command call. Every call now needs the user name. Use `useAuthStore.getState().user?.name ?? 'sistema'` for non-component contexts, or `useAuthStore((s) => s.user)` in components.

Key files to update:
- `src/features/assets/components/AssetTable.tsx` (delete, desligar)
- `src/features/assets/pages/AssetNewPage.tsx` or form (create)
- `src/features/assets/pages/AssetEditPage.tsx` or form (update)
- `src/features/movements/pages/MovementsPage.tsx` (assign, return, swap)
- `src/features/training/pages/TrainingPage.tsx` (training toggle)
- `src/features/disposal/pages/DescartePage.tsx` (descarte)
- `src/features/desligados/pages/DesligadosPage.tsx` (confirmar, cancelar)
- `src/features/loans/pages/LoansPage.tsx` (create, return loans)
- All batch operation callers

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 5: RBAC Guard - Backend

**Files:**
- Modify: `src-tauri/src/db/queries.rs`
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Add RBAC helper function in commands/mod.rs**

After the `err()` helper function, add:

```rust
/// Verifica se o usuario tem role admin. Retorna Err se nao.
fn exigir_admin(role: &str) -> Result<(), String> {
    if role != "admin" {
        return Err("Acesso negado: esta operacao requer permissao de administrador.".to_string());
    }
    Ok(())
}
```

- [ ] **Step 2: Add `role` param and guard to admin-only commands**

These commands should only be accessible by admin:

```rust
#[tauri::command]
pub fn excluir_ativo(
    state: State<'_, AppState>,
    id: String,
    usuario: String,
    role: String,  // NEW
) -> Result<(), String> {
    exigir_admin(&role)?;  // NEW
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::excluir_ativo(&mut conn, &id, &usuario).map_err(err)
}
```

Apply `role: String` + `exigir_admin(&role)?;` to:
- `excluir_ativo`
- `criar_usuario`
- `alterar_senha`
- `desativar_usuario`
- `criar_backup`
- `restaurar_backup`
- `baixar_em_lote`
- `importar_ativos`
- `restaurar_ativo` (new, Task 8)

- [ ] **Step 3: Verify compilation**

Run: `cd src-tauri && cargo check`

---

## Task 6: RBAC Guard - Frontend

**Files:**
- Create: `src/hooks/useRBAC.ts`
- Modify: `src/data/commands.ts` (add `role` param to admin commands)
- Modify: `src/features/assets/components/AssetTable.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/features/users/pages/UsersPage.tsx`

- [ ] **Step 1: Create `src/hooks/useRBAC.ts`**

```typescript
import { useAuthStore } from '@/stores/useAuthStore';

export function useRBAC() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  return { isAdmin, role: user?.role ?? 'user', userName: user?.name ?? 'sistema' };
}
```

- [ ] **Step 2: Update admin-only command wrappers to pass `role`**

```typescript
export const excluirAtivo = (id: string, usuario: string, role: string): Promise<void> =>
  invoke('excluir_ativo', { id, usuario, role });
```

Apply to all admin-only commands from Task 5 Step 2.

- [ ] **Step 3: Hide delete button in AssetTable for non-admin**

In `src/features/assets/components/AssetTable.tsx`, import `useRBAC` and conditionally render:

```typescript
const { isAdmin, userName } = useRBAC();
// ...
{isAdmin && (
  <ActionButton
    icon={<Trash2 className="h-4 w-4" />}
    title="Excluir"
    onClick={() => setDeleteTarget(asset)}
    danger
  />
)}
```

- [ ] **Step 4: Hide "Usuarios" nav item in Sidebar for non-admin**

In `src/components/layout/Sidebar.tsx`, import `useRBAC` and filter:

```typescript
const { isAdmin } = useRBAC();

const filteredItems = itemsWithBadges.filter((item) => {
  if (item.view === 'users' && !isAdmin) return false;
  return true;
});
```

Render `filteredItems` instead of `itemsWithBadges`.

- [ ] **Step 5: Block UsersPage for non-admin**

At top of UsersPage component:

```typescript
const { isAdmin } = useRBAC();
if (!isAdmin) {
  return (
    <div className="text-center py-12 text-slate-500">
      Acesso restrito a administradores.
    </div>
  );
}
```

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`

---

## Task 7: Session Timeout

**Files:**
- Modify: `src/stores/useAuthStore.ts`
- Create: `src/hooks/useSessionTimeout.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Store login timestamp in useAuthStore**

```typescript
const STORAGE_KEY = 'assetagro_auth';
const SESSION_KEY = 'assetagro_session_at';
const MAX_SESSION_MS = 8 * 60 * 60 * 1000;  // 8 hours

function loadSession(): { user: User | null; isAuthenticated: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, isAuthenticated: false };

    // Check absolute session timeout
    const sessionAt = localStorage.getItem(SESSION_KEY);
    if (sessionAt) {
      const elapsed = Date.now() - parseInt(sessionAt, 10);
      if (elapsed > MAX_SESSION_MS) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SESSION_KEY);
        return { user: null, isAuthenticated: false };
      }
    }

    const user = JSON.parse(raw) as User;
    return { user, isAuthenticated: true };
  } catch {
    return { user: null, isAuthenticated: false };
  }
}
```

Update `login` to save timestamp:

```typescript
login: (user) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_KEY, String(Date.now()));
  set({ user, isAuthenticated: true });
},
logout: () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_KEY);
  set({ user: null, isAuthenticated: false });
},
```

- [ ] **Step 2: Create idle timeout hook**

Create `src/hooks/useSessionTimeout.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000;     // check every 1 min

export function useSessionTimeout() {
  const logout = useAuthStore((s) => s.logout);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const resetIdle = () => { lastActivity.current = Date.now(); };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('click', resetIdle);

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle > IDLE_TIMEOUT_MS) {
        logout();
      }

      // Also check absolute session timeout
      const sessionAt = localStorage.getItem('assetagro_session_at');
      if (sessionAt) {
        const elapsed = Date.now() - parseInt(sessionAt, 10);
        if (elapsed > 8 * 60 * 60 * 1000) {
          logout();
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
      clearInterval(interval);
    };
  }, [logout]);
}
```

- [ ] **Step 3: Wire into App.tsx**

In `AppContent` component, add:

```typescript
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

const AppContent: React.FC = () => {
  // ... existing hooks ...
  useSessionTimeout();  // ADD THIS
  // ...
};
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`

---

## Task 8: Login Attempt Limiting + Soft Delete Migrations

**Files:**
- Modify: `src-tauri/src/db/migrations.rs`

- [ ] **Step 1: Add migrations 014-016**

```rust
// Migration 014 — Controle de tentativas de login
if versao_atual < 14 {
    info!("Executando migracao 014: login_attempts...");

    conn.query_drop(
        "CREATE TABLE IF NOT EXISTS login_attempts (
            id           VARCHAR(36)  NOT NULL PRIMARY KEY,
            username     VARCHAR(100) NOT NULL,
            success      TINYINT(1)   NOT NULL DEFAULT 0,
            ip_info      VARCHAR(100) NULL,
            attempted_at VARCHAR(30)  NOT NULL,
            KEY idx_attempts_user (username),
            KEY idx_attempts_at   (attempted_at)
        ) ENGINE=InnoDB"
    )?;

    conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (14)")?;
    info!("Migracao 014 concluida.");
}

// Migration 015 — Soft delete de ativos
if versao_atual < 15 {
    info!("Executando migracao 015: soft delete...");

    conn.query_drop(
        "ALTER TABLE assets
         ADD COLUMN deleted_at VARCHAR(30) NULL,
         ADD COLUMN deleted_by VARCHAR(255) NULL"
    )?;
    conn.query_drop(
        "CREATE INDEX idx_assets_deleted ON assets (deleted_at)"
    )?;

    conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (15)")?;
    info!("Migracao 015 concluida.");
}

// Migration 016 — Metricas de gestao (indice para custos)
if versao_atual < 16 {
    info!("Executando migracao 016: indices gestao...");

    conn.query_drop(
        "CREATE INDEX IF NOT EXISTS idx_maint_cost ON maintenance_records (cost)"
    ).ok(); // OK se ja existe

    conn.query_drop("INSERT IGNORE INTO schema_version (version) VALUES (16)")?;
    info!("Migracao 016 concluida.");
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd src-tauri && cargo check`

---

## Task 9: Login Attempt Limiting - Backend

**Files:**
- Modify: `src-tauri/src/db/models.rs`
- Modify: `src-tauri/src/db/queries.rs`
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Add model**

In `models.rs`, after the auth section:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginAttemptInfo {
    pub failed_count: i64,
    pub locked: bool,
    pub remaining_seconds: i64,
}
```

- [ ] **Step 2: Add login attempt tracking in queries.rs**

Before `autenticar_usuario`, add:

```rust
const MAX_LOGIN_ATTEMPTS: i64 = 5;
const LOCKOUT_MINUTES: i64 = 15;

fn registrar_tentativa_login(conn: &mut PooledConn, username: &str, success: bool) -> Result<()> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let s: i64 = if success { 1 } else { 0 };
    conn.exec_drop(
        "INSERT INTO login_attempts (id, username, success, attempted_at) VALUES (?, ?, ?, ?)",
        (&id, username, s, &now),
    )?;
    Ok(())
}

fn verificar_bloqueio_login(conn: &mut PooledConn, username: &str) -> Result<LoginAttemptInfo> {
    let cutoff = (Utc::now() - chrono::Duration::minutes(LOCKOUT_MINUTES))
        .format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Count recent failed attempts since last success or cutoff
    let failed: i64 = conn.exec_first(
        "SELECT COUNT(*) FROM login_attempts
         WHERE username = ? AND success = 0 AND attempted_at > ?
         AND attempted_at > COALESCE(
             (SELECT MAX(attempted_at) FROM login_attempts WHERE username = ? AND success = 1),
             '2000-01-01'
         )",
        (username, &cutoff, username),
    )?.unwrap_or(0);

    let locked = failed >= MAX_LOGIN_ATTEMPTS;
    let remaining = if locked { LOCKOUT_MINUTES * 60 } else { 0 };

    Ok(LoginAttemptInfo { failed_count: failed, locked, remaining_seconds: remaining })
}
```

- [ ] **Step 3: Modify `autenticar_usuario` to check lockout and record attempts**

```rust
pub fn autenticar_usuario(conn: &mut PooledConn, dto: &LoginDto) -> Result<User> {
    // Check lockout
    let attempt_info = verificar_bloqueio_login(conn, &dto.username)?;
    if attempt_info.locked {
        return Err(anyhow!(
            "Conta bloqueada por {} tentativas falhas. Aguarde {} minutos.",
            MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES
        ));
    }

    let result: Option<(String, String, String, String, String, i8, String)> = conn
        .exec_first(
            "SELECT id, username, password, name, role, active, created_at FROM users WHERE username = ? AND active = 1",
            (&dto.username,),
        )
        .map_err(|_| anyhow!("Usuario ou senha invalidos"))?;

    let (id, username, password_hash, name, role, active, created_at) = match result {
        Some(r) => r,
        None => {
            registrar_tentativa_login(conn, &dto.username, false).ok();
            return Err(anyhow!("Usuario ou senha invalidos"));
        }
    };

    let valid = bcrypt::verify(&dto.password, &password_hash)
        .map_err(|_| anyhow!("Erro ao verificar senha"))?;

    if !valid {
        registrar_tentativa_login(conn, &dto.username, false).ok();
        return Err(anyhow!("Usuario ou senha invalidos"));
    }

    registrar_tentativa_login(conn, &dto.username, true).ok();

    Ok(User {
        id,
        username,
        name,
        role,
        active: active != 0,
        created_at,
    })
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd src-tauri && cargo check`

---

## Task 10: Soft Delete - Backend

**Files:**
- Modify: `src-tauri/src/db/queries.rs`
- Modify: `src-tauri/src/db/models.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add `DeletedAsset` model**

In `models.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeletedAsset {
    pub id: String,
    pub service_tag: String,
    pub equipment_type: String,
    pub employee_name: Option<String>,
    pub branch_name: Option<String>,
    pub model: String,
    pub deleted_at: String,
    pub deleted_by: String,
}
```

- [ ] **Step 2: Modify `excluir_ativo` to soft-delete**

Replace the DELETE with an UPDATE:

```rust
pub fn excluir_ativo(conn: &mut PooledConn, id: &str, usuario: &str) -> Result<()> {
    let ativo = obter_ativo(conn, id).ok();

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "UPDATE assets SET deleted_at = ?, deleted_by = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        (&now, usuario, &now, id),
    ).context("Falha ao excluir ativo")?;

    let rows = conn.affected_rows();
    if rows == 0 {
        return Err(anyhow!("Ativo nao encontrado para exclusao"));
    }

    if let Some(a) = ativo {
        registrar_auditoria(conn, id, &serde_json::json!({
            "acao": "EXCLUIDO",
            "service_tag": a.service_tag,
            "filial": a.branch_name,
        }), usuario)?;
    }

    Ok(())
}
```

- [ ] **Step 3: Add `AND deleted_at IS NULL` filter to ALL asset queries**

Update `ASSET_SELECT` constant to include the filter:

The existing ASSET_SELECT is a raw SELECT without WHERE. The filter needs to be added in each query that uses it. The safest approach: add a constant for the filter condition and apply it.

Add after ASSET_SELECT:

```rust
const ASSET_NOT_DELETED: &str = "a.deleted_at IS NULL";
```

Then in `listar_ativos`, add to the WHERE clause. In `obter_ativo`, change:

```rust
let sql = format!("{} WHERE a.id = ? AND {}", ASSET_SELECT, ASSET_NOT_DELETED);
```

Apply similarly to: `listar_ativos_em_estoque`, `listar_ativos_em_uso`, `listar_candidatos_descarte`, etc.

- [ ] **Step 4: Add recovery functions**

```rust
pub fn listar_ativos_excluidos(conn: &mut PooledConn) -> Result<Vec<DeletedAsset>> {
    let rows: Vec<mysql::Row> = conn.query(
        "SELECT a.id, a.service_tag, a.equipment_type, a.employee_name,
                b.name AS branch_name, a.model, a.deleted_at, a.deleted_by
         FROM assets a
         LEFT JOIN branches b ON a.branch_id = b.id
         WHERE a.deleted_at IS NOT NULL
         ORDER BY a.deleted_at DESC"
    ).context("Falha ao listar ativos excluidos")?;

    Ok(rows.into_iter().map(|row| DeletedAsset {
        id:             row.get::<Option<String>, _>("id").flatten().unwrap_or_default(),
        service_tag:    row.get::<Option<String>, _>("service_tag").flatten().unwrap_or_default(),
        equipment_type: row.get::<Option<String>, _>("equipment_type").flatten().unwrap_or_default(),
        employee_name:  row.get::<Option<String>, _>("employee_name").flatten(),
        branch_name:    row.get::<Option<String>, _>("branch_name").flatten(),
        model:          row.get::<Option<String>, _>("model").flatten().unwrap_or_default(),
        deleted_at:     row.get::<Option<String>, _>("deleted_at").flatten().unwrap_or_default(),
        deleted_by:     row.get::<Option<String>, _>("deleted_by").flatten().unwrap_or_default(),
    }).collect())
}

pub fn restaurar_ativo(conn: &mut PooledConn, id: &str, usuario: &str) -> Result<Asset> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.exec_drop(
        "UPDATE assets SET deleted_at = NULL, deleted_by = NULL, status = 'STOCK', updated_at = ? WHERE id = ?",
        (&now, id),
    ).context("Falha ao restaurar ativo")?;

    registrar_auditoria(conn, id, &serde_json::json!({
        "acao": "RESTAURADO",
    }), usuario)?;

    obter_ativo(conn, id)
}
```

- [ ] **Step 5: Add commands and register**

In `commands/mod.rs`:

```rust
#[tauri::command]
pub fn listar_ativos_excluidos(state: State<'_, AppState>) -> Result<Vec<DeletedAsset>, String> {
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::listar_ativos_excluidos(&mut conn).map_err(err)
}

#[tauri::command]
pub fn restaurar_ativo(
    state: State<'_, AppState>,
    id: String,
    usuario: String,
    role: String,
) -> Result<Asset, String> {
    exigir_admin(&role)?;
    let mut conn = state.db.get_conn().map_err(|e| e.to_string())?;
    queries::restaurar_ativo(&mut conn, &id, &usuario).map_err(err)
}
```

Register in `lib.rs`:

```rust
commands::listar_ativos_excluidos,
commands::restaurar_ativo,
```

- [ ] **Step 6: Verify compilation**

Run: `cd src-tauri && cargo check`

---

## Task 11: Soft Delete - Frontend (Trash Page)

**Files:**
- Create: `src/features/trash/pages/TrashPage.tsx`
- Modify: `src/domain/models.ts`
- Modify: `src/data/commands.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Topbar.tsx`

- [ ] **Step 1: Add types and commands**

In `models.ts`, add `'trash'` to `AppView` union and add:

```typescript
export interface DeletedAsset {
  id: string;
  service_tag: string;
  equipment_type: string;
  employee_name: string | null;
  branch_name: string | null;
  model: string;
  deleted_at: string;
  deleted_by: string;
}
```

In `commands.ts`:

```typescript
export const listarAtivosExcluidos = (): Promise<DeletedAsset[]> =>
  invoke('listar_ativos_excluidos');

export const restaurarAtivo = (id: string, usuario: string, role: string): Promise<Asset> =>
  invoke('restaurar_ativo', { id, usuario, role });
```

- [ ] **Step 2: Create TrashPage**

Create `src/features/trash/pages/TrashPage.tsx` following the DesligadosPage pattern: list deleted assets with a "Restaurar" button (admin only). Simple table with service_tag, type, branch, deleted_at, deleted_by, and restore action.

- [ ] **Step 3: Wire into App.tsx, Sidebar, Topbar**

Add `'trash'` view, import TrashPage, add route case, add sidebar item (admin only, with Trash2 icon), add Topbar title.

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`

---

## Task 12: Management Dashboard Metrics

**Files:**
- Modify: `src-tauri/src/db/models.rs`
- Modify: `src-tauri/src/db/queries.rs`
- Modify: `src/domain/models.ts`
- Modify: `src/features/dashboard/pages/DashboardPage.tsx`

- [ ] **Step 1: Extend DashboardStats in Rust model**

Add 3 new fields:

```rust
pub struct DashboardStats {
    // ... existing 9 fields ...
    pub maintenance_total_cost: f64,
    pub avg_maintenance_days: f64,
    pub assets_per_employee: f64,
}
```

- [ ] **Step 2: Calculate new metrics in `obter_stats` query**

In the `obter_stats` function, add after existing counts:

```rust
// Custo total de manutencao
let maintenance_total_cost: f64 = conn
    .exec_first::<f64, _, _>(
        &format!("SELECT COALESCE(SUM(mr.cost), 0) FROM maintenance_records mr
         JOIN assets a ON mr.asset_id = a.id WHERE a.deleted_at IS NULL{}", branch_filter),
        mysql::Params::Positional(params.clone()),
    ).unwrap_or(Some(0.0)).unwrap_or(0.0);

// Tempo medio em manutencao (dias)
let avg_maintenance_days: f64 = conn
    .exec_first::<f64, _, _>(
        "SELECT COALESCE(AVG(DATEDIFF(returned_at, sent_at)), 0)
         FROM maintenance_records WHERE status = 'CLOSED' AND returned_at IS NOT NULL",
        (),
    ).unwrap_or(Some(0.0)).unwrap_or(0.0);

// Ativos por colaborador (media)
let employees_with_assets: f64 = conn
    .exec_first::<f64, _, _>(
        "SELECT COUNT(DISTINCT employee_name) FROM assets
         WHERE employee_name IS NOT NULL AND employee_name != '' AND status = 'IN_USE' AND deleted_at IS NULL",
        (),
    ).unwrap_or(Some(0.0)).unwrap_or(0.0);

let assets_per_employee = if employees_with_assets > 0.0 {
    in_use as f64 / employees_with_assets
} else {
    0.0
};
```

- [ ] **Step 3: Update TypeScript DashboardStats**

In `models.ts`:

```typescript
export interface DashboardStats {
  // ... existing 9 fields ...
  maintenance_total_cost: number;
  avg_maintenance_days: number;
  assets_per_employee: number;
}
```

- [ ] **Step 4: Add stat cards in DashboardPage**

After the existing stat cards grid, add a new section:

```tsx
{/* Metricas de Gestao */}
<div className="grid grid-cols-3 gap-4">
  <StatCard
    icon={<Wrench className="h-5 w-5" />}
    label="Custo Total Manutencao"
    value={`R$ ${stats.maintenance_total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
    color="amber"
  />
  <StatCard
    icon={<Clock className="h-5 w-5" />}
    label="Tempo Medio Manutencao"
    value={`${stats.avg_maintenance_days.toFixed(0)} dias`}
    color="orange"
  />
  <StatCard
    icon={<Users className="h-5 w-5" />}
    label="Ativos por Colaborador"
    value={stats.assets_per_employee.toFixed(1)}
    color="indigo"
  />
</div>
```

- [ ] **Step 5: Verify both Rust and TypeScript**

Run: `cd src-tauri && cargo check && cd .. && npx tsc --noEmit`

---

## Task 13: Version Bump + Final Verification

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `scripts/deploy-update.ps1`

- [ ] **Step 1: Bump version to 1.6.0 in all 4 files**

- `package.json`: `"version": "1.6.0"`
- `src-tauri/tauri.conf.json`: `"version": "1.6.0"`
- `src-tauri/Cargo.toml`: `version = "1.6.0"`
- `scripts/deploy-update.ps1`: `$Version = "1.6.0"`

- [ ] **Step 2: Full compilation check**

```bash
cd src-tauri && cargo check && cd .. && npx tsc --noEmit
```

Expected: Both pass with zero errors.

- [ ] **Step 3: Build installer (without deploying)**

```bash
cd c:/projetos/AssentAgro && npm run tauri build
```

Expected: Produces `AssetAgro_1.6.0_x64-setup.exe` in `src-tauri/target/release/bundle/nsis/`

---

## Deployment Plan (for when you arrive at the office)

When connected to the internal network at the office:

```powershell
# 1. Abrir terminal no projeto
cd c:\projetos\AssentAgro

# 2. Executar deploy script
powershell -ExecutionPolicy Bypass -File scripts\deploy-update.ps1

# 3. Verificar latest.json
cat src-tauri\target\release\bundle\nsis\latest.json
# Confirmar que "version": "1.6.0"

# 4. Se a versao estiver errada no latest.json, copiar manualmente:
cp src-tauri\target\release\bundle\nsis\latest.json \\192.168.90.5\AssetAgro\updates\latest.json

# 5. Testar: fechar e reabrir o app em uma estacao.
# O updater deve solicitar atualizacao para 1.6.0.
```

### O que verificar apos o deploy:

1. **Login** - Tente logar com senha errada 6x. Deve bloquear por 15 minutos.
2. **RBAC** - Logue como usuario `user`. Botao "Excluir" nao deve aparecer. Menu "Usuarios" nao deve aparecer.
3. **Auditoria** - Edite um ativo e va em Auditoria. O campo "Alterado por" deve mostrar o nome do usuario.
4. **Sessao** - Deixe o app aberto sem mexer por 30min. Deve deslogar automaticamente.
5. **Soft Delete** - Exclua um ativo (como admin). Ele deve ir para "Lixeira". Clique "Restaurar" e confirme que voltou.
6. **Dashboard** - Verifique os 3 novos cards: Custo Total Manutencao, Tempo Medio, Ativos por Colaborador.

---

## Summary of Changes

| Area | What Changes | Risk |
|------|-------------|------|
| Migration 013 | ALTER TABLE asset_audit ADD changed_by | LOW - nullable column |
| Migration 014 | CREATE TABLE login_attempts | LOW - new table |
| Migration 015 | ALTER TABLE assets ADD deleted_at, deleted_by | LOW - nullable columns |
| Migration 016 | CREATE INDEX on maintenance_records | LOW - index only |
| registrar_auditoria | New `changed_by` param | MEDIUM - all callers updated |
| excluir_ativo | Soft delete instead of hard delete | MEDIUM - behavior change |
| RBAC | admin vs user enforcement | LOW - additive |
| Session | Timeout after 30min idle / 8h absolute | LOW - additive |
| Login | Block after 5 failed attempts | LOW - additive |
| Dashboard | 3 new metric cards | LOW - additive |
