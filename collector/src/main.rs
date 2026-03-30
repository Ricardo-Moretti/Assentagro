use mysql::prelude::*;
use mysql::*;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use mysql::params;

// ── Configuração do MySQL (via variáveis de ambiente ou collector_config.json) ──
fn mysql_host() -> String { std::env::var("ASSETAGRO_DB_HOST").unwrap_or_else(|_| load_collector_cfg("host", "localhost")) }
fn mysql_port() -> u16   { std::env::var("ASSETAGRO_DB_PORT").ok().and_then(|p| p.parse().ok()).unwrap_or_else(|| load_collector_cfg("port", "3306").parse().unwrap_or(3306)) }
fn mysql_user() -> String { std::env::var("ASSETAGRO_DB_USER").unwrap_or_else(|_| load_collector_cfg("user", "assetagro")) }
fn mysql_pass() -> String { std::env::var("ASSETAGRO_DB_PASS").unwrap_or_else(|_| load_collector_cfg("password", "")) }
fn mysql_db()   -> String { std::env::var("ASSETAGRO_DB_NAME").unwrap_or_else(|_| load_collector_cfg("database", "assetagro")) }

fn load_collector_cfg(key: &str, default: &str) -> String {
    let config_path = PathBuf::from(r"C:\ProgramData\AssetAgro\collector_config.json");
    if let Ok(content) = fs::read_to_string(&config_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(val) = json.get(key).and_then(|v| v.as_str()) {
                return val.to_string();
            }
            // port vem como numero no JSON
            if let Some(val) = json.get(key).and_then(|v| v.as_u64()) {
                return val.to_string();
            }
        }
    }
    default.to_string()
}

const BRANCH_PENDENTE_ID:   &str = "br-pendente";
const BRANCH_PENDENTE_NAME: &str = "Pendente";

// ── Log de arquivo ─────────────────────────────────────────────────
struct Logger {
    file: Option<fs::File>,
}

impl Logger {
    fn new() -> Self {
        let path = log_path();

        // Rotação: se passar de 1 MB, renomeia para .bak e começa novo
        if let Ok(meta) = fs::metadata(&path) {
            if meta.len() > 1_000_000 {
                let bak = path.with_extension("log.bak");
                let _ = fs::rename(&path, &bak);
            }
        }

        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .ok();

        Logger { file }
    }

    fn log(&mut self, msg: &str) {
        println!("{}", msg);
        if let Some(ref mut f) = self.file {
            let _ = writeln!(f, "{}", msg);
        }
    }

    fn log_file(&mut self, msg: &str) {
        if let Some(ref mut f) = self.file {
            let _ = writeln!(f, "{}", msg);
        }
    }

    fn separador(&mut self) {
        self.log_file("─────────────────────────────────────────────────────");
    }
}

fn log_path() -> PathBuf {
    let dir = PathBuf::from(r"C:\ProgramData\AssetAgro");
    let _ = fs::create_dir_all(&dir);
    dir.join("collector.log")
}

// ── Executa PowerShell capturando stdout E stderr ──────────────────
fn run_powershell(cmd: &str) -> (String, String) {
    let result = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", cmd])
        .output();

    match result {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).trim().to_string();
            let err_msg = if !stderr.is_empty() {
                stderr
            } else if !o.status.success() {
                format!("exit code {}", o.status.code().unwrap_or(-1))
            } else {
                String::new()
            };
            (stdout, err_msg)
        }
        Err(e) => (String::new(), format!("Falha ao iniciar PowerShell: {}", e)),
    }
}

// ── Estrutura de dados coletados ───────────────────────────────────
#[derive(Debug)]
struct HardwareInfo {
    service_tag:        String,
    equipment_type:     String,
    model:              String,
    cpu:                String,
    ram_gb:             i64,
    storage_capacity_gb: i64,
    storage_type:       String,
    os:                 String,
    employee_name:      String,
    hostname:           String,
}

// ── Coleta com logging de cada etapa ──────────────────────────────

fn get_service_tag(log: &mut Logger) -> String {
    let (tag, err) = run_powershell("(Get-WmiObject Win32_BIOS).SerialNumber");
    if !err.is_empty() {
        log.log_file(&format!("  [WARN] Service Tag (BIOS) PowerShell: {}", err));
    }

    if tag.is_empty() || tag.to_uppercase().contains("NONE") || tag.to_uppercase().contains("DEFAULT") {
        let (alt, err2) = run_powershell("(Get-WmiObject Win32_SystemEnclosure).SerialNumber");
        if !err2.is_empty() {
            log.log_file(&format!("  [WARN] Service Tag (Enclosure) PowerShell: {}", err2));
        }
        if alt.is_empty() || alt.to_uppercase().contains("NONE") {
            get_hostname(log)
        } else {
            alt
        }
    } else {
        tag
    }
}

fn get_equipment_type(log: &mut Logger) -> String {
    let (chassis, err) = run_powershell(
        "(Get-WmiObject Win32_SystemEnclosure).ChassisTypes | Select-Object -First 1"
    );
    if !err.is_empty() {
        log.log_file(&format!("  [WARN] Tipo equipamento PowerShell: {}", err));
    }
    let chassis_num: i32 = chassis.trim().parse().unwrap_or(0);
    match chassis_num {
        9 | 10 | 14 | 31 | 32 => "NOTEBOOK".to_string(),
        _ => "DESKTOP".to_string(),
    }
}

fn get_model(log: &mut Logger) -> String {
    let (model, err) = run_powershell("(Get-WmiObject Win32_ComputerSystem).Model");
    if !err.is_empty() {
        log.log_file(&format!("  [WARN] Modelo PowerShell: {}", err));
    }
    if model.is_empty() { "Desconhecido".to_string() } else { model }
}

fn get_cpu(log: &mut Logger) -> String {
    let (cpu, err) = run_powershell("(Get-WmiObject Win32_Processor | Select-Object -First 1).Name");
    if !err.is_empty() {
        log.log_file(&format!("  [WARN] CPU PowerShell: {}", err));
    }
    if cpu.is_empty() { "Desconhecido".to_string() } else { cpu }
}

fn get_ram_gb(log: &mut Logger) -> i64 {
    let (ram_bytes, err) = run_powershell("(Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory");
    if !err.is_empty() {
        log.log_file(&format!("  [WARN] RAM PowerShell: {}", err));
    }
    let bytes: u64 = ram_bytes.trim().parse().unwrap_or(0);
    (bytes / (1024 * 1024 * 1024)) as i64
}

fn get_storage(log: &mut Logger) -> (i64, String) {
    let (size_str, err1) = run_powershell(
        "(Get-WmiObject Win32_DiskDrive | Sort-Object Size -Descending | Select-Object -First 1).Size"
    );
    if !err1.is_empty() {
        log.log_file(&format!("  [WARN] Disco (tamanho) PowerShell: {}", err1));
    }
    let size_bytes: u64 = size_str.trim().parse().unwrap_or(0);
    let size_gb = (size_bytes / (1024 * 1024 * 1024)) as i64;

    let (media_type, err2) = run_powershell(
        "(Get-PhysicalDisk | Sort-Object Size -Descending | Select-Object -First 1).MediaType"
    );
    if !err2.is_empty() {
        log.log_file(&format!("  [WARN] Disco (tipo) PowerShell: {}", err2));
    }
    let (bus_type, err3) = run_powershell(
        "(Get-PhysicalDisk | Sort-Object Size -Descending | Select-Object -First 1).BusType"
    );
    if !err3.is_empty() {
        log.log_file(&format!("  [WARN] Disco (bus) PowerShell: {}", err3));
    }

    let storage_type = if media_type.contains("SSD") || media_type.contains("4") {
        if bus_type.contains("NVMe") || bus_type.contains("17") { "SSD_NVME" } else { "SSD_SATA" }
    } else if media_type.contains("HDD") || media_type.contains("3") {
        "HDD"
    } else {
        "SSD_SATA"
    };

    (size_gb, storage_type.to_string())
}

fn get_os(log: &mut Logger) -> String {
    let (os, err) = run_powershell(
        "$o = Get-WmiObject Win32_OperatingSystem; \"$($o.Caption) $($o.Version)\""
    );
    if !err.is_empty() {
        log.log_file(&format!("  [WARN] SO PowerShell: {}", err));
    }
    if os.is_empty() { "Windows".to_string() } else { os }
}

fn get_windows_username(log: &mut Logger) -> String {
    let (username, err) = run_powershell("$env:USERNAME");
    if !err.is_empty() {
        log.log_file(&format!("  [WARN] Username PowerShell: {}", err));
    }
    if username.is_empty() {
        std::env::var("USERNAME").unwrap_or_default()
    } else {
        username
    }
}

fn get_hostname(log: &mut Logger) -> String {
    let (hostname, err) = run_powershell("$env:COMPUTERNAME");
    if !err.is_empty() {
        log.log_file(&format!("  [WARN] Hostname PowerShell: {}", err));
    }
    if hostname.is_empty() {
        std::env::var("COMPUTERNAME").unwrap_or_else(|_| "UNKNOWN".to_string())
    } else {
        hostname
    }
}

// ── Coleta todas as informações (com log de cada etapa) ────────────

fn coletar_hardware(log: &mut Logger) -> HardwareInfo {
    log.log_file("  Coletando hardware...");

    println!("  [1/8] Service Tag...");
    let service_tag = get_service_tag(log);
    log.log_file(&format!("  [1/8] Service Tag    : {}", service_tag));

    println!("  [2/8] Tipo de equipamento...");
    let equipment_type = get_equipment_type(log);
    log.log_file(&format!("  [2/8] Tipo           : {}", equipment_type));

    println!("  [3/8] Modelo...");
    let model = get_model(log);
    log.log_file(&format!("  [3/8] Modelo         : {}", truncate(&model, 60)));

    println!("  [4/8] Processador...");
    let cpu = get_cpu(log);
    log.log_file(&format!("  [4/8] CPU            : {}", truncate(&cpu, 60)));

    println!("  [5/8] Memoria RAM...");
    let ram_gb = get_ram_gb(log);
    log.log_file(&format!("  [5/8] RAM            : {} GB", ram_gb));

    println!("  [6/8] Armazenamento...");
    let (storage_capacity_gb, storage_type) = get_storage(log);
    log.log_file(&format!("  [6/8] Disco          : {} GB ({})", storage_capacity_gb, storage_type));

    println!("  [7/8] Sistema operacional...");
    let os = get_os(log);
    log.log_file(&format!("  [7/8] SO             : {}", truncate(&os, 60)));

    println!("  [8/8] Usuario Windows...");
    let employee_name = get_windows_username(log);
    let hostname      = get_hostname(log);
    log.log_file(&format!("  [8/8] Usuario/Host   : {} / {}", employee_name, hostname));

    HardwareInfo {
        service_tag, equipment_type, model, cpu,
        ram_gb, storage_capacity_gb, storage_type,
        os, employee_name, hostname,
    }
}

// ── Envia para o MySQL ─────────────────────────────────────────────

fn enviar_para_banco(info: &HardwareInfo, log: &mut Logger) -> Result<String, Box<dyn std::error::Error>> {
    let host = mysql_host();
    let port = mysql_port();
    let user = mysql_user();
    let pass = mysql_pass();
    let db   = mysql_db();

    log.log_file(&format!("  Conectando ao MySQL {}:{}...", host, port));
    println!("\n>> Conectando ao servidor MySQL ({})...", host);

    let opts = OptsBuilder::new()
        .ip_or_hostname(Some(&*host))
        .tcp_port(port)
        .user(Some(&*user))
        .pass(Some(&*pass))
        .db_name(Some(&*db))
        .tcp_connect_timeout(Some(Duration::from_secs(10)))
        .read_timeout(Some(Duration::from_secs(10)))
        .write_timeout(Some(Duration::from_secs(10)));

    let pool = Pool::new(opts)?;
    let mut conn = pool.get_conn()?;
    log.log_file("  Conexão MySQL estabelecida.");

    conn.exec_drop(
        "INSERT IGNORE INTO branches (id, name) VALUES (?, ?)",
        (BRANCH_PENDENTE_ID, BRANCH_PENDENTE_NAME),
    )?;

    let exists: Option<String> = conn.exec_first(
        "SELECT id FROM assets WHERE service_tag = ?",
        (&info.service_tag,),
    )?;

    if let Some(existing_id) = exists {
        println!("\n!! Service Tag '{}' ja existe (ID: {}). Atualizando...", info.service_tag, existing_id);
        log.log_file(&format!("  Ativo existente ID={} — atualizando specs...", existing_id));

        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
        conn.exec_drop(
            r"UPDATE assets SET
                cpu = ?, ram_gb = ?, storage_capacity_gb = ?, storage_type = ?,
                os = ?, model = ?, equipment_type = ?, notes = CONCAT(notes, ?),
                updated_at = ?
              WHERE service_tag = ?",
            (
                &info.cpu, info.ram_gb, info.storage_capacity_gb, &info.storage_type,
                &info.os, &info.model, &info.equipment_type,
                &format!("\n[Coletor] Atualizado em {} | Host: {} | User: {}",
                    now, info.hostname, info.employee_name),
                &now, &info.service_tag,
            ),
        )?;

        return Ok(existing_id);
    }

    // Cria novo ativo
    let id  = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let notes = format!(
        "[Coletado automaticamente] Host: {} | User: {} | Data: {}",
        info.hostname, info.employee_name, now
    );
    let employee_name: Option<&str> =
        if info.employee_name.is_empty() { None } else { Some(&info.employee_name) };

    conn.exec_drop(
        r"INSERT INTO assets (
            id, service_tag, equipment_type, status, employee_name,
            branch_id, ram_gb, storage_capacity_gb, storage_type,
            os, cpu, model, year, notes, is_training,
            warranty_start, warranty_end, created_at, updated_at
        ) VALUES (
            :id, :service_tag, :equipment_type, :status, :employee_name,
            :branch_id, :ram_gb, :storage_capacity_gb, :storage_type,
            :os, :cpu, :model, :year, :notes, :is_training,
            :warranty_start, :warranty_end, :created_at, :updated_at
        )",
        params! {
            "id"                  => &id,
            "service_tag"         => &info.service_tag,
            "equipment_type"      => &info.equipment_type,
            "status"              => "STOCK",
            "employee_name"       => employee_name,
            "branch_id"           => BRANCH_PENDENTE_ID,
            "ram_gb"              => info.ram_gb,
            "storage_capacity_gb" => info.storage_capacity_gb,
            "storage_type"        => &info.storage_type,
            "os"                  => &info.os,
            "cpu"                 => &info.cpu,
            "model"               => &info.model,
            "year"                => None::<i64>,
            "notes"               => &notes,
            "is_training"         => 0_i32,
            "warranty_start"      => None::<String>,
            "warranty_end"        => None::<String>,
            "created_at"          => &now,
            "updated_at"          => &now,
        },
    )?;

    let audit_id     = uuid::Uuid::new_v4().to_string();
    let changes_json = format!(
        r#"{{"action":"COLETADO","service_tag":"{}","hostname":"{}","user":"{}"}}"#,
        info.service_tag, info.hostname, info.employee_name
    );
    conn.exec_drop(
        "INSERT INTO asset_audit (id, asset_id, changed_at, changes_json) VALUES (?, ?, ?, ?)",
        (&audit_id, &id, &now, &changes_json),
    )?;

    Ok(id)
}

// ── Main ───────────────────────────────────────────────────────────

fn main() {
    let mut log = Logger::new();

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    println!("╔══════════════════════════════════════════════╗");
    println!("║   AssetAgro Collector v1.0                   ║");
    println!("║   Tracbel Agro — Departamento de TI          ║");
    println!("╚══════════════════════════════════════════════╝");
    println!();
    println!(">> Coletando informacoes de hardware...\n");

    log.separador();
    log.log_file(&format!("[{}] Iniciando coleta", timestamp));

    let info = coletar_hardware(&mut log);

    println!("\n┌─────────────────────────────────────────────┐");
    println!("│ Informacoes Coletadas                       │");
    println!("├─────────────────────────────────────────────┤");
    println!("│ Service Tag:  {:<30}│", info.service_tag);
    println!("│ Tipo:         {:<30}│", info.equipment_type);
    println!("│ Modelo:       {:<30}│", truncate(&info.model, 30));
    println!("│ CPU:          {:<30}│", truncate(&info.cpu, 30));
    println!("│ RAM:          {:<30}│", format!("{} GB", info.ram_gb));
    println!("│ Disco:        {:<30}│", format!("{} GB ({})", info.storage_capacity_gb, info.storage_type));
    println!("│ OS:           {:<30}│", truncate(&info.os, 30));
    println!("│ Usuario:      {:<30}│", info.employee_name);
    println!("│ Hostname:     {:<30}│", info.hostname);
    println!("└─────────────────────────────────────────────┘");
    println!();

    // ── Envia para o banco ─────────────────────────────────────────
    match enviar_para_banco(&info, &mut log) {
        Ok(id) => {
            log.log(">> SUCESSO! Ativo registrado no banco.");
            log.log(&format!("   ID: {}", id));
            log.log("   Status: STOCK (Pendente de alocacao)");
            log.log("   Filial: Pendente (definir no AssetAgro)");
            log.log_file(&format!("  Resultado: SUCESSO — ID {}", id));
        }
        Err(e) => {
            log.log(">> ERRO ao enviar para o banco:");
            log.log(&format!("   {}", e));
            log.log("");
            log.log(&format!("   Verifique se o servidor esta acessivel (veja collector_config.json)"));
            log.log_file(&format!("  Resultado: ERRO — {}", e));
            log.log_file(&format!("  Log salvo em: {}", log_path().display()));

            println!();
            println!("Log salvo em: {}", log_path().display());
            println!();
            println!("Pressione ENTER para fechar...");
            let mut _input = String::new();
            std::io::stdin().read_line(&mut _input).ok();

            // Exit code 1 para que a tarefa agendada registre a falha
            std::process::exit(1);
        }
    }

    log.log_file(&format!("  Log salvo em: {}", log_path().display()));

    println!();
    println!("Log salvo em: {}", log_path().display());
    println!();
    println!("Pressione ENTER para fechar...");
    let mut _input = String::new();
    std::io::stdin().read_line(&mut _input).ok();
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() > max {
        format!("{}...", &s[..max - 3])
    } else {
        s.to_string()
    }
}
