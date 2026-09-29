import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const mobile = createRequire(new URL("../apps/mobile/package.json", import.meta.url));
const router = createRequire(mobile.resolve("expo-router/package.json"));
const queryStringPath = router.resolve("query-string");
const queryString = router("query-string");

test("router query parsing preserves Unicode, plus signs, repeated values and malformed bytes", () => {
  const parsed = queryString.parse("name=Morgan+Avery&emoji=%F0%9F%8F%A1&literal=%2B&tag=one&tag=two&bad=%FF%41");
  assert.deepEqual({ ...parsed }, {
    name: "Morgan Avery", emoji: "🏡", literal: "+", tag: ["one", "two"], bad: "%FFA",
  });
});

test("malformed router query cannot trap the decoder in recursive retries", () => {
  // Separate process ensures the old synchronous vulnerability fails with a
  // bounded timeout instead of hanging the entire regression runner.
  const result = spawnSync(process.execPath, ["-e", `
    const assert = require('node:assert/strict');
    const query = require(${JSON.stringify(queryStringPath)});
    const parsed = query.parse('value=' + '%FF%41'.repeat(3000));
    assert.equal(parsed.value, '%FFA'.repeat(3000));
  `], { timeout: 5000, encoding: "utf8" });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
});
