"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { isBankWindowEntry, isBankWindowNavigation, attachBankWindows } = require("../src/bank-window.cjs");

function windowDouble() {
  const win = new EventEmitter();
  win.webContents = new EventEmitter();
  win.webContents.session = new EventEmitter();
  win.webContents.setWindowOpenHandler = fn => { win.open = fn; };
  win.webContents.getURL = () => "https://bank.example/authorize?private=never-in-title";
  win.setMenu = menu => { win.menu = menu; };
  win.setTitle = title => { win.title = title; };
  win.destroyed = false;
  win.isDestroyed = () => win.destroyed;
  win.destroy = () => { win.destroyed = true; win.emit("closed"); };
  return win;
}
const entry = "https://cdn.plaid.com/link/v2/stable/sandbox-oauth-login.html?state=synthetic";

test("only exact Plaid OAuth entry pages can open a bank window", () => {
  assert.equal(isBankWindowEntry(entry), true);
  assert.equal(isBankWindowEntry("https://cdn.plaid.com/link/v2/stable/oauth.html"), true);
  for (const url of ["https://bank.example/login", "about:blank", "https://cdn.plaid.com.evil.test/link/v2/stable/oauth.html", "https://user:secret@cdn.plaid.com/link/v2/stable/oauth.html", "http://cdn.plaid.com/link/v2/stable/oauth.html", "https://cdn.plaid.com/link/v2/stable/link.html", "https://cdn.plaid.com:8443/link/v2/stable/oauth.html", "file:///tmp/oauth.html", "javascript:alert(1)"]) {
    assert.equal(isBankWindowEntry(url), false, url);
  }
});
test("bank redirects allow HTTPS without permitting local files or app protocols", () => {
  assert.equal(isBankWindowNavigation("https://bank.example/login"), true);
  for (const url of ["http://bank.example", "file:///etc/passwd", "javascript:alert(1)", "data:text/html,test", "worthlane://login", "https://user:secret@bank.example", "bad-url"]) assert.equal(isBankWindowNavigation(url), false, url);
});
test("popup policy enforces isolation, one bank window and lifecycle cleanup", () => {
  const parent = windowDouble(), child = windowDouble(), external = [];
  attachBankWindows(parent, { isSafeExternalUrl: url => url === "https://worthlane.app/support", openExternal: url => external.push(url) });
  const result = parent.open({ url: entry });
  assert.equal(result.action, "allow");
  assert.equal(result.outlivesOpener, false);
  assert.equal(result.overrideBrowserWindowOptions.frame, true);
  assert.equal(result.overrideBrowserWindowOptions.fullscreenable, false);
  assert.deepEqual(result.overrideBrowserWindowOptions.webPreferences, {
    session: parent.webContents.session,
    nodeIntegration: false, nodeIntegrationInSubFrames: false, contextIsolation: true,
    sandbox: true, webSecurity: true, allowRunningInsecureContent: false,
    webviewTag: false, devTools: false, navigateOnDragDrop: false,
  });
  parent.webContents.emit("did-create-window", child);
  assert.equal(parent.open({ url: entry }).action, "deny");
  assert.equal(child.open({ url: entry }).action, "deny");
  assert.equal(child.menu, null);
  for (const eventName of ["will-navigate", "will-redirect"]) {
    let blocked = false;
    child.webContents.emit(eventName, { preventDefault: () => { blocked = true; } }, "file:///tmp/untrusted.html");
    assert.equal(blocked, true);
  }
  let downloadBlocked = false;
  child.webContents.session.emit("will-download", { preventDefault: () => { downloadBlocked = true; } }, {}, child.webContents);
  assert.equal(downloadBlocked, true);
  child.webContents.emit("page-title-updated", { preventDefault() {} });
  assert.equal(child.title, "Bank sign-in — bank.example");
  parent.webContents.emit("did-navigate-in-page", {}, "https://app.example/login", false);
  assert.equal(child.destroyed, false);
  parent.webContents.emit("did-navigate-in-page", {}, "https://app.example/login", true);
  assert.equal(child.destroyed, true);
  assert.equal(child.webContents.session.listenerCount("will-download"), 0);
  assert.equal(parent.open({ url: entry }).action, "allow");
  assert.equal(parent.open({ url: "https://worthlane.app/support" }).action, "deny");
  assert.deepEqual(external, ["https://worthlane.app/support"]);
  assert.equal(parent.open({ url: "https://evil.test" }).action, "deny");
});
test("full navigation and parent close destroy pending bank windows", () => {
  for (const event of ["navigation", "close"]) {
    const parent = windowDouble(), child = windowDouble();
    attachBankWindows(parent, { isSafeExternalUrl: () => false, openExternal() {} });
    parent.webContents.emit("did-create-window", child);
    if (event === "navigation") parent.webContents.emit("did-navigate"); else parent.destroy();
    assert.equal(child.destroyed, true);
  }
});
