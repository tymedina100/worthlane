"use strict";
const fs = require("node:fs");
const path = require("node:path");
const RECOVERY_SCHEME = "worthlane-recovery";
const RECOVERY_URL = `${RECOVERY_SCHEME}://app/offline.html`;
function recoveryResponse(request) {
  const url = new URL(request.url);
  const assets = { "/offline.html": ["offline.html", "text/html; charset=utf-8"], "/offline.js": ["offline.js", "text/javascript; charset=utf-8"] };
  const asset = Object.hasOwn(assets, url.pathname) ? assets[url.pathname] : null;
  if (request.method !== "GET" || url.protocol !== `${RECOVERY_SCHEME}:` || url.host !== "app" || url.username || url.password || !asset) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(fs.readFileSync(path.join(__dirname, asset[0])), {
    headers: { "Content-Type": asset[1], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
module.exports = { RECOVERY_SCHEME, RECOVERY_URL, recoveryResponse };
