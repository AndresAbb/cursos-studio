# enable-mongo-auth.ps1 - turn on MongoDB authentication, safely.
#
# Run AFTER setup-mongo-auth.bat has created the users. It:
#   * self-elevates (UAC prompt),
#   * backs up mongod.cfg,
#   * adds  security.authorization: enabled  (idempotent),
#   * optionally widens bindIp to 0.0.0.0 for the Docker setup (-BindAll),
#   * validates the new config BEFORE restarting the service.
#
# Usage (from a normal PowerShell - it will elevate itself):
#   powershell -ExecutionPolicy Bypass -File .\enable-mongo-auth.ps1
#   powershell -ExecutionPolicy Bypass -File .\enable-mongo-auth.ps1 -BindAll
#
# Undo: restore the printed .bak file over mongod.cfg and Restart-Service MongoDB.

param(
  [string]$Cfg     = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg",
  [string]$Mongod  = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe",
  [string]$Service = "MongoDB",
  [switch]$BindAll   # also listen on 0.0.0.0 - needed only for the Docker setup
)

$ErrorActionPreference = 'Stop'

# 1. Re-launch elevated if we're not admin.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "Requesting administrator permissions..."
  # -NoExit keeps the elevated window open so you can read the result.
  $a = @('-NoExit','-ExecutionPolicy','Bypass','-File', "`"$PSCommandPath`"")
  if ($BindAll) { $a += '-BindAll' }
  Start-Process powershell -Verb RunAs -ArgumentList $a
  return
}

if (-not (Test-Path $Cfg))    { throw "Config not found: $Cfg" }
if (-not (Test-Path $Mongod)) { throw "mongod.exe not found: $Mongod" }

# 2. Backup.
$backup = "$Cfg.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
Copy-Item $Cfg $backup
Write-Host "Backup created: $backup"

# 3. Edit, idempotently.
$txt = Get-Content $Cfg -Raw

if ($txt -match '(?m)^\s*authorization:\s*enabled') {
  Write-Host "= authorization already enabled."
} else {
  if ($txt -match '(?m)^[#\s]*security:\s*$') {
    # Replace the (possibly commented) 'security:' line with a real block.
    $txt = $txt -replace '(?m)^[#\s]*security:\s*$', "security:`r`n  authorization: enabled"
  } else {
    $txt = $txt.TrimEnd() + "`r`n`r`nsecurity:`r`n  authorization: enabled`r`n"
  }
  Write-Host "+ security.authorization: enabled"
}

if ($BindAll) {
  if ($txt -match '0\.0\.0\.0') {
    Write-Host "= bindIp already includes 0.0.0.0."
  } elseif ($txt -match '(?m)^(\s*bindIp:\s*)127\.0\.0\.1\s*$') {
    $txt = $txt -replace '(?m)^(\s*bindIp:\s*)127\.0\.0\.1\s*$', '${1}127.0.0.1,0.0.0.0'
    Write-Host "+ bindIp 0.0.0.0  (!) remember to block port 27017 at the firewall."
  } else {
    Write-Warning "Could not adjust bindIp automatically; check it by hand."
  }
}

# 4. Write back WITHOUT a BOM (mongod's YAML parser rejects a BOM).
[System.IO.File]::WriteAllText($Cfg, $txt, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "mongod.cfg updated."

# 5. Validate the config BEFORE touching the running service.
Write-Host "Validating config..."
& $Mongod --config $Cfg --outputConfig | Out-Null
if ($LASTEXITCODE -ne 0) {
  Copy-Item $backup $Cfg -Force
  throw "Invalid config - backup restored. Service was NOT restarted."
}
Write-Host "Config valid."

# 6. Restart.
Restart-Service $Service
Write-Host ""
Write-Host "MongoDB restarted with authentication ENABLED."
Write-Host "  - The app connects as 'cursos_app' (already in .env)."
Write-Host "  - In MongoDB Compass, use a connection string with credentials, e.g.:"
Write-Host "    mongodb://cursos_app:<pass>@localhost:27017/cursos_studio?authSource=cursos_studio"
