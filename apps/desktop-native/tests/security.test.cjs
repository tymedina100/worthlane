"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isAllowedConnectionPageNavigation,
  isAllowedNavigation,
  isSafeExternalUrl,
  parseConfiguredUrl,
  parsePackagedConfiguration,
} = require("../src/security.cjs");

test("production configuration accepts one HTTPS origin", () => {
  const configured = parseConfiguredUrl("https://app.worthlane.app/");
  assert.equal(configured.origin, "https://app.worthlane.app");
  assert.equal(configured.href, "https://app.worthlane.app/");
});

test("production configuration rejects insecure or decorated URLs", () => {
  assert.throws(() => parseConfiguredUrl("http://app.worthlane.app"), /HTTPS/);
  assert.throws(() => parseConfiguredUrl("https://user:secret@app.worthlane.app"), /credentials/);
  assert.throws(() => parseConfiguredUrl("https://app.worthlane.app?token=secret"), /query string/);
  assert.throws(() => parseConfiguredUrl("https://app.worthlane.app/desktop"), /without a path/);
  assert.throws(() => parseConfiguredUrl("not a url"), /absolute URL/);
});

test("development allows loopback HTTP but not arbitrary insecure hosts", () => {
  assert.equal(
    parseConfiguredUrl("http://127.0.0.1:3003", { allowLocal: true }).origin,
    "http://127.0.0.1:3003"
  );
  assert.throws(
    () => parseConfiguredUrl("http://example.test:3003", { allowLocal: true }),
    /HTTPS/
  );
});

test("only explicitly development-marked packages may use loopback HTTP", () => {
  assert.throws(
    () => parsePackagedConfiguration({ appUrl: "http://127.0.0.1:3003" }),
    /HTTPS/
  );
  assert.equal(
    parsePackagedConfiguration({
      appUrl: "http://127.0.0.1:3003",
      developmentOnly: true,
    }).origin,
    "http://127.0.0.1:3003"
  );
  assert.throws(
    () => parsePackagedConfiguration({
      appUrl: "http://example.test:3003",
      developmentOnly: true,
    }),
    /HTTPS/
  );
});

test("navigation is pinned to the exact configured origin", () => {
  const origin = "https://app.worthlane.app";
  assert.equal(isAllowedNavigation(`${origin}/dashboard`, origin), true);
  assert.equal(isAllowedNavigation("https://app.worthlane.app.evil.test/dashboard", origin), false);
  assert.equal(isAllowedNavigation("http://app.worthlane.app/dashboard", origin), false);
  assert.equal(isAllowedNavigation("file:///tmp/index.html", origin), false);
});

test("the local recovery exception is pinned to one packaged file", () => {
  const recoveryUrl = "file:///C:/Worthlane/resources/app.asar/src/offline.html";
  assert.equal(
    isAllowedConnectionPageNavigation(`${recoveryUrl}?reason=offline`, recoveryUrl),
    true
  );
  assert.equal(
    isAllowedConnectionPageNavigation("file:///C:/Worthlane/other.html", recoveryUrl),
    false
  );
  assert.equal(
    isAllowedConnectionPageNavigation("https://app.worthlane.app/offline.html", recoveryUrl),
    false
  );
});

test("only public Worthlane legal and support links may open externally", () => {
  assert.equal(isSafeExternalUrl("https://worthlane.app/support"), true);
  assert.equal(isSafeExternalUrl("https://www.worthlane.app/privacy/"), true);
  assert.equal(isSafeExternalUrl("https://worthlane.app/login"), false);
  assert.equal(isSafeExternalUrl("https://support.worthlane.app"), false);
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
});
