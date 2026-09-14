import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Runs the real Groovy guard with a minimal Gradle project, without Android SDK,
// real signing keys, or native compilation. Requires Java and the Gradle wrapper.
const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = mkdtempSync(path.join(tmpdir(), 'worthlane-signing-'));
const guard = path.join(root, 'apps/mobile/android/app/release-signing-check.gradle');
const literal = value => `'${value.replaceAll('\\', '/').replaceAll("'", "\\'")}'`;
try {
  writeFileSync(path.join(fixture, 'settings.gradle'), "rootProject.name = 'signing-guard-check'\n");
  writeFileSync(path.join(fixture, 'fixture.keystore'), 'Not a key; synthetic configuration fixture');
  writeFileSync(path.join(fixture, 'build.gradle'), `
def mode = findProperty('fixtureMode') ?: 'missing'
def signing = mode == 'missing' ? null : [
  name: mode == 'debug' ? 'debug' : 'release',
  storeFile: file(mode == 'missing-file' ? 'absent.keystore' : 'fixture.keystore'),
  keyAlias: mode == 'debug-alias' ? 'androiddebugkey' : 'synthetic-upload',
  storePassword: 'synthetic-test-only', keyPassword: 'synthetic-test-only'
]
ext.android = [buildTypes: [release: [signingConfig: signing]]]
tasks.register('assembleDebug')
tasks.register('bundleRelease')
apply from: ${literal(guard)}
`);
  for (const [task, mode, passes] of [
    ['assembleDebug', 'missing', true], ['bundleRelease', 'missing', false],
    ['bundleRelease', 'debug', false], ['bundleRelease', 'debug-alias', false],
    ['bundleRelease', 'missing-file', false], ['bundleRelease', 'valid', true],
  ]) {
    const run = spawnSync('sh', [path.join(root, 'apps/mobile/android/gradlew'),
      '-p', fixture, '--no-daemon', '--max-workers=1', '--console=plain', task,
      `-PfixtureMode=${mode}`], { cwd: root, encoding: 'utf8', timeout: 180_000 });
    if (run.error) throw run.error;
    const output = run.stdout + run.stderr;
    assert.equal(run.status === 0, passes, `${task}/${mode} returned ${run.status}`);
    if (!passes) assert.match(output, /Worthlane release signing is missing or uses a debug key/);
    assert(!output.includes('synthetic-test-only'), 'Signing secrets must not appear in output');
    console.log(`PASS ${task}/${mode}`);
  }
} finally { rmSync(fixture, { recursive: true, force: true }); }
