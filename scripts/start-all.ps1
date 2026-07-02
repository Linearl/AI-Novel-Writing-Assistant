# ai-novel - one-shot startup script
# Usage: .\scripts\start-all.ps1 [-Stop] [-Restart] [-Status] [-Mode dev|desktop] [-Help]
#
# Default mode: dev (web browser, no Electron)
# Pass -Mode desktop to launch Electron shell
#
# Design rules:
#   1. NEVER touch port 3000 - that is the published release version
#   2. Dev suite prefers 3100 (server) + 5173 (client), but auto-avoids
#      occupied ports by scanning upward (3101, 3102, ... / 5174, 5175, ...)
#   3. Desktop in dev mode is "external": reuses our dev server
#      (set AI_NOVEL_DESKTOP_SERVER_MODE=external + AI_NOVEL_SERVER_PORT=<resolved>)
#   4. Logs flow through scripts/run-with-log.cjs -> .logs\<session>\

[CmdletBinding()]
param(
    [Parameter(HelpMessage = "Show help")]
    [Alias("h")]
    [switch]$Help,

    [Parameter(HelpMessage = "Start mode: dev (3100+5173), desktop (dev + Electron)")]
    [ValidateSet("dev", "desktop")]
    [string]$Mode = "dev",

    [switch]$Stop,
    [switch]$Restart,
    [switch]$Status
)

$ErrorActionPreference = "Stop"

# ─── Path resolution ────────────────────────────────────────────
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$LogsDir     = Join-Path $ProjectRoot ".logs"
$EnvFile     = Join-Path $ProjectRoot "server\.env"
$ClientEnv   = Join-Path $ProjectRoot "client\.env"

# Isolation ports (3000 is reserved for the published release)
$DevServerPort = 3100
$DevClientPort = 5173
$ReleasePort   = 3000

# Colors
function Write-Banner {
    param([string]$Text, [string]$Color = "Cyan")
    $bar = "=" * 60
    Write-Host ""
    Write-Host $bar -ForegroundColor $Color
    Write-Host "  $Text" -ForegroundColor $Color
    Write-Host $bar -ForegroundColor $Color
    Write-Host ""
}
function Write-Info  { param([string]$Msg) Write-Host "[info]  $Msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "[ ok ]  $Msg" -ForegroundColor Green }
function Write-Warn  { param([string]$Msg) Write-Host "[warn]  $Msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$Msg) Write-Host "[fail]  $Msg" -ForegroundColor Red }
function Write-Stage { param([string]$Msg) Write-Host ""; Write-Host "--- $Msg ---" -ForegroundColor Magenta }

# ─── Help ────────────────────────────────────────────────
if ($Help) {
    Write-Banner "ai-novel startup script"
    @"
Usage:
  .\scripts\start-all.ps1 [options]

Options:
  -Help, -h            Show this help
  -Mode <dev|desktop>  Start mode (default: dev)
                       dev     = shared + server + client
                       desktop = dev suite + Electron
  -Stop                Stop all dev processes (never touches 3000 release)
  -Restart             -Stop then start
  -Status              Show running processes / ports / health

Port contract:
  3000     Published release (do not touch)
  3100+    Dev server (auto-avoids occupied ports, scans upward)
  5173+    Dev client (auto-avoids occupied ports, scans upward)

Logs:
  .logs\<session-name>\   stdout/stderr per process

Examples:
  .\scripts\start-all.ps1                      # Start in dev mode (web)
  .\scripts\start-all.ps1 -Mode desktop        # Dev suite + Electron
  .\scripts\start-all.ps1 -Status              # Show status
  .\scripts\start-all.ps1 -Restart             # Restart
  .\scripts\start-all.ps1 -Stop                # Stop dev
"@
    exit 0
}

# ─── Utilities ────────────────────────────────────────────────
function Test-PortListening {
    param([int]$Port)
    $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    return [bool]$conn
}

function Get-PortOwner {
    param([int]$Port)
    $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($conn.OwningProcess)" -ErrorAction SilentlyContinue
    return @{
        Pid  = $conn.OwningProcess
        Name = if ($proc) { $proc.Name } else { "?" }
        Cmd  = if ($proc) { (($proc.CommandLine -split ' ') | Select-Object -First 3) -join ' ' } else { "?" }
    }
}

<#  Find an available port starting from $PreferredPort, scanning upward.
    Returns the first port that is not currently listening.
    Scans up to $MaxScan ports above the preferred port. #>
function Find-AvailablePort {
    param(
        [int]$PreferredPort,
        [int]$MaxScan = 20
    )
    for ($i = 0; $i -le $MaxScan; $i++) {
        $candidate = $PreferredPort + $i
        if (-not (Test-PortListening -Port $candidate)) {
            return $candidate
        }
    }
    return $null
}

function Test-ServerHealth {
    param([int]$Port)
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 3
        return $resp.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Test-ClientReady {
    param([int]$Port)
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 3
        return $resp.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Get-DevPids {
    # Match ANY process whose command line references this project root.
    # This covers node, electron, cmd (desktop launcher), pnpm, npx, tsx, etc.
    # Path-based filter ensures we never kill the 3000 release process.
    $allNames = @(
        'node.exe', 'electron.exe',
        'cmd.exe', 'pnpm.exe', 'npx.cmd', 'tsx.exe', 'tsc.exe', 'esbuild.exe'
    )
    $filter = ($allNames | ForEach-Object { "Name = '$_'" }) -join ' OR '
    $procs = Get-CimInstance Win32_Process -Filter $filter -ErrorAction SilentlyContinue
    $matched = @()
    foreach ($p in $procs) {
        $cl = $p.CommandLine
        if ($cl -and $cl -match [regex]::Escape($ProjectRoot.Path)) {
            $matched += [pscustomobject]@{
                Pid  = $p.ProcessId
                Name = $p.Name
                Cmd  = (($cl -split ' ') | Select-Object -First 5) -join ' '
            }
        }
    }
    return $matched
}

# ─── Process launcher (writes logs via run-with-log.cjs) ─────────────
function Start-DevProcess {
    param(
        [string]$Name,
        [string]$Command,
        [string]$WorkingDir = $ProjectRoot.Path,
        [hashtable]$ExtraEnv = @{}
    )

    $logSession = "dev-$Name-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $logPath = Join-Path $LogsDir $logSession
    New-Item -ItemType Directory -Force -Path $logPath | Out-Null

    $runLogScript = Join-Path $ScriptDir "run-with-log.cjs"

    # Build the node command line: node run-with-log.cjs --name X --dir Y -- pnpm ...
    $nodeArgs = @(
        $runLogScript,
        "--name", $logSession,
        "--dir", $LogsDir,
        "--"
    ) + ($Command -split ' ')

    Write-Info "starting [$Name] -> $Command"
    Write-Info "         log -> $logPath"
    if ($ExtraEnv.Count -gt 0) {
        $envDesc = ($ExtraEnv.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ", "
        Write-Info "         env -> $envDesc"
    }

    # Apply per-process env vars (save → set → launch → restore)
    $savedEnv = @{}
    foreach ($key in $ExtraEnv.Keys) {
        $savedEnv[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
        [Environment]::SetEnvironmentVariable($key, $ExtraEnv[$key], "Process")
    }

    try {
        $proc = Start-Process `
            -FilePath "node" `
            -ArgumentList $nodeArgs `
            -WorkingDirectory $WorkingDir `
            -WindowStyle Hidden `
            -RedirectStandardOutput (Join-Path $logPath "stdout.log") `
            -RedirectStandardError  (Join-Path $logPath "stderr.log") `
            -PassThru
    } finally {
        # Restore original env vars so they don't leak to the next process
        foreach ($key in $savedEnv.Keys) {
            [Environment]::SetEnvironmentVariable($key, $savedEnv[$key], "Process")
        }
    }

    return @{
        Name    = $Name
        Pid     = $proc.Id
        LogPath = $logPath
    }
}

# ─── Status display ────────────────────────────────────────────
function Show-Status {
    Write-Banner "ai-novel status"

    $relOwner = Get-PortOwner -Port $ReleasePort
    if ($relOwner) {
        Write-Info "port ${ReleasePort} (release):  PID=$($relOwner.Pid)  Name=$($relOwner.Name)"
    } else {
        Write-Warn "port ${ReleasePort} (release):  not listening"
    }

    $srvOwner = Get-PortOwner -Port $DevServerPort
    $srvHealth = Test-ServerHealth -Port $DevServerPort
    if ($srvOwner) {
        $okText = if ($srvHealth) { "healthy" } else { "unhealthy" }
        $color  = if ($srvHealth) { "Green" } else { "Yellow" }
        Write-Host ("[ ok ] port {0} (dev server):  PID={1}  health={2}" -f $DevServerPort, $srvOwner.Pid, $okText) -ForegroundColor $color
    } else {
        Write-Host ("[info] port {0} (dev server):  not listening" -f $DevServerPort) -ForegroundColor Gray
    }

    $cliOwner = Get-PortOwner -Port $DevClientPort
    $cliReady = Test-ClientReady -Port $DevClientPort
    if ($cliOwner) {
        $okText = if ($cliReady) { "ready" } else { "starting" }
        $color  = if ($cliReady) { "Green" } else { "Yellow" }
        Write-Host ("[ ok ] port {0} (dev client):  PID={1}  ready={2}" -f $DevClientPort, $cliOwner.Pid, $okText) -ForegroundColor $color
    } else {
        Write-Host ("[info] port {0} (dev client):  not listening" -f $DevClientPort) -ForegroundColor Gray
    }

    $elecProcs = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" -ErrorAction SilentlyContinue
    $elecFound = $false
    if ($elecProcs) {
        foreach ($e in $elecProcs) {
            $cl = $e.CommandLine
            if ($cl -and $cl -match [regex]::Escape($ProjectRoot.Path)) {
                Write-Ok "Electron desktop:  PID=$($e.ProcessId)  running"
                $elecFound = $true
            }
        }
    }
    if (-not $elecFound) {
        Write-Host "[info] Electron desktop:  not running" -ForegroundColor Gray
    }

    if (Test-Path $EnvFile) {
        Write-Ok "server/.env: present"
    } else {
        Write-Warn "server/.env: MISSING (copy from server/.env.example)"
    }
    if (Test-Path $ClientEnv) {
        Write-Ok "client/.env: present"
    } else {
        Write-Warn "client/.env: MISSING (see LOCAL_DEV.md)"
    }
}

# ─── Stop dev (never touches 3000) ──────────────────────────────
function Stop-DevAll {
    Write-Stage "Stopping dev processes (will NOT touch 3000 release)"

    $devPids = Get-DevPids
    if (-not $devPids) {
        Write-Info "no dev processes running"
        return
    }

    # Sort by PID descending so children are killed before parents.
    # Use taskkill /T to recursively kill the entire process tree on Windows.
    $sorted = $devPids | Sort-Object -Property Pid -Descending
    foreach ($p in $sorted) {
        Write-Info "killing tree PID=$($p.Pid) ($($p.Name))"
        try {
            # /T = kill tree, /F = force
            $result = & taskkill /T /F /PID $p.Pid 2>&1
            if ($LASTEXITCODE -ne 0) {
                # "not found" is fine (already dead from parent kill); warn on others
                $msg = $result -join ' '
                if ($msg -notmatch 'not found') {
                    Write-Warn "taskkill PID=$($p.Pid): $msg"
                }
            }
        } catch {
            Write-Warn "taskkill PID=$($p.Pid) failed: $_"
        }
    }

    Write-Info "waiting for $DevServerPort / $DevClientPort to release..."
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 1
        $srvStill = Test-PortListening -Port $DevServerPort
        $cliStill = Test-PortListening -Port $DevClientPort
        if (-not $srvStill -and -not $cliStill) {
            Write-Ok "ports released"
            return
        }
    }

    # Second sweep: kill any orphans that survived the first round
    Write-Warn "ports still held — running second sweep"
    $orphans = Get-DevPids
    if ($orphans) {
        foreach ($p in ($orphans | Sort-Object -Property Pid -Descending)) {
            Write-Warn "sweep: killing tree PID=$($p.Pid) ($($p.Name))"
            try {
                & taskkill /T /F /PID $p.Pid 2>&1 | Out-Null
            } catch { }
        }
        Start-Sleep -Seconds 2
    }

    # Also kill any process actually listening on 3100 / 5173 as a last resort
    foreach ($port in @($DevServerPort, $DevClientPort)) {
        if (Test-PortListening -Port $port) {
            $owner = Get-PortOwner -Port $port
            if ($owner) {
                Write-Warn "force-killing port $port occupant: PID=$($owner.Pid) ($($owner.Name))"
                try {
                    & taskkill /T /F /PID $owner.Pid 2>&1 | Out-Null
                } catch { }
            }
        }
    }

    Start-Sleep -Seconds 2
    $srvFinal = Test-PortListening -Port $DevServerPort
    $cliFinal = Test-PortListening -Port $DevClientPort
    if (-not $srvFinal -and -not $cliFinal) {
        Write-Ok "ports released after sweep"
    } else {
        Write-Warn "ports may not be fully released ($DevServerPort=$srvFinal, $DevClientPort=$cliFinal)"
    }
}

# ─── Start dev suite ────────────────────────────────────────
function Start-DevSuite {
    Write-Stage "Starting dev suite (server + client)"

    if (Test-PortListening -Port $ReleasePort) {
        $relOwner = Get-PortOwner -Port $ReleasePort
        Write-Ok "release port $ReleasePort is running (PID=$($relOwner.Pid)), we read-only"
    }

    # Port avoidance: if preferred port is busy, scan upward for the next free one
    $script:DevServerPort = Find-AvailablePort -PreferredPort $DevServerPort
    if (-not $script:DevServerPort) {
        throw "no available port found starting from 3100 (scanned 20 ports). Free up ports and retry."
    }
    if ($script:DevServerPort -ne 3100) {
        $occ = Get-PortOwner -Port 3100
        Write-Warn "port 3100 busy (PID=$($occ.Pid) Name=$($occ.Name)), using $script:DevServerPort instead"
    }

    $script:DevClientPort = Find-AvailablePort -PreferredPort $DevClientPort
    if (-not $script:DevClientPort) {
        throw "no available port found starting from 5173 (scanned 20 ports). Free up ports and retry."
    }
    if ($script:DevClientPort -ne 5173) {
        Write-Warn "port 5173 busy, using $script:DevClientPort instead"
    }

    # 1. shared (build artifacts consumed by server)
    Start-DevProcess -Name "shared" -Command "pnpm --filter @ai-novel/shared dev"
    Write-Info "waiting for shared to build..."
    Start-Sleep -Seconds 3

    # 2. server — AI_NOVEL_SERVER_PORT tells Express which port to listen on
    Start-DevProcess -Name "server" -Command "pnpm --filter @ai-novel/server dev" -ExtraEnv @{ AI_NOVEL_SERVER_PORT = "$script:DevServerPort" }
    Write-Info "waiting for server $script:DevServerPort..."
    $ok = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        if (Test-ServerHealth -Port $script:DevServerPort) { $ok = $true; break }
    }
    if (-not $ok) {
        throw "server did not become healthy in 60s on port $script:DevServerPort. Check .logs\dev-server-*\stderr.log"
    }
    Write-Ok "server healthy: http://127.0.0.1:$script:DevServerPort/api/health"

    # 3. client — AI_NOVEL_PROXY_TARGET_PORT tells Vite proxy where to forward API calls;
    #    --port tells Vite which port to listen on itself.
    Start-DevProcess -Name "client" -Command "pnpm --filter @ai-novel/client dev --port $script:DevClientPort" -ExtraEnv @{ AI_NOVEL_PROXY_TARGET_PORT = "$script:DevServerPort" }
    Write-Info "waiting for client $script:DevClientPort..."
    $ok = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        if (Test-ClientReady -Port $script:DevClientPort) { $ok = $true; break }
    }
    if (-not $ok) {
        throw "client did not become ready in 60s on port $script:DevClientPort. Check .logs\dev-client-*\stderr.log"
    }
    Write-Ok "client ready: http://127.0.0.1:$script:DevClientPort"
}

# ─── Start desktop (Electron, external mode -> dev server) ──────
function Start-Desktop {
    Write-Stage "Starting Electron desktop (external mode -> $script:DevServerPort)"

    if (-not (Test-ServerHealth -Port $script:DevServerPort)) {
        throw "server $script:DevServerPort unhealthy; cannot start desktop in external mode."
    }
    if (-not (Test-ClientReady -Port $script:DevClientPort)) {
        throw "client $script:DevClientPort not ready; desktop has no UI to load."
    }

    $env:AI_NOVEL_DESKTOP_SERVER_MODE = "external"
    $env:AI_NOVEL_SERVER_PORT = "$script:DevServerPort"
    $env:AI_NOVEL_APP_DATA_DIR = Join-Path $env:LOCALAPPDATA "AI-Novel-DevData"

    $logSession = "dev-desktop-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $logPath = Join-Path $LogsDir $logSession
    New-Item -ItemType Directory -Force -Path $logPath | Out-Null

    Write-Info "starting desktop -> npx electron . (AI_NOVEL_SERVER_PORT=$script:DevServerPort, external)"
    Write-Info "            log -> $logPath"

# Electron refuses a relative path that PowerShell hands it via -WorkingDirectory
# when the path contains non-ASCII. Wrap with cmd /c cd /d so the path is parsed
# in cmd's own codepage and the resulting cwd is delivered intact to npx.
    $desktopDir = Join-Path $ProjectRoot "desktop"
    $cmdLine = "cd /d `"$desktopDir`" && set AI_NOVEL_DESKTOP_SERVER_MODE=external&set AI_NOVEL_SERVER_PORT=$script:DevServerPort&set AI_NOVEL_APP_DATA_DIR=%LOCALAPPDATA%\AI-Novel-DevData&npx.cmd electron ."

    $proc = Start-Process `
        -FilePath "cmd.exe" `
        -ArgumentList "/c", $cmdLine `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logPath "stdout.log") `
        -RedirectStandardError  (Join-Path $logPath "stderr.log") `
        -PassThru

    Write-Ok "desktop launched: PID=$($proc.Id) (connects to $script:DevServerPort)"
}

# ─── Main flow ────────────────────────────────────────────────

if ($Status) {
    Show-Status
    exit 0
}

if ($Stop) {
    Stop-DevAll
    Show-Status
    exit 0
}

if ($Restart) {
    Stop-DevAll
    Start-Sleep -Seconds 2
}

Write-Banner "ai-novel startup (mode=$Mode)"

Write-Stage "Pre-flight checks"
if (-not (Test-Path $EnvFile)) {
    throw "server/.env MISSING. Copy from server/.env.example and fill LLM key."
}
if (-not (Test-Path $ClientEnv)) {
    throw "client/.env MISSING. See LOCAL_DEV.md."
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw "pnpm not installed"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "node not installed"
}
Write-Ok "env / pnpm / node all present"

Start-DevSuite

if ($Mode -eq "desktop") {
    Start-Desktop
}

Show-Status

Write-Host ""
Write-Ok "ai-novel started"
Write-Host "  - server:  http://127.0.0.1:$DevServerPort"  -ForegroundColor Green
Write-Host "  - client:  http://127.0.0.1:$DevClientPort"  -ForegroundColor Green
if ($Mode -eq "desktop") {
    Write-Host "  - desktop: Electron launched (connected to $DevServerPort dev server)" -ForegroundColor Green
}
Write-Host "  - logs:    $LogsDir"  -ForegroundColor DarkGray
Write-Host ""
Write-Host "Stop with: .\scripts\start-all.ps1 -Stop"  -ForegroundColor Yellow
Write-Host ""
