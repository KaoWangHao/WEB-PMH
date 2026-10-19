# Dong bo thu muc TU DONG cho web "CENTRAL PROCUREMENT DEPARTMENT".
# Doc danh sach file trong thu muc 12_HoSo_TrinhKy (o \\HCM-FS01, can VPN / mang cong ty) roi gui len web app.
# Web tu doi tinh trang ho so theo thu muc (giong dong bo thu cong, lua chon mac dinh). Xem README.md cung thu muc.
# Chay boi Task Scheduler moi 30 phut 7:30 - 17:30 (cai bang cai-dat.ps1). Chay tay: powershell -ExecutionPolicy Bypass -File auto-sync.ps1 -Force

param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'auto-sync.config.json'),
  [switch]$Force  # bo qua kiem tra khung gio 7:30 - 17:30
)

$ErrorActionPreference = 'Stop'
$LogPath = Join-Path $PSScriptRoot 'auto-sync.log'
$ArrivalCachePath = Join-Path $PSScriptRoot 'auto-sync.arrival.json'

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

Write-Log ('Bat dau dong bo (may ' + $env:COMPUTERNAME + ').')
try {
  $cfg = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
  Write-Log ('Khong doc duoc file cau hinh ' + $ConfigPath + ': ' + $_.Exception.Message)
  exit 1
}
if (-not $cfg.webAppUrl -or -not $cfg.key -or -not $cfg.root) { Write-Log 'Thieu webAppUrl / key / root trong file cau hinh.'; exit 1 }

try {
  $rootItem = Get-Item -LiteralPath $cfg.root
} catch {
  $err = 'Khong truy cap duoc thu muc ' + $cfg.root + ' (chua ket noi VPN / mang cong ty?)'
  Write-Log $err
  try { Send-Body $cfg @{ key = $cfg.key; machine = $env:COMPUTERNAME; error = $err } | Out-Null } catch { }
  exit 1
}

# Ngay file / thu muc duoc dat vao cho hien tai (tao, chep, di chuyen): NTFS ChangeTime. Di chuyen file vao thu muc
# Da duyet KHONG doi ngay sua doi (LastWriteTime) nen web dung ngay nay cho ho so chuyen sang Da duyet.
# Luu dem theo duong dan + ngay tao: lan dau thay o cho nay thi doc 1 lan, sau do giu nguyen (khong mo lai file moi 30 phut).
$arrivalOk = $false
try {
  Add-Type -ErrorAction Stop -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class PmhArrival {
  [StructLayout(LayoutKind.Sequential)]
  struct FILE_BASIC_INFO { public long CreationTime; public long LastAccessTime; public long LastWriteTime; public long ChangeTime; public uint FileAttributes; }
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern SafeFileHandle CreateFileW(string name, uint access, uint share, IntPtr sec, uint disposition, uint flags, IntPtr template);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool GetFileInformationByHandleEx(SafeFileHandle h, int infoClass, out FILE_BASIC_INFO info, uint size);
  // ChangeTime (FILETIME UTC) cua file / thu muc; 0 = khong doc duoc.
  public static long ChangeTime(string path) {
    string p = path.StartsWith(@"\\?\") ? path : path.StartsWith(@"\\") ? @"\\?\UNC\" + path.Substring(2) : @"\\?\" + path;
    // FILE_READ_ATTRIBUTES, chia se doc/ghi/xoa, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS (mo duoc thu muc)
    using (SafeFileHandle h = CreateFileW(p, 0x80, 7, IntPtr.Zero, 3, 0x02000000, IntPtr.Zero)) {
      if (h.IsInvalid) return 0;
      FILE_BASIC_INFO info;
      if (!GetFileInformationByHandleEx(h, 0, out info, (uint)Marshal.SizeOf(typeof(FILE_BASIC_INFO)))) return 0;
      return info.ChangeTime;
    }
  }
}
'@
  $arrivalOk = $true
} catch {
  Write-Log ('Khong doc duoc ngay file vao thu muc (web se ghi ngay dong bo): ' + $_.Exception.Message)
}
$arrivalOld = @{}
if ($arrivalOk -and (Test-Path -LiteralPath $ArrivalCachePath)) {
  try {
    (Get-Content -LiteralPath $ArrivalCachePath -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $arrivalOld[$_.Name] = $_.Value }
  } catch { }
}
$arrivalNew = @{}
function Get-Arrival($item) {
  if (-not $arrivalOk) { return $null }
  $k = $item.FullName.ToLowerInvariant() + '|' + $item.CreationTimeUtc.Ticks
  $v = $arrivalOld[$k]
  if (-not $v) {
    try { $t = [PmhArrival]::ChangeTime($item.FullName) } catch { $t = 0 }
    if ($t -le 0) { return $null }
    $v = [DateTime]::FromFileTimeUtc($t).ToLocalTime().ToString('yyyy-MM-dd')
  }
  $arrivalNew[$k] = $v
  return $v
}

$base = $rootItem.FullName.TrimEnd('\')
$skip = @('thumbs.db', 'desktop.ini')
$items = Get-ChildItem -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue

$list = New-Object System.Collections.Generic.List[object]
$dirs = New-Object System.Collections.Generic.List[object]
foreach ($f in $items) {
  $p = $rootItem.Name + '/' + $f.FullName.Substring($base.Length + 1).Replace('\', '/')
  if ($f.PSIsContainer) {
    $a = Get-Arrival $f
    if ($a) { $dirs.Add([pscustomobject]@{ p = $p; a = $a }) }
    continue
  }
  if ($f.Name.StartsWith('~$') -or $f.Name.StartsWith('.') -or ($skip -contains $f.Name.ToLower())) { continue }
  $o = [ordered]@{ p = $p; d = $f.LastWriteTime.ToString('yyyy-MM-dd') }
  $a = Get-Arrival $f
  if ($a) { $o.a = $a }
  $list.Add([pscustomobject]$o)
}
if ($arrivalOk) {
  try { $arrivalNew | ConvertTo-Json -Compress | Set-Content -LiteralPath $ArrivalCachePath -Encoding UTF8 } catch { }
}

try {
  $res = Send-Body $cfg @{ key = $cfg.key; machine = $env:COMPUTERNAME; files = $list.ToArray(); dirs = $dirs.ToArray() }
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
