import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const nativeRoot = path.resolve(scriptDirectory, "..");
const desktopRoot = path.resolve(nativeRoot, "..", "desktop");
const port = Number(process.env.WORTHLANE_DESKTOP_PORT || 3003);
const appUrl = process.env.WORTHLANE_DESKTOP_URL || `http://127.0.0.1:${port}`;
const electronExecutable = require("electron");
const nextCli = require.resolve("next/dist/bin/next", { paths: [desktopRoot] });

let webProcess = null;
let electronProcess = null;
let shuttingDown = false;

async function isReady() {
  try {
    const response = await fetch(`${appUrl}/login`, { redirect: "manual" });
    return (
      response.status >= 200 &&
      response.status < 500 &&
      response.headers.get("x-worthlane-desktop") === "1"
    );
  } catch {
    return false;
  }
}

async function waitForWorkspace() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (shuttingDown) {
      throw new Error("Worthlane desktop startup stopped before the workspace became ready.");
    }
    if (await isReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for the desktop workspace at ${appUrl}.`);
}

async function allowExistingWorkspaceToFinishStarting() {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await isReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function stop() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (electronProcess && !electronProcess.killed) electronProcess.kill();
  if (webProcess && !webProcess.killed) webProcess.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", stop);

if (!(await isReady()) && !(await allowExistingWorkspaceToFinishStarting())) {
  webProcess = spawn(
    process.execPath,
    [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd: desktopRoot, env: process.env, stdio: "inherit" }
  );
  webProcess.once("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`Worthlane desktop server exited with code ${code}.`);
      stop();
      process.exitCode = code || 1;
    }
  });
}

await waitForWorkspace();
electronProcess = spawn(electronExecutable, ["."], {
  cwd: nativeRoot,
  env: { ...process.env, WORTHLANE_DESKTOP_URL: appUrl },
  stdio: "inherit",
});
electronProcess.once("exit", (code) => {
  stop();
  process.exitCode = code || 0;
});
