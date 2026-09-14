"use strict";

const path = require("node:path");
const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");

module.exports = async function hardenPackagedApplication(context) {
  if (!["win32", "darwin"].includes(context.electronPlatformName)) return;
  const executablePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.${context.electronPlatformName === "darwin" ? "app" : "exe"}`);
  await flipFuses(executablePath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    // The stock Windows Electron bundle ships v8_context_snapshot.bin, not the
    // optional browser_v8_context_snapshot.bin required when this fuse is on.
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });
};
