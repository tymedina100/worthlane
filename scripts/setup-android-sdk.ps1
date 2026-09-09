param([switch]$AcceptLicense)
$ErrorActionPreference = 'Stop'
if (-not $AcceptLicense) {
  throw 'Review and authorize https://developer.android.com/studio#terms-and-conditions before using -AcceptLicense.'
}
$repoPath = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$sdkPath = Join-Path $repoPath '.tmp/android-sdk'
$archivePath = Join-Path $repoPath '.tmp/android-commandlinetools-15859902.zip'
$downloadUrl = 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip'
$expectedHash = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
New-Item -ItemType Directory -Path $sdkPath -Force | Out-Null
if (-not (Test-Path -LiteralPath $archivePath)) {
  Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
}
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
  throw 'Android command-line tools checksum mismatch. Nothing will be installed.'
}
$manager = Join-Path $sdkPath 'cmdline-tools/latest/bin/sdkmanager.bat'
if (-not (Test-Path -LiteralPath $manager)) {
  $extractPath = Join-Path $repoPath ('.tmp/android-tools-' + [guid]::NewGuid().ToString('N'))
  Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath
  $sourcePath = [IO.Path]::GetFullPath((Join-Path $extractPath 'cmdline-tools'))
  $targetPath = [IO.Path]::GetFullPath((Join-Path $sdkPath 'cmdline-tools/latest'))
  $workspacePrefix = $repoPath + [IO.Path]::DirectorySeparatorChar
  if (-not $sourcePath.StartsWith($workspacePrefix) -or -not $targetPath.StartsWith($workspacePrefix) -or (Test-Path -LiteralPath $targetPath)) {
    throw 'Unexpected Android tool extraction paths; refusing to move files.'
  }
  New-Item -ItemType Directory -Path (Split-Path $targetPath -Parent) -Force | Out-Null
  Move-Item -LiteralPath $sourcePath -Destination $targetPath
}
# Accept only prompts from installing the requested build packages, not every
# unrelated/preview license exposed by sdkmanager --licenses.
$installLog = Join-Path $repoPath '.tmp/android-sdk-install.log'
1..30 | ForEach-Object { 'y' } | & $manager "--sdk_root=$sdkPath" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1' *> $installLog
if ($LASTEXITCODE -ne 0) { throw "Android SDK install failed; inspect $installLog" }
Write-Host "Android build tools installed at $sdkPath. No machine-wide environment variables changed."
