# ============================================================
# AssetAgro — Instalar Servidor de Atualizações como Serviço
#
# Execute com privilégios de Administrador no servidor 192.168.90.5:
#   powershell -ExecutionPolicy Bypass -File install-update-server.ps1
# ============================================================

$ServerDir  = "C:\AssetAgro\server"
$UpdatesDir = "C:\AssetAgro\updates"
$ScriptPath = "$ServerDir\update-server.ps1"
$TaskName   = "AssetAgro-UpdateServer"

# 1. Criar diretórios
New-Item -ItemType Directory -Path $ServerDir  -Force | Out-Null
New-Item -ItemType Directory -Path $UpdatesDir -Force | Out-Null

# 2. Copiar o script do servidor
$selfDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item "$selfDir\update-server.ps1" $ScriptPath -Force

# 3. Permitir que o HttpListener use a porta 8765 sem UAC
netsh http add urlacl url="http://+:8765/" user="NT AUTHORITY\NETWORK SERVICE" | Out-Null

# 4. Abrir firewall
netsh advfirewall firewall delete rule name="AssetAgro UpdateServer" | Out-Null
netsh advfirewall firewall add rule `
    name="AssetAgro UpdateServer" `
    dir=in action=allow protocol=TCP localport=8765 | Out-Null

# 5. Registrar Scheduled Task que inicia na inicialização do sistema
$action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""

$trigger = New-ScheduledTaskTrigger -AtStartup

$principal = New-ScheduledTaskPrincipal `
    -UserId "NT AUTHORITY\NETWORK SERVICE" `
    -LogonType ServiceAccount `
    -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)   # sem limite

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask `
    -TaskName  $TaskName `
    -Action    $action `
    -Trigger   $trigger `
    -Principal $principal `
    -Settings  $settings `
    -Force | Out-Null

# 6. Iniciar imediatamente
Start-ScheduledTask -TaskName $TaskName

Write-Host ""
Write-Host "=========================================="
Write-Host " AssetAgro Update Server instalado!"
Write-Host " Porta : 8765"
Write-Host " Pasta : $UpdatesDir"
Write-Host " Task  : $TaskName"
Write-Host "=========================================="
Write-Host ""
Write-Host "Coloque os arquivos de atualização em: $UpdatesDir"
Write-Host "  - latest.json"
Write-Host "  - AssetAgro_x.x.x_x64-setup.exe"
Write-Host "  - AssetAgro_x.x.x_x64-setup.exe.sig"
