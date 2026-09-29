import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const mobile = createRequire(new URL("../apps/mobile/package.json", import.meta.url));
const expoMetro = createRequire(mobile.resolve("@expo/metro/package.json"));
const nativeCli = createRequire(mobile.resolve("@react-native/community-cli-plugin/package.json"));
const nativeMetroConfig = createRequire(nativeCli.resolve("@react-native/metro-config/package.json"));
// Exercise every Metro version reachable from the Expo and native build tools.
const nativeConfigMetro = createRequire(nativeMetroConfig.resolve("metro-config/package.json"));
const assetsPaths = [...new Set([expoMetro, nativeCli, nativeConfigMetro].map(
  (caller) => join(dirname(caller.resolve("metro/package.json")), "src/Assets.js"),
))];

for (const assetsPath of assetsPaths) {
  const { getAssetSize, getAssetData } = mobile(assetsPath);
  const metroVersion = mobile(join(dirname(assetsPath), "../package.json")).version;

  function box(name, declaredSize = 8, payload = Buffer.alloc(0)) {
    const header = Buffer.alloc(8);
    header.writeUInt32BE(declaredSize);
    header.write(name, 4, 4);
    return Buffer.concat([header, payload]);
  }

  test(`Metro ${metroVersion} still reads real PNG, AVIF and valid ICNS dimensions`, async () => {
    const png = readFileSync(new URL("../apps/web/app/icon.png", import.meta.url));
    const size = getAssetSize("png", png, "icon.png");
    assert.ok(size.width > 0 && size.height > 0);
    const icon = Buffer.alloc(16);
    icon.write("icns"); icon.writeUInt32BE(16, 4);
    icon.write("ic07", 8); icon.writeUInt32BE(8, 12);
    assert.deepEqual(getAssetSize("png", icon, "sniffed.png"), { width: 128, height: 128 });
    const api = createRequire(new URL("../apps/api/package.json", import.meta.url));
    const sharp = api("next/dist/server/image-optimizer").getSharp(1);
    const avif = await sharp({ create: { width: 16, height: 12, channels: 3, background: "#24473c" } }).avif().toBuffer();
    assert.deepEqual(getAssetSize("png", avif, "sniffed-avif.png"), { width: 16, height: 12 });
  });

  test(`Metro ${metroVersion} builds file-backed asset metadata`, async () => {
    const file = fileURLToPath(new URL("../apps/web/app/icon.png", import.meta.url));
    const asset = await getAssetData(file, "icon.png", [], "ios", "/assets");
    assert.equal(asset.width, 192);
    assert.equal(asset.height, 192);
    assert.deepEqual(asset.scales, [1]);
    assert.deepEqual(asset.files, [file]);
    assert.equal(typeof asset.hash, "string");
  });

  test(`Metro ${metroVersion} rejects malformed image buffers without hanging, regardless of filename`, () => {
    const icns = Buffer.alloc(24);
    icns.write("icns"); icns.writeUInt32BE(24, 4); icns.write("ic07", 8);
    const jxl = Buffer.concat([box("JXL ", 12, Buffer.from([13, 10, 135, 10])), box("ftyp", 12, Buffer.from("jxl ")), box("jxlp", 0)]);
    const heif = Buffer.concat([box("ftyp", 12, Buffer.from("heic")), box("free", 0)]);
    for (const input of [icns, jxl, heif]) {
      const result = spawnSync(process.execPath, ["-e", `
        const assert = require('node:assert/strict');
        const { getAssetSize } = require(${JSON.stringify(assetsPath)});
        assert.throws(() => getAssetSize('png', Buffer.from('${input.toString("base64")}', 'base64'), 'untrusted.png'));
      `], { timeout: 5000, encoding: "utf8" });
      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.status, 0, result.stderr);
    }
  });

}
