"use strict";

function describeLoadError(error) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "The Worthlane service could not be reached.";
}

function isExpectedNavigationAbort(error) {
  return Boolean(
    error &&
    (error.code === "ERR_ABORTED" || error.code === -3 || error.errno === -3)
  );
}

async function loadWithRecovery(load, recover, { timeoutMs = 15000, stop = () => {} } = {}) {
  let timer;
  try {
    await Promise.race([
      Promise.resolve().then(load),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Worthlane took too long to connect. Please try again."));
          stop();
        }, timeoutMs);
      }),
    ]);
    return true;
  } catch (error) {
    clearTimeout(timer);
    if (!isExpectedNavigationAbort(error)) {
      await recover(describeLoadError(error));
    }
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function waitForNavigationToSettle(webContents) {
  if (webContents.isDestroyed() || !webContents.isLoading()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      webContents.removeListener("did-stop-loading", finish);
      webContents.removeListener("destroyed", finish);
      resolve();
    };

    webContents.once("did-stop-loading", finish);
    webContents.once("destroyed", finish);

    // Close the tiny check/listen race if loading stopped synchronously.
    if (webContents.isDestroyed() || !webContents.isLoading()) finish();
  });
}

module.exports = {
  describeLoadError,
  isExpectedNavigationAbort,
  loadWithRecovery,
  waitForNavigationToSettle,
};
