"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { recoveryResponse, RECOVERY_URL } = require("../src/recovery-protocol.cjs");
test("recovery serves only its HTML and script, retaining CSP", async () => {
  const page = recoveryResponse(new Request(RECOVERY_URL + "?reason=offline"));
  assert.equal(page.status, 200);
  assert.match(await page.text(), /connect-src 'none'/);
  const script = recoveryResponse(new Request("worthlane-recovery://app/offline.js"));
  assert.match(script.headers.get("content-type"), /javascript/);
  assert.match(await script.text(), /window.location.assign/);
});
test("recovery denies other hosts, assets, methods and credentials", () => {
  for (const url of ["worthlane-recovery://other/offline.html", "worthlane-recovery://app/main.cjs", "worthlane-recovery://app/%2e%2e/main.cjs", "file:///offline.html", "worthlane-recovery://app:80/offline.html"]) {
    assert.equal(recoveryResponse({ url, method: "GET" }).status, 404);
  }
  assert.equal(recoveryResponse({ url: RECOVERY_URL, method: "POST" }).status, 404);
  assert.equal(recoveryResponse({ url: "worthlane-recovery://user@app/offline.html", method: "GET" }).status, 404);
});
