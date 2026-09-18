"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  app,
  BrowserWindow,
  Menu,
  protocol,
  dialog,
  screen,
  session,
  shell,
} = require("electron");
const {
  isAllowedConnectionPageNavigation,
  isAllowedNavigation,
  isSafeExternalUrl,
  parseConfiguredUrl,
  parsePackagedConfiguration,
} = require("./security.cjs");
const {
  loadWithRecovery,
  waitForNavigationToSettle,
} = require("./navigation.cjs");

const { attachBankWindows } = require("./bank-window.cjs");

// The tested macOS compositor can leave a loaded page blank after Refresh
// until the window is resized. Software rendering passed the same packaged
// dashboard/accounts refresh checks. Keep Windows on its existing renderer.
// Electron requires this setting before app readiness.
if (process.platform === "darwin") app.disableHardwareAcceleration();

const WINDOW_MIN_WIDTH = 900;
const WINDOW_MIN_HEIGHT = 640;
const DEFAULT_BOUNDS = Object.freeze({ width: 1440, height: 920 });
const APP_PARTITION = "persist:worthlane";
const { RECOVERY_SCHEME, RECOVERY_URL: CONNECTION_PAGE_URL, recoveryResponse } = require("./recovery-protocol.cjs");
protocol.registerSchemesAsPrivileged([{ scheme: RECOVERY_SCHEME, privileges: { standard: true, secure: true } }]);

let mainWindow = null;
let configuredApp = null;
let showingConnectionPage = false;

function resolveConfiguration() {
  if (!app.isPackaged) {
    return parseConfiguredUrl(
      process.env.WORTHLANE_DESKTOP_URL || "http://127.0.0.1:3003",
      { allowLocal: true }
    );
  }
  // Keep the pinned origin inside app.asar so ASAR integrity validation also
  // protects the configuration from post-package edits.
  const configPath = path.join(app.getAppPath(), "generated", "app-config.json");
  const payload = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return parsePackagedConfiguration(payload);
}

function windowStatePath() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function intersectsWorkArea(bounds) {
  return screen.getAllDisplays().some(({ workArea }) => {
    const horizontal = Math.min(bounds.x + bounds.width, workArea.x + workArea.width) - Math.max(bounds.x, workArea.x);
    const vertical = Math.min(bounds.y + bounds.height, workArea.y + workArea.height) - Math.max(bounds.y, workArea.y);
    return horizontal >= 160 && vertical >= 120;
  });
}

function loadWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(windowStatePath(), "utf8"));
    const candidate = {
      x: Number(state.x),
      y: Number(state.y),
      width: Math.max(WINDOW_MIN_WIDTH, Number(state.width)),
      height: Math.max(WINDOW_MIN_HEIGHT, Number(state.height)),
    };
    if (Object.values(candidate).every(Number.isFinite) && intersectsWorkArea(candidate)) {
      return { bounds: candidate, maximized: Boolean(state.maximized) };
    }
  } catch {
    // A first launch or stale state uses centered defaults.
  }
  return { bounds: DEFAULT_BOUNDS, maximized: false };
}

function saveWindowState(window) {
  try {
    fs.writeFileSync(
      windowStatePath(),
      JSON.stringify({ ...window.getNormalBounds(), maximized: window.isMaximized() }, null, 2),
      "utf8"
    );
  } catch (error) {
    console.warn("Could not persist Worthlane window state:", error);
  }
}

function navigate(route) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  try {
    const current = new URL(mainWindow.webContents.getURL());
    if (current.origin === configuredApp.origin && current.pathname === "/demo") {
      const demoTargets = new Map([
        ["/dashboard", "/demo#overview"],
        ["/dashboard/plan", "/demo#responsibilities"],
        ["/dashboard/accounts", "/demo#accounts"],
        ["/dashboard/goals", "/demo#goals"],
      ]);
      const demoTarget = demoTargets.get(route);
      if (demoTarget) {
        void loadApplicationUrl(new URL(demoTarget, configuredApp.origin).toString());
        return;
      }
      if (route === "/dashboard/reports") {
        void dialog.showMessageBox(mainWindow, {
          type: "info",
          title: "Reports are available after sign in",
          message: "The public demo focuses on the household overview.",
          detail: "Sign in to use the complete reports workspace.",
          buttons: ["OK"],
        });
        return;
      }
    }
  } catch {
    // Fall through to the requested signed-in workspace route.
  }

  void loadApplicationUrl(new URL(route, configuredApp.origin).toString());
}

function refreshApplication() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const currentUrl = mainWindow.webContents.getURL();
  // Use the same bounded load/recovery path as startup. The native reload role
  // bypasses that path, including its timeout and retry screen.
  const target = isAllowedNavigation(currentUrl, configuredApp.origin)
    ? currentUrl : configuredApp.href;
  void loadApplicationUrl(target);
}

function buildApplicationMenu() {
  const navigationItems = [
    ["Overview", "/dashboard"],
    ["Monthly plan", "/dashboard/plan"],
    ["Accounts & privacy", "/dashboard/accounts"],
    ["Shared goals", "/dashboard/goals"],
    ["Reports", "/dashboard/reports"],
  ].map(([label, route]) => ({
    label,
    click: () => navigate(route),
  }));

  return Menu.buildFromTemplate([
    ...(process.platform === "darwin" ? [{ role: "appMenu", submenu: [
      { role: "about", label: "About Worthlane" },
      { type: "separator" },
      { role: "services" },
      { type: "separator" },
      { role: "hide", label: "Hide Worthlane" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit", label: "Quit Worthlane" },
    ] }] : []),
    {
      label: "File",
      submenu: [
        { label: "Open overview", click: () => navigate("/dashboard") },
        { type: "separator" },
        ...(process.platform === "darwin" ? [{ role: "close" }] : [{ role: "quit", label: "Exit Worthlane" }]),
      ],
    },
    { role: "editMenu" },
    { label: "Navigate", submenu: navigationItems },
    {
      label: "View",
      submenu: [
        { label: "Refresh", accelerator: "CmdOrCtrl+R", click: refreshApplication },
        { type: "separator" },
        { role: "resetZoom", label: "Actual size" },
        { role: "zoomIn", label: "Zoom in" },
        { role: "zoomOut", label: "Zoom out" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Full screen" },
      ],
    },
    { label: "Window", submenu: [{ role: "minimize" }, { role: "close" }] },
    {
      label: "Help",
      submenu: [
        { label: "Worthlane support", click: () => void shell.openExternal("https://worthlane.app/support") },
        { label: "Privacy policy", click: () => void shell.openExternal("https://worthlane.app/privacy") },
      ],
    },
  ]);
}

async function showConnectionPage(errorDescription) {
  const window = mainWindow;
  if (!window || window.isDestroyed() || showingConnectionPage) return;
  showingConnectionPage = true;

  try {
    // Electron can emit did-fail-load before the failed navigation has fully
    // stopped. Starting the local fallback during that gap can supersede it
    // and leave a blank renderer, so wait for the lifecycle to settle first.
    await waitForNavigationToSettle(window.webContents);
    if (window.isDestroyed() || mainWindow !== window) {
      showingConnectionPage = false;
      return;
    }

    const recoveryUrl = new URL(CONNECTION_PAGE_URL);
    recoveryUrl.search = new URLSearchParams({
      retry: configuredApp.href,
      target: new URL(configuredApp.href).host,
      reason: errorDescription || "The Worthlane service could not be reached.",
    }).toString();
    await window.loadURL(recoveryUrl.toString());
    if (!window.isDestroyed()) window.show();
  } catch (error) {
    showingConnectionPage = false;
    console.error("Could not show Worthlane connection page:", error);
    if (window.isDestroyed() || mainWindow !== window) return;

    const result = await dialog.showMessageBox(window, {
      type: "error",
      title: "Worthlane cannot connect",
      message: "The planning workspace could not be reached.",
      detail: "Check your connection, then try again. No financial data was changed.",
      buttons: ["Try again", "Exit"],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) void loadApplicationUrl(configuredApp.href);
    else app.quit();
  }
}

async function loadApplicationUrl(targetUrl) {
  const window = mainWindow;
  if (!window || window.isDestroyed()) return false;
  showingConnectionPage = false;
  return loadWithRecovery(
    () => window.loadURL(targetUrl),
    (description) => showConnectionPage(description),
    { stop: () => { if (!window.isDestroyed()) window.webContents.stop(); } }
  );
}

function attachSecurityPolicy(window) {
  const { webContents } = window;
  webContents.on("will-navigate", (event, targetUrl) => {
    if (isAllowedNavigation(targetUrl, configuredApp.origin)) {
      if (showingConnectionPage) {
        event.preventDefault();
        void loadApplicationUrl(targetUrl);
      }
      return;
    }
    if (
      showingConnectionPage &&
      isAllowedConnectionPageNavigation(targetUrl, CONNECTION_PAGE_URL)
    ) return;
    event.preventDefault();
    if (isSafeExternalUrl(targetUrl)) void shell.openExternal(targetUrl);
  });
  attachBankWindows(window, { isSafeExternalUrl, openExternal: url => shell.openExternal(url) });
  webContents.on("will-attach-webview", (event) => event.preventDefault());
  webContents.on("before-input-event", (event, input) => {
    const key = input.key.toLowerCase();
    const developerShortcut = key === "f12" || (input.control && input.shift && ["c", "i", "j"].includes(key));
    if (app.isPackaged && developerShortcut) event.preventDefault();
  });
  const handleLoadFailure = (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && !url.startsWith(`${RECOVERY_SCHEME}:`)) {
      void showConnectionPage(description);
    }
  };
  webContents.on("did-fail-load", handleLoadFailure);
  webContents.on("did-fail-provisional-load", handleLoadFailure);
  // Chromium also finishes its error document at the failed application URL.
  // Do not clear recovery state there: the load promise can reject afterward,
  // otherwise starting a second fallback and aborting the first one.

}

function createMainWindow() {
  const saved = loadWindowState();
  const icon = app.isPackaged
    ? path.join(process.resourcesPath, "branding", "worthlane.png")
    : path.join(__dirname, "..", "..", "web", "app", "icon.png");
  const appSession = session.fromPartition(APP_PARTITION);
  if (!appSession.protocol.isProtocolHandled(RECOVERY_SCHEME)) {
    appSession.protocol.handle(RECOVERY_SCHEME, recoveryResponse);
  }
  appSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  appSession.setPermissionCheckHandler(() => false);
  appSession.setDevicePermissionHandler(() => false);

  const window = new BrowserWindow({
    ...saved.bounds,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    show: false,
    title: "Worthlane",
    icon,
    backgroundColor: "#f4f6f1",
    autoHideMenuBar: false,
    webPreferences: {
      partition: APP_PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged,
      spellcheck: true,
    },
  });
  mainWindow = window;

  attachSecurityPolicy(window);
  window.once("ready-to-show", () => {
    if (saved.maximized) window.maximize();
    window.show();
  });
  window.on("close", () => saveWindowState(window));
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });
  window.webContents.on("render-process-gone", async (_event, details) => {
    if (details.reason === "clean-exit") return;
    const result = await dialog.showMessageBox(window, {
      type: "error",
      title: "Worthlane needs to restart this window",
      message: "The planning workspace stopped unexpectedly.",
      detail: "Your data is safe. Reopen the window to reconnect.",
      buttons: ["Reopen", "Exit"],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) {
      if (!window.isDestroyed()) window.destroy();
      if (mainWindow === window) mainWindow = null;
      createMainWindow();
    } else app.quit();
  });

  Menu.setApplicationMenu(buildApplicationMenu());
  void loadApplicationUrl(configuredApp.href);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) { if (app.isReady() && configuredApp) createMainWindow(); return; }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(() => {
    app.setAppUserModelId("com.worthlane.desktop");
    configuredApp = resolveConfiguration();
    createMainWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  }).catch((error) => {
    dialog.showErrorBox(
      "Worthlane could not start",
      error instanceof Error ? error.message : "The desktop configuration is invalid."
    );
    app.quit();
  });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
