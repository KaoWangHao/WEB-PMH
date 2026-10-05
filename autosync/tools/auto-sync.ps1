# Dong bo thu muc TU DONG cho web "CENTRAL PROCUREMENT DEPARTMENT".
# Doc danh sach file trong thu muc 12_HoSo_TrinhKy (o \\HCM-FS01, can VPN / mang cong ty) roi gui len web app.
# Web tu doi tinh trang ho so theo thu muc (giong dong bo thu cong, lua chon mac dinh). Xem README.md cung thu muc.
# Chay boi Task Scheduler moi gio 7:30 - 17:30 (cai bang cai-dat.ps1). Chay tay: powershell -ExecutionPolicy Bypass -File auto-sync.ps1 -Force

param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'auto-sync.config.json'),
  [switch]$Force  # bo qua kiem tra khung gio 7:30 - 17:30
)

$ErrorActionPreference = 'Stop'
$LogPath = Join-Path $PSScriptRoot 'auto-sync.log'

function Write-Log([string]$msg) {
  $line = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $msg
  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
  Write-Output $line
}

function Send-Body($cfg, $obj) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $json = $obj | ConvertTo-Json -Depth 5 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  # Apps Script tra ve 302 -> PowerShell tu theo link (GET) de lay ket qua.
  return Invoke-RestMethod -Uri $cfg.webAppUrl -Method Post -Body $bytes -ContentType 'application/json; charset=utf-8' -TimeoutSec 300
}

# Giu file log gon (toi da ~2000 dong).
if (Test-Path -LiteralPath $LogPath) {
  $lines = Get-Content -LiteralPath $LogPath -Encoding UTF8
  if ($lines.Count -gt 2000) { $lines | Select-Object -Last 1000 | Set-Content -LiteralPath $LogPath -Encoding UTF8 }
}

if (-not $Force) {
  $now = (Get-Date).TimeOfDay
  if ($now -lt [TimeSpan]'07:25' -or $now -gt [TimeSpan]'17:40') { Write-Log 'Ngoai khung gio 7:30 - 17:30, bo qua.'; exit 0 }
}

$cfg = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $cfg.webAppUrl -or -not $cfg.key -or -not $cfg.root) { Write-Log 'Thieu webAppUrl / key / root trong file cau hinh.'; exit 1 }

try {
  $rootItem = Get-Item -LiteralPath $cfg.root
} catch {
  $err = 'Khong truy cap duoc thu muc ' + $cfg.root + ' (chua ket noi VPN / mang cong ty?)'
  Write-Log $err
  try { Send-Body $cfg @{ key = $cfg.key; machine = $env:COMPUTERNAME; error = $err } | Out-Null } catch { }
  exit 1
}

$base = $rootItem.FullName.TrimEnd('\')
$skip = @('thumbs.db', 'desktop.ini')
$files = Get-ChildItem -LiteralPath $base -Recurse -File -Force -ErrorAction SilentlyContinue |
  Where-Object { -not $_.Name.StartsWith('~$') -and -not $_.Name.StartsWith('.') -and ($skip -notcontains $_.Name.ToLower()) }

$list = New-Object System.Collections.Generic.List[object]
foreach ($f in $files) {
  $rel = $f.FullName.Substring($base.Length + 1).Replace('\', '/')
  $list.Add([pscustomobject]@{ p = $rootItem.Name + '/' + $rel; d = $f.LastWriteTime.ToString('yyyy-MM-dd') })
}

try {
  $res = Send-Body $cfg @{ key = $cfg.key; machine = $env:COMPUTERNAME; files = $list.ToArray() }
  if ($res.ok) {
    Write-Log ('OK: ' + $res.info.files + ' file, ' + $res.info.changed + ' ho so doi tinh trang, ' + $res.info.created + ' tao moi, ' + $res.info.skipped + ' bo qua.')
  } else {
    Write-Log ('Web bao loi: ' + $res.error)
    exit 1
  }
} catch {
  Write-Log ('Loi gui du lieu len web: ' + $_.Exception.Message)
  exit 1
}
