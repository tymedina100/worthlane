param(
  [string]$PostgresBin = 'C:\Program Files\PostgreSQL\17\bin',
  [int]$Port = 55439,
  [switch]$Http
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$cluster = Join-Path $repo ('.tmp\postgres-' + [guid]::NewGuid().ToString('N'))
$oldDatabaseUrl = $env:DATABASE_URL
$oldTestUrl = $env:WORTHLANE_TEST_DATABASE_URL
$started = $false
function Check-Exit([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit $LASTEXITCODE)" }
}
Push-Location $repo
try {
  if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is occupied; choose another test port"
  }
  New-Item -ItemType Directory -Path $cluster -Force | Out-Null
  & (Join-Path $PostgresBin 'initdb.exe') -D $cluster -U worthlane_test -A trust --encoding=UTF8 --locale=C
  Check-Exit 'Initialize isolated cluster'
  # A detached server must not inherit PowerShell's redirected output pipe:
  # otherwise callers that capture this script can wait forever at pg_ctl.
  $startArgs = @('-D', ('"' + $cluster + '"'), '-l', ('"' + (Join-Path $cluster 'server.log') + '"'), '-o', ('"-h 127.0.0.1 -p ' + $Port + '"'), '-w', 'start')
  $starter = Start-Process -FilePath (Join-Path $PostgresBin 'pg_ctl.exe') -ArgumentList $startArgs -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $cluster 'start.log') -RedirectStandardError (Join-Path $cluster 'start-error.log')
  $starter.WaitForExit()
  if ($starter.ExitCode -ne 0) { throw 'Start isolated cluster failed; inspect start-error.log' }
  $started = $true
  & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p $Port -U worthlane_test worthlane_beta_test
  Check-Exit 'Create test database'
  $env:WORTHLANE_TEST_DATABASE_URL = "postgresql://worthlane_test@127.0.0.1:$Port/worthlane_beta_test"
  $env:DATABASE_URL = $env:WORTHLANE_TEST_DATABASE_URL
  corepack pnpm --filter @worthlane/db db:migrate:deploy
  Check-Exit 'Apply migrations to test database'
  corepack pnpm --filter @worthlane/api exec vitest run --config vitest.integration.config.ts
  Check-Exit 'PostgreSQL integration tests'
  if ($Http) {
    node scripts/test-http.mjs
    Check-Exit 'HTTP BFF integration tests'
  }
} finally {
  if ($started) {
    & (Join-Path $PostgresBin 'pg_ctl.exe') -D $cluster -m fast -w stop
  }
  $env:DATABASE_URL = $oldDatabaseUrl
  $env:WORTHLANE_TEST_DATABASE_URL = $oldTestUrl
  Pop-Location
  Write-Host "Isolated cluster retained for diagnosis: $cluster"
}

