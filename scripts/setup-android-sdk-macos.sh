#!/bin/bash
# Local-only Apple Silicon SDK setup; mirrors setup-android-sdk.ps1.
set -euo pipefail
if [[ "${1:-}" != "--accept-license" ]]; then
  echo 'Review and authorize https://developer.android.com/studio#terms-and-conditions, then pass --accept-license.' >&2
  exit 1
fi
[[ "$(uname -s)" == Darwin && "$(uname -m)" == arm64 ]] || { echo 'This setup targets Apple Silicon macOS.' >&2; exit 1; }
repo_path="$(cd "$(dirname "$0")/.." && pwd)"
sdk_path="$repo_path/.tmp/android-sdk"
archive_path="$repo_path/.tmp/android-tools-mac.zip"
expected_hash=835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e
mkdir -p "$sdk_path/cmdline-tools"
if [[ ! -f "$archive_path" ]]; then
  curl -fL --retry 2 https://dl.google.com/android/repository/commandlinetools-mac_arm64-15859902_latest.zip -o "$archive_path"
fi
actual_hash="$(shasum -a 256 "$archive_path" | cut -d ' ' -f 1)"
[[ "$actual_hash" == "$expected_hash" ]] || { echo 'SDK archive checksum mismatch; refusing installation.' >&2; exit 1; }
manager="$sdk_path/cmdline-tools/latest/bin/sdkmanager"
if [[ ! -f "$manager" ]]; then
  extract_path="$(mktemp -d "$repo_path/.tmp/android-tools-extract.XXXXXX")"
  unzip -q "$archive_path" -d "$extract_path"
  mv "$extract_path/cmdline-tools" "$sdk_path/cmdline-tools/latest"
  rmdir "$extract_path"
fi
# Only answer license prompts for these requested stable build packages.
# Capture answers in a file to avoid an early pipe close masking installer status.
answers_path="$(mktemp "$repo_path/.tmp/android-license-answers.XXXXXX")"
trap 'rm -f "$answers_path"' EXIT
for ((i=0; i<30; i++)); do echo y; done > "$answers_path"
"$manager" "--sdk_root=$sdk_path" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1' < "$answers_path" > "$repo_path/.tmp/android-sdk-macos-install.log" 2>&1
printf 'Android build tools installed at %s. No machine-wide environment changes.\n' "$sdk_path"
