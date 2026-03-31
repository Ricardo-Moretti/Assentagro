# ============================================================
# AssetAgro - Script de Deploy de Atualização
#
# Uso (no computador de desenvolvimento):
#   $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content .\src-tauri\assetagro.key -Raw
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-update.ps1
#
# O script:
#   1. Compila o app com assinatura
#   2. Localiza o instalador .exe e o arquivo .sig gerado
#   3. Gera latest.json apontando para o servidor interno
#   4. Copia tudo para \\192.168.90.5\AssetAgro\updates  (ou via SCP/robocopy)
# ============================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Configurações ---
$Version      = "1.7.1"   # <-- atualizar junto com tauri.conf.json e Cargo.toml
$ServerHost   = "192.168.90.5"
$ServerPort   = 8765
$ServerShare  = "\\$ServerHost\AssetAgro\updates"   # ajustar se necessário
$UpdatesUrl   = "http://$ServerHost`:$ServerPort"

# Pasta raiz do projeto
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

# --- 1. Verificar chave de assinatura ---
if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
    $KeyFile = "src-tauri\assetagro.key"
    if (Test-Path $KeyFile) {
        $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content $KeyFile -Raw).Trim()
        Write-Host "[deploy] Chave carregada de $KeyFile"
    } else {
        Write-Error "TAURI_SIGNING_PRIVATE_KEY não definida e $KeyFile não encontrado."
    }
} else {
    $env:TAURI_SIGNING_PRIVATE_KEY = $env:TAURI_SIGNING_PRIVATE_KEY.Trim()
}

# Senha da chave — DEVE ser definida como variável de ambiente antes do deploy
if (-not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
    Write-Error "TAURI_SIGNING_PRIVATE_KEY_PASSWORD nao definida. Defina com: `$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = 'sua-senha'"
}

# --- 2. Apagar .sig antigo para garantir nova assinatura apos o build ---
$BundleDir = "src-tauri\target\release\bundle\nsis"
Get-ChildItem "$BundleDir\*.sig" | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "[deploy] .sig anterior removido (sera re-assinado apos o build)"

# --- 3. Build ---
Write-Host "[deploy] Compilando AssetAgro v$Version..."
npm run tauri build
if ($LASTEXITCODE -ne 0) { Write-Error "Build falhou." }

# --- 4. Localizar instalador ---
$ExeFile   = Get-ChildItem "$BundleDir\*.exe" | Sort-Object LastWriteTime | Select-Object -Last 1
if (-not $ExeFile) { Write-Error "Instalador .exe não encontrado em $BundleDir" }

# --- 4b. Localizar ou gerar assinatura ---
$SigFile = Get-Item "$($ExeFile.FullName).sig" -ErrorAction SilentlyContinue
if (-not $SigFile) {
    Write-Host "[deploy] .sig não gerado pelo build - assinando manualmente..."
    $env:TAURI_SIGNING_PRIVATE_KEY = ""
    npx tauri signer sign -f "src-tauri\assetagro.key" -p "$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD" $ExeFile.FullName
    if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao assinar o instalador." }
    $SigFile = Get-Item "$($ExeFile.FullName).sig" -ErrorAction SilentlyContinue
    if (-not $SigFile) { Write-Error "Arquivo .sig não encontrado mesmo após assinatura manual." }
    Write-Host "[deploy] Assinatura manual concluída."
}

$ExeName = $ExeFile.Name
$SigContent = Get-Content $SigFile.FullName -Raw

Write-Host "[deploy] Instalador : $ExeName"
Write-Host "[deploy] Assinatura : $($SigFile.Name)"

# --- 4. Gerar latest.json ---
$PubDate  = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
$LatestJson = @{
    version  = $Version
    pub_date = $PubDate
    platforms = @{
        "windows-x86_64" = @{
            signature = $SigContent.Trim()
            url       = "$UpdatesUrl/$ExeName"
        }
    }
} | ConvertTo-Json -Depth 5

$LatestJsonPath = "$BundleDir\latest.json"
# UTF-8 sem BOM - o parser do Tauri rejeita BOM silenciosamente
$utf8NoBOM = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $BundleDir).Path + "\latest.json", $LatestJson, $utf8NoBOM)
Write-Host "[deploy] latest.json gerado em $LatestJsonPath"

# --- 5. Copiar para o servidor ---
if (Test-Path $ServerShare) {
    Copy-Item $ExeFile.FullName "$ServerShare\$ExeName" -Force
    Copy-Item $SigFile.FullName "$ServerShare\$ExeName.sig" -Force
    Copy-Item $LatestJsonPath   "$ServerShare\latest.json" -Force
    Write-Host "[deploy] Arquivos copiados para $ServerShare"
} else {
    Write-Host "[deploy] AVISO: $ServerShare não acessível. Copie manualmente:"
    Write-Host "   $($ExeFile.FullName)"
    Write-Host "   $($SigFile.FullName)"
    Write-Host "   $LatestJsonPath"
    Write-Host "  -> para: $ServerShare"
}

Write-Host ""
Write-Host "=========================================="
Write-Host " Deploy concluído! v$Version publicada."
Write-Host " Os clientes receberão a atualização"
Write-Host " automaticamente na próxima inicialização."
Write-Host "=========================================="
