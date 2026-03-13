use mysql::prelude::*;
use mysql::*;
use std::process::Command;
use std::time::Duration;
use mysql::params;

// ── Configuração do MySQL ──────────────────────────────────────────
const MYSQL_HOST: &str = "192.168.90.5";
const MYSQL_PORT: u16 = 3306;
const MYSQL_USER: &str = "assetagro";
const MYSQL_PASS: &str = "AssetAgro@2025!";
const MYSQL_DB: &str = "assetagro";

const BRANCH_PENDENTE_ID: &str = "br-pendente";
const BRANCH_PENDENTE_NAME: &str = "Pendente";

// ── Estrutura de dados coletados ───────────────────────────────────
#[derive(Debug)]
struct HardwareInfo {
    service_tag: String,
    equipment_type: String, // NOTEBOOK ou DESKTOP
    model: String,
    cpu: String,
    ram_gb: i64,
    storage_capacity_gb: i64,
    storage_type: String, // SSD_NVME, SSD_SATA, HDD
    os: String,
    employee_name: String, // username Windows
    hostname: String,
}

// ── Funções de coleta via PowerShell/WMI ───────────────────────────

fn run_powershell(cmd: &str) -> String {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", cmd])
        .output();

    match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        Err(_) => String::new(),
    }
}

fn get_service_tag() -> String {
    let tag = run_powershell(
        "(Get-WmiObject Win32_BIOS).SerialNumber"
    );
    if tag.is_empty() || tag.to_uppercase().contains("NONE") || tag.to_uppercase().contains("DEFAULT") {
        // Fallback: tenta pelo chassis
        let alt = run_powershell(
            "(Get-WmiObject Win32_SystemEnclosure).SerialNumber"
        );
        if alt.is_empty() || alt.to_uppercase().contains("NONE") {
            // Último recurso: hostname
            get_hostname()
        } else {
            alt
        }
    } else {
        tag
    }
}

fn get_equipment_type() -> String {
    // ChassisTypes: 9,10,14 = Laptop; 3,6,7 = Desktop
    let chassis = run_powershell(
        "(Get-WmiObject Win32_SystemEnclosure).ChassisTypes | Select-Object -First 1"
    );
    let chassis_num: i32 = chassis.trim().parse().unwrap_or(0);
    match chassis_num {
        9 | 10 | 14 | 31 | 32 => "NOTEBOOK".to_string(),
        _ => "DESKTOP".to_string(),
    }
}

fn get_model() -> String {
    let model = run_powershell(
        "(Get-WmiObject Win32_ComputerSystem).Model"
    );
    if model.is_empty() { "Desconhecido".to_string() } else { model }
}

fn get_cpu() -> String {
    let cpu = run_powershell(
        "(Get-WmiObject Win32_Processor | Select-Object -First 1).Name"
    );
    if cpu.is_empty() { "Desconhecido".to_string() } else { cpu }
}

fn get_ram_gb() -> i64 {
    let ram_bytes = run_powershell(
        "(Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory"
    );
    let bytes: u64 = ram_bytes.trim().parse().unwrap_or(0);
    (bytes / (1024 * 1024 * 1024)) as i64
}

fn get_storage() -> (i64, String) {
    // Pega o disco principal (maior capacidade)
    let size_str = run_powershell(
        "(Get-WmiObject Win32_DiskDrive | Sort-Object Size -Descending | Select-Object -First 1).Size"
    );
    let size_bytes: u64 = size_str.trim().parse().unwrap_or(0);
    let size_gb = (size_bytes / (1024 * 1024 * 1024)) as i64;

    // Detecta tipo de disco
    let media_type = run_powershell(
        "(Get-PhysicalDisk | Sort-Object Size -Descending | Select-Object -First 1).MediaType"
    );
    let bus_type = run_powershell(
        "(Get-PhysicalDisk | Sort-Object Size -Descending | Select-Object -First 1).BusType"
    );

    let storage_type = if media_type.contains("SSD") || media_type.contains("4") {
        if bus_type.contains("NVMe") || bus_type.contains("17") {
            "SSD_NVME"
        } else {
            "SSD_SATA"
        }
    } else if media_type.contains("HDD") || media_type.contains("3") {
        "HDD"
    } else {
        // Fallback: se não conseguir detectar, assume SSD
        "SSD_SATA"
    };

    (size_gb, storage_type.to_string())
}

fn get_os() -> String {
    let os = run_powershell(
        "$o = Get-WmiObject Win32_OperatingSystem; \"$($o.Caption) $($o.Version)\""
    );
    if os.is_empty() { "Windows".to_string() } else { os }
}

fn get_windows_username() -> String {
    // Pega o username do Windows (ex: ricardo.moretti)
    let username = run_powershell("$env:USERNAME");
    if username.is_empty() {
        std::env::var("USERNAME").unwrap_or_default()
    } else {
        username
    }
}

fn get_hostname() -> String {
    let hostname = run_powershell("$env:COMPUTERNAME");
    if hostname.is_empty() {
        std::env::var("COMPUTERNAME").unwrap_or_else(|_| "UNKNOWN".to_string())
    } else {
        hostname
    }
}

// ── Coleta todas as informações ────────────────────────────────────

fn coletar_hardware() -> HardwareInfo {
    println!("  [1/8] Service Tag...");
    let service_tag = get_service_tag();

    println!("  [2/8] Tipo de equipamento...");
    let equipment_type = get_equipment_type();

    println!("  [3/8] Modelo...");
    let model = get_model();

    println!("  [4/8] Processador...");
    let cpu = get_cpu();

    println!("  [5/8] Memoria RAM...");
    let ram_gb = get_ram_gb();

    println!("  [6/8] Armazenamento...");
    let (storage_capacity_gb, storage_type) = get_storage();

    println!("  [7/8] Sistema operacional...");
    let os = get_os();

    println!("  [8/8] Usuario Windows...");
    let employee_name = get_windows_username();
    let hostname = get_hostname();

    HardwareInfo {
        service_tag,
        equipment_type,
        model,
        cpu,
        ram_gb,
        storage_capacity_gb,
        storage_type,
        os,
        employee_name,
        hostname,
    }
}

// ── Envia para o MySQL ─────────────────────────────────────────────

fn enviar_para_banco(info: &HardwareInfo) -> Result<String, Box<dyn std::error::Error>> {
    println!("\n>> Conectando ao servidor MySQL ({})...", MYSQL_HOST);

    let opts = OptsBuilder::new()
        .ip_or_hostname(Some(MYSQL_HOST))
        .tcp_port(MYSQL_PORT)
        .user(Some(MYSQL_USER))
        .pass(Some(MYSQL_PASS))
        .db_name(Some(MYSQL_DB))
        .tcp_connect_timeout(Some(Duration::from_secs(10)))
        .read_timeout(Some(Duration::from_secs(10)))
        .write_timeout(Some(Duration::from_secs(10)));

    let pool = Pool::new(opts)?;
    let mut conn = pool.get_conn()?;

    // Garante que a filial "Pendente" existe
    conn.exec_drop(
        "INSERT IGNORE INTO branches (id, name) VALUES (?, ?)",
        (BRANCH_PENDENTE_ID, BRANCH_PENDENTE_NAME),
    )?;

    // Verifica se a service tag já existe
    let exists: Option<String> = conn.exec_first(
        "SELECT id FROM assets WHERE service_tag = ?",
        (&info.service_tag,),
    )?;

    if let Some(existing_id) = exists {
        println!("\n!! Service Tag '{}' ja existe no banco (ID: {}).", info.service_tag, existing_id);
        println!("   Atualizando informacoes de hardware...");

        // Atualiza as informações de hardware do ativo existente
        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
        conn.exec_drop(
            r"UPDATE assets SET
                cpu = ?, ram_gb = ?, storage_capacity_gb = ?, storage_type = ?,
                os = ?, model = ?, equipment_type = ?, notes = CONCAT(notes, ?),
                updated_at = ?
              WHERE service_tag = ?",
            (
                &info.cpu,
                info.ram_gb,
                info.storage_capacity_gb,
                &info.storage_type,
                &info.os,
                &info.model,
                &info.equipment_type,
                &format!("\n[Coletor] Atualizado em {} | Host: {} | User: {}",
                    now, info.hostname, info.employee_name),
                &now,
                &info.service_tag,
            ),
        )?;

        return Ok(existing_id);
    }

    // Cria novo ativo
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let notes = format!(
        "[Coletado automaticamente] Host: {} | User: {} | Data: {}",
        info.hostname, info.employee_name, now
    );

    // employee_name vem do username Windows (pode ser vazio em máquinas novas)
    let employee_name: Option<&str> = if info.employee_name.is_empty() {
        None
    } else {
        Some(&info.employee_name)
    };

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
            "id" => &id,
            "service_tag" => &info.service_tag,
            "equipment_type" => &info.equipment_type,
            "status" => "STOCK",
            "employee_name" => employee_name,
            "branch_id" => BRANCH_PENDENTE_ID,
            "ram_gb" => info.ram_gb,
            "storage_capacity_gb" => info.storage_capacity_gb,
            "storage_type" => &info.storage_type,
            "os" => &info.os,
            "cpu" => &info.cpu,
            "model" => &info.model,
            "year" => None::<i64>,
            "notes" => &notes,
            "is_training" => 0_i32,
            "warranty_start" => None::<String>,
            "warranty_end" => None::<String>,
            "created_at" => &now,
            "updated_at" => &now,
        },
    )?;

    // Registra na auditoria
    let audit_id = uuid::Uuid::new_v4().to_string();
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
    println!("╔══════════════════════════════════════════════╗");
    println!("║   AssetAgro Collector v1.0                   ║");
    println!("║   Tracbel Agro — Departamento de TI          ║");
    println!("╚══════════════════════════════════════════════╝");
    println!();
    println!(">> Coletando informacoes de hardware...\n");

    let info = coletar_hardware();

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
    match enviar_para_banco(&info) {
        Ok(id) => {
            println!(">> SUCESSO! Ativo registrado no banco.");
            println!("   ID: {}", id);
            println!("   Status: STOCK (Pendente de alocacao)");
            println!("   Filial: Pendente (definir no AssetAgro)");
        }
        Err(e) => {
            println!(">> ERRO ao enviar para o banco:");
            println!("   {}", e);
            println!();
            println!("   Verifique:");
            println!("   - Se o servidor {} esta acessivel", MYSQL_HOST);
            println!("   - Se a porta {} esta aberta", MYSQL_PORT);
            println!("   - Se as credenciais estao corretas");
        }
    }

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
