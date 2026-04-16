# Registra tarefa agendada: OCS Sync a cada 1 hora
$TaskName = "AssetAgro-OCS-Sync"
$ScriptPath = "$PSScriptRoot\sync.py"
$PythonPath = (Get-Command python).Source

$Action = New-ScheduledTaskAction `
    -Execute $PythonPath `
    -Argument "`"$ScriptPath`"" `
    -WorkingDirectory $PSScriptRoot

$Trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 1) -Once -At (Get-Date)
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -RestartCount 2

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force

Write-Host "[OK] Tarefa '$TaskName' registrada. Sync rodará a cada 1 hora."
Write-Host "     Para rodar agora: Start-ScheduledTask -TaskName '$TaskName'"
