"use strict";

// Plaid owns these entry pages. Arbitrary bank URLs cannot create a window;
// redirects inside an already opened bank flow may visit HTTPS bank origins.
const ENTRY_PATHS = new Set([
  "/link/v2/stable/oauth.html",
  "/link/v2/stable/sandbox-oauth-login.html",
]);
function isBankWindowEntry(value) {
  try {
    const url = new URL(value);
    return url.origin === "https://cdn.plaid.com" && !url.username && !url.password && ENTRY_PATHS.has(url.pathname);
  } catch { return false; }
}
function isBankWindowNavigation(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

function attachBankWindows(parent, { isSafeExternalUrl, openExternal }) {
  const children = new Set();
  const closeChildren = () => {
    for (const child of children) if (!child.isDestroyed()) child.destroy();
    children.clear();
  };
  parent.webContents.setWindowOpenHandler(({ url }) => {
    if (!parent.isDestroyed() && children.size === 0 && isBankWindowEntry(url)) {
      return {
        action: "allow",
        outlivesOpener: false,
        overrideBrowserWindowOptions: {
          parent, width: 600, height: 800, minWidth: 420, minHeight: 500,
          frame: true, show: true, fullscreen: false, fullscreenable: false,
          autoHideMenuBar: true, title: "Bank sign-in — cdn.plaid.com",
          webPreferences: {
            session: parent.webContents.session,
            nodeIntegration: false, nodeIntegrationInSubFrames: false,
            contextIsolation: true, sandbox: true, webSecurity: true,
            allowRunningInsecureContent: false, webviewTag: false,
            devTools: false, navigateOnDragDrop: false,
          },
        },
      };
    }
    if (isSafeExternalUrl(url)) void openExternal(url);
    return { action: "deny" };
  });
  parent.webContents.on("did-create-window", child => {
    children.add(child);
    child.setMenu(null);
    const content = child.webContents;
    const guard = (event, url) => {
      if (!isBankWindowNavigation(url)) event.preventDefault();
    };
    content.on("will-navigate", guard);
    content.on("will-redirect", guard);
    content.on("will-attach-webview", event => event.preventDefault());
    content.setWindowOpenHandler(() => ({ action: "deny" }));
    const updateTitle = () => {
      try { child.setTitle(`Bank sign-in — ${new URL(content.getURL()).host}`); } catch {}
    };
    content.on("page-title-updated", event => { event.preventDefault(); updateTitle(); });
    content.on("did-navigate", updateTitle);
    const denyDownload = (event, _item, origin) => { if (origin === content) event.preventDefault(); };
    const bankSession = content.session;
    bankSession.on("will-download", denyDownload);
    child.on("closed", () => {
      children.delete(child);
      bankSession.removeListener("will-download", denyDownload);
    });
  });
  // Signing out, switching workspace pages, or closing the parent must not
  // leave a bank window belonging to a previous Worthlane session behind.
  parent.webContents.on("did-navigate", closeChildren);
  parent.webContents.on("did-navigate-in-page", (_event, _url, isMainFrame) => {
    if (isMainFrame) closeChildren();
  });
  parent.on("closed", closeChildren);
}
module.exports = { isBankWindowEntry, isBankWindowNavigation, attachBankWindows };
