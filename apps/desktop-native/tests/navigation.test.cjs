"use strict";

const { EventEmitter } = require("node:events");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  loadWithRecovery,
  waitForNavigationToSettle,
} = require("../src/navigation.cjs");

test("failed application loads invoke the recovery screen", async () => {
  let receivedDescription = null;
  const loaded = await loadWithRecovery(
    async () => { throw new Error("ERR_CONNECTION_REFUSED"); },
    async (description) => { receivedDescription = description; }
  );

  assert.equal(loaded, false);
  assert.equal(receivedDescription, "ERR_CONNECTION_REFUSED");
});

test("superseded navigations do not replace the new page with recovery", async () => {
  let recoveryCalls = 0;
  const abort = Object.assign(new Error("Navigation was aborted"), { code: "ERR_ABORTED" });
  const loaded = await loadWithRecovery(
    async () => { throw abort; },
    async () => { recoveryCalls += 1; }
  );

  assert.equal(loaded, false);
  assert.equal(recoveryCalls, 0);
});

test("recovery waits until a failed navigation stops loading", async () => {
  const webContents = new EventEmitter();
  let loading = true;
  webContents.isLoading = () => loading;
  webContents.isDestroyed = () => false;

  let settled = false;
  const pending = waitForNavigationToSettle(webContents).then(() => { settled = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);

  loading = false;
  webContents.emit("did-stop-loading");
  await pending;
  assert.equal(settled, true);
});

test("destroying a window also releases a pending recovery wait", async () => {
  const webContents = new EventEmitter();
  let destroyed = false;
  webContents.isLoading = () => true;
  webContents.isDestroyed = () => destroyed;

  const pending = waitForNavigationToSettle(webContents);
  destroyed = true;
  webContents.emit("destroyed");
  await pending;
});
