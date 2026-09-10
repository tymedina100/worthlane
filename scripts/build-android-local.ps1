param([string]$SdkPath = (Join-Path (Split-Path $PSScriptRoot -Parent) '.tmp/android-sdk'))
$ErrorActionPreference = 'Stop'
$SdkPath = [IO.Path]::GetFullPath($SdkPath)
$repoPath = Split-Path $PSScriptRoot -Parent
$nativeBuildRoot = Join-Path $repoPath '.tmp/android-cxx'
$initScript = Join-Path $PSScriptRoot 'android-local.init.gradle'
if (-not (Test-Path -LiteralPath (Join-Path $SdkPath 'platforms/android-36/android.jar'))) {
  throw 'Android SDK 36 is missing. Complete the authorized SDK setup first.'
}
$oldAndroidHome = $env:ANDROID_HOME
$oldAndroidRoot = $env:ANDROID_SDK_ROOT
$oldSentryUpload = $env:SENTRY_DISABLE_AUTO_UPLOAD
$oldSentryToken = $env:SENTRY_AUTH_TOKEN
Push-Location (Join-Path (Split-Path $PSScriptRoot -Parent) 'apps/mobile/android')
try {
  $env:ANDROID_HOME = [IO.Path]::GetFullPath($SdkPath)
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
  $env:SENTRY_DISABLE_AUTO_UPLOAD = 'true'
  $env:SENTRY_AUTH_TOKEN = ''
  & .\gradlew.bat :app:assembleDebug --no-daemon --init-script $initScript "-PworthlaneNativeBuildRoot=$nativeBuildRoot"
  if ($LASTEXITCODE -ne 0) { throw "Android debug build failed (exit $LASTEXITCODE)" }
} finally {
  $env:ANDROID_HOME = $oldAndroidHome
  $env:ANDROID_SDK_ROOT = $oldAndroidRoot
  $env:SENTRY_DISABLE_AUTO_UPLOAD = $oldSentryUpload
  $env:SENTRY_AUTH_TOKEN = $oldSentryToken
  Pop-Location
}
