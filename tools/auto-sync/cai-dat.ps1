# Cai lich chay dong bo tu dong: moi ngay 7:30, lap lai moi 1 gio den 17:30 (Task Scheduler, tai khoan Windows dang dang nhap).
# Chay 1 lan: chuot phai -> Run with PowerShell, hoac: powershell -ExecutionPolicy Bypass -File cai-dat.ps1
# Go bo: powershell -ExecutionPolicy Bypass -File cai-dat.ps1 -GoBo

param([switch]$GoBo)

$TaskName = 'CENTRAL PMH - Dong bo thu muc'

if ($GoBo) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output "Da go lich chay '$TaskName'."
  exit 0
}

$script = Join-Path $PSScriptRoot 'auto-sync.ps1'
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'auto-sync.config.json'))) {
  Write-Output 'Chua co file auto-sync.config.json. Chep auto-sync.config.example.json thanh auto-sync.config.json va dien key truoc.'
  exit 1
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $script + '"') -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Daily -At '07:30'
# Lap lai moi 1 gio trong 10 gio 1 phut: 7:30, 8:30, ..., 17:30.
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At '07:30' -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Hours 10 -Minutes 1)).Repetition
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force `
  -Description 'Dong bo thu muc 12_HoSo_TrinhKy len web CENTRAL PROCUREMENT DEPARTMENT moi gio 7:30 - 17:30.' | Out-Null

Write-Output "Da cai lich chay '$TaskName': moi ngay 7:30 - 17:30, moi 1 gio."
Write-Output 'Chay thu ngay bay gio...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -Force
