import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

// Exercise Next's real adapter against the patched native image dependency.
// A successful install alone cannot establish ABI or encoder compatibility.
for (const workspace of ["api", "desktop", "web"]) {
  const require = createRequire(new URL(`../apps/${workspace}/package.json`, import.meta.url));
  const { getSharp, optimizeImage } = require("next/dist/server/image-optimizer");
  test(`${workspace}: Next resizes and encodes with the patched Sharp binary`, async () => {
    const sharp = getSharp(1);
    const input = await sharp({
      create: { width: 32, height: 24, channels: 3, background: "#24473c" },
    }).png().toBuffer();
    for (const [contentType, format] of [["image/png", "png"], ["image/webp", "webp"], ["image/avif", "heif"]]) {
      const output = await optimizeImage({ buffer: input, contentType, quality: 75, width: 16, concurrency: 1 });
      const metadata = await sharp(output).metadata();
      assert.equal(metadata.width, 16);
      assert.equal(metadata.height, 12);
      assert.equal(metadata.format, format);
    }
  });
}
