# Laptop storage cleanup — September 21

Under the user's existing storage-cleanup request, removed only the downloadable
NDK package `ndk;27.1.12297006` from this repository's temporary Android SDK using
its official package manager. No native compiler/build process was running.
The package occupied approximately 2.4 GiB. Current EAS build artifacts and
Android emulator execution do not require this local compiler.

Android emulator had already been cleanly shut down after acceptance checks.
Filesystem available space increased from 5.6 GiB before shutdown/cleanup to
9.3 GiB afterward; the entire difference is not attributed solely to the NDK.
Preserved both AVD data directories, current and prior APK/IPA archives, signing
material, screenshots, source, user files and Trash.

A future local Android native build needs the NDK reinstalled. Restore with:

```sh
cd /Users/tylermedina/worthlane-beta-work
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home \
  .tmp/android-sdk/cmdline-tools/latest/bin/sdkmanager \
  --sdk_root=/Users/tylermedina/worthlane-beta-work/.tmp/android-sdk \
  'ndk;27.1.12297006'
```

Uninstall exited successfully; absence of that exact NDK directory was checked.
No repository dependency/configuration changed.
