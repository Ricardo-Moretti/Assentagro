; ============================================================
; AssetAgro Collector — NSIS Installer Script
; Agente autônomo de coleta de hardware — Tracbel Agro
; ============================================================

Unicode True
!include "MUI2.nsh"

; ── Definições ────────────────────────────────────────────
!define APP_NAME    "AssetAgro Collector"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Tracbel Agro"
!define APP_EXE     "assetagro-collector.exe"
!define TASK_NAME   "AssetAgro Collector"
!define REG_UNINST  "Software\Microsoft\Windows\CurrentVersion\Uninstall\AssetAgro Collector"

; ── Configurações gerais ──────────────────────────────────
Name            "${APP_NAME}"
OutFile         "AssetAgroCollector_Setup_${APP_VERSION}.exe"
InstallDir      "$PROGRAMFILES64\AssetAgro Collector"
InstallDirRegKey HKLM "${REG_UNINST}" "InstallLocation"
RequestExecutionLevel admin
ShowInstDetails  show
ShowUninstDetails show

; ── MUI2 ─────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON   "..\src-tauri\icons\icon.ico"
!define MUI_UNICON "..\src-tauri\icons\icon.ico"

!define MUI_WELCOMEPAGE_TITLE   "Bem-vindo ao ${APP_NAME}"
!define MUI_WELCOMEPAGE_TEXT    "Este assistente irá instalar o ${APP_NAME} ${APP_VERSION} no seu computador.$\r$\n$\r$\nO coletor roda automaticamente no login de cada usuário e envia as informações de hardware para o servidor AssetAgro.$\r$\n$\r$\nClique em Próximo para continuar."
!define MUI_FINISHPAGE_RUN      "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Executar coleta agora"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

; ── Seção principal ───────────────────────────────────────
Section "Instalar" SEC_MAIN

  SetOutPath "$INSTDIR"
  File "target\release\${APP_EXE}"

  ; ── Registra tarefa agendada ──────────────────────────
  ; Escreve um PS1 real para evitar quoting hell no NSIS.
  ; $INSTDIR é expandido em runtime pelo FileWrite.
  DetailPrint "Registrando tarefa agendada no Windows..."

  FileOpen  $9 "$TEMP\assetagro_register_task.ps1" w
  FileWrite $9 "$$a = New-ScheduledTaskAction -Execute '$INSTDIR\${APP_EXE}'$\n"
  FileWrite $9 "$$t = New-ScheduledTaskTrigger -AtLogOn$\n"
  FileWrite $9 "$$p = New-ScheduledTaskPrincipal -GroupId 'BUILTIN\Users' -RunLevel Limited$\n"
  FileWrite $9 "$$s = New-ScheduledTaskSettingsSet -Hidden -ExecutionTimeLimit 'PT5M' -MultipleInstances IgnoreNew$\n"
  FileWrite $9 "Register-ScheduledTask -TaskName '${TASK_NAME}' -Action $$a -Trigger $$t -Principal $$p -Settings $$s -Force | Out-Null$\n"
  FileClose $9

  ExecWait 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "$TEMP\assetagro_register_task.ps1"' $0
  Delete   "$TEMP\assetagro_register_task.ps1"

  ${If} $0 == 0
    DetailPrint "Tarefa agendada registrada com sucesso."
  ${Else}
    DetailPrint "Aviso: falha ao registrar tarefa agendada (código $0)."
    MessageBox MB_OK|MB_ICONINFORMATION \
      "Aviso: não foi possível registrar a tarefa agendada.$\r$\nVocê pode criá-la manualmente ou reinstalar como Administrador."
  ${EndIf}

  ; ── Entradas de desinstalação ─────────────────────────
  WriteRegStr   HKLM "${REG_UNINST}" "DisplayName"     "${APP_NAME}"
  WriteRegStr   HKLM "${REG_UNINST}" "DisplayVersion"  "${APP_VERSION}"
  WriteRegStr   HKLM "${REG_UNINST}" "Publisher"       "${APP_PUBLISHER}"
  WriteRegStr   HKLM "${REG_UNINST}" "InstallLocation" "$INSTDIR"
  WriteRegStr   HKLM "${REG_UNINST}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKLM "${REG_UNINST}" "NoModify"        1
  WriteRegDWORD HKLM "${REG_UNINST}" "NoRepair"        1

  WriteUninstaller "$INSTDIR\uninstall.exe"

SectionEnd

; ── Desinstalador ─────────────────────────────────────────
Section "Uninstall"

  DetailPrint "Removendo tarefa agendada..."
  FileOpen  $9 "$TEMP\assetagro_remove_task.ps1" w
  FileWrite $9 "Unregister-ScheduledTask -TaskName '${TASK_NAME}' -Confirm:$$false -ErrorAction SilentlyContinue$\n"
  FileClose $9
  ExecWait 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "$TEMP\assetagro_remove_task.ps1"' $0
  Delete "$TEMP\assetagro_remove_task.ps1"

  Delete "$INSTDIR\${APP_EXE}"
  Delete "$INSTDIR\uninstall.exe"
  RMDir  "$INSTDIR"

  DeleteRegKey HKLM "${REG_UNINST}"

  DetailPrint "AssetAgro Collector removido com sucesso."

SectionEnd
