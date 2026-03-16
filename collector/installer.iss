; ============================================================
; AssetAgro Collector — Inno Setup Script
; Agente autônomo de coleta de hardware — Tracbel Agro
; ============================================================

#define AppName    "AssetAgro Collector"
#define AppVersion "1.0.0"
#define AppPublisher "Tracbel Agro"
#define AppExe     "assetagro-collector.exe"
#define TaskName   "AssetAgro Collector"

[Setup]
AppId={{C4D8E3F2-1A2B-4C5D-8E7F-9A0B1C2D3E4F}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\AssetAgro Collector
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=AssetAgroCollector_Setup_{#AppVersion}
SetupIconFile=..\src-tauri\icons\icon.ico
UninstallDisplayIcon={app}\{#AppExe}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
PrivilegesRequired=admin
MinVersion=10.0

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
Source: "target\release\{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion

; ============================================================
; [Code] — Registra/remove tarefa agendada via PowerShell
; A tarefa roda no login de QUALQUER usuário (BUILTIN\Users),
; com a janela oculta, capturando o username correto do logon.
; ============================================================

[Code]

procedure RegisterTask(AppDir: string);
var
  ExePath: string;
  PsCmd:   string;
  ResultCode: Integer;
begin
  ExePath := AppDir + '\{#AppExe}';

  PsCmd :=
    '-NoProfile -NonInteractive -WindowStyle Hidden -Command ' +
    '"' +
      '$a = New-ScheduledTaskAction -Execute ''' + ExePath + '''; ' +
      '$t = New-ScheduledTaskTrigger -AtLogOn; ' +
      '$p = New-ScheduledTaskPrincipal -GroupId ''BUILTIN\Users'' -RunLevel Limited; ' +
      '$s = New-ScheduledTaskSettingsSet -Hidden -ExecutionTimeLimit PT5M -MultipleInstances IgnoreNew; ' +
      'Register-ScheduledTask -TaskName ''{#TaskName}'' -Action $a -Trigger $t -Principal $p -Settings $s -Force' +
    '"';

  if not Exec('powershell.exe', PsCmd, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    MsgBox('Aviso: não foi possível registrar a tarefa agendada.' + #13#10 +
           'Execute o instalador como Administrador.', mbInformation, MB_OK);
end;

procedure UnregisterTask;
var
  PsCmd: string;
  ResultCode: Integer;
begin
  PsCmd :=
    '-NoProfile -NonInteractive -WindowStyle Hidden -Command ' +
    '"Unregister-ScheduledTask -TaskName ''{#TaskName}'' -Confirm:$false -ErrorAction SilentlyContinue"';

  Exec('powershell.exe', PsCmd, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    RegisterTask(ExpandConstant('{app}'));
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    UnregisterTask;
end;

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
