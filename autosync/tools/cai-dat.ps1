# Cai lich chay dong bo tu dong: moi 1 gio (7:30, 8:30, ...; auto-sync.ps1 chi gui trong khung 7:30 - 17:30) + khi dang nhap Windows
# (Task Scheduler, tai khoan Windows dang dang nhap). Chay lai file nay de cap nhat lich chay (ghi de lich cu).
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
# Lich chay ben vung: lap moi 1 gio (7:30, 8:30, ... ca ngay, khong gioi han) - auto-sync.ps1 tu bo qua ngoai 7:30 - 17:30.
# Them 1 lan chay khi dang nhap Windows (tre 3 phut cho VPN ket noi) de bu lan bi lo khi may tat / chua dang nhap.
$hourly = New-ScheduledTaskTrigger -Once -At '07:30' -RepetitionInterval (New-TimeSpan -Hours 1)
$logon = New-ScheduledTaskTrigger -AtLogOn -User ($env:USERDOMAIN + '\' + $env:USERNAME)
$logon.Delay = 'PT3M'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew

function Register-Task($triggers) {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Settings $settings -Force `
    -Description 'Dong bo thu muc 12_HoSo_TrinhKy len web CENTRAL PROCUREMENT DEPARTMENT moi gio 7:30 - 17:30.' -ErrorAction Stop | Out-Null
}
try {
  Register-Task @($hourly, $logon)
} catch {
  # Mot so may khong cho tai khoan thuong tao lich "khi dang nhap" -> chi dung lich moi gio.
  try {
    Register-Task @($hourly)
    Write-Output 'Luu y: khong tao duoc lich "khi dang nhap Windows", chi dung lich moi gio.'
  } catch {
    Write-Output ('KHONG CAI DUOC lich chay: ' + $_.Exception.Message)
    Write-Output 'Thu chuot phai PowerShell -> Run as administrator roi chay lai cai-dat.ps1, hoac nho IT cho phep tao Scheduled Task.'
    Read-Host 'Nhan Enter de dong'
    exit 1
  }
}

$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Output "Da cai lich chay '$TaskName': moi gio 7:30 - 17:30 (va khi dang nhap Windows)."
Write-Output ('Lan chay ke tiep: ' + $info.NextRunTime)
Write-Output 'Chay thu ngay bay gio...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -Force
Write-Output ''
Write-Output 'Xong. Kiem tra tren web: Quan tri -> the "Dong bo thu muc tu dong".'
Read-Host 'Nhan Enter de dong'
