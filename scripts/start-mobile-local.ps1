# Local Android emulator acceptance environment. Requires the isolated API on 3301.
$ErrorActionPreference = 'Stop'
$testEnvironment = @{
  EXPO_NO_DOTENV = '1'
  EXPO_NO_TELEMETRY = '1'
  EXPO_OFFLINE = '1'
  EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3301/api'
  EXPO_PUBLIC_PLAID_ENABLED = 'false'
  EXPO_PUBLIC_ENABLE_PAYWALL = 'false'
  EXPO_PUBLIC_POSTHOG_KEY = ''
  EXPO_PUBLIC_SENTRY_DSN = ''
  SENTRY_AUTH_TOKEN = ''
}
$savedEnvironment = @{}
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  foreach ($name in $testEnvironment.Keys) {
    $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    [Environment]::SetEnvironmentVariable($name, $testEnvironment[$name], 'Process')
  }
  & corepack pnpm --filter @worthlane/mobile exec expo start --dev-client --localhost --port 8081
  if ($LASTEXITCODE -ne 0) { throw "Local Metro failed (exit $LASTEXITCODE)" }
} finally {
  foreach ($name in $savedEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
  }
  Pop-Location
}
