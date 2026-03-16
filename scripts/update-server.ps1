# ============================================================
# AssetAgro — Servidor de Atualizações (HTTP na porta 8765)
# Servir arquivos de C:\AssetAgro\updates\
#
# Executar como: powershell -ExecutionPolicy Bypass -File update-server.ps1
# ============================================================

$UpdatesDir = "C:\AssetAgro\updates"
$Port       = 8765
$Prefix     = "http://+:$Port/"

if (-not (Test-Path $UpdatesDir)) {
    New-Item -ItemType Directory -Path $UpdatesDir -Force | Out-Null
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)
$listener.Start()

Write-Host "[AssetAgro Update Server] Ouvindo em http://localhost:$Port/ → $UpdatesDir"
Write-Host "Pressione Ctrl+C para parar."

while ($listener.IsListening) {
    try {
        $ctx  = $listener.GetContext()
        $req  = $ctx.Request
        $resp = $ctx.Response

        $rawPath   = $req.Url.LocalPath.TrimStart('/')
        $safePath  = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($UpdatesDir, $rawPath))

        # Segurança: bloquear path traversal
        if (-not $safePath.StartsWith($UpdatesDir)) {
            $resp.StatusCode = 403
            $resp.Close()
            continue
        }

        if (Test-Path $safePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($safePath)
            $resp.StatusCode     = 200
            $resp.ContentLength64 = $bytes.Length

            $ext = [System.IO.Path]::GetExtension($safePath).ToLower()
            $resp.ContentType = switch ($ext) {
                ".json" { "application/json; charset=utf-8" }
                ".exe"  { "application/octet-stream" }
                ".msi"  { "application/octet-stream" }
                ".sig"  { "text/plain" }
                default { "application/octet-stream" }
            }

            $resp.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "[$([datetime]::Now.ToString('HH:mm:ss'))] 200 /$rawPath ($($bytes.Length) bytes)"
        } else {
            $resp.StatusCode = 404
            $msg  = [System.Text.Encoding]::UTF8.GetBytes("Not Found: /$rawPath")
            $resp.ContentLength64 = $msg.Length
            $resp.OutputStream.Write($msg, 0, $msg.Length)
            Write-Host "[$([datetime]::Now.ToString('HH:mm:ss'))] 404 /$rawPath"
        }

        $resp.Close()
    } catch {
        # Ignorar erros de conexão abortada
    }
}
