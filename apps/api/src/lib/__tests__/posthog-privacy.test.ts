import { beforeEach, describe, expect, it, vi } from 'vitest';
const capture = vi.hoisted(() => vi.fn());
vi.mock('posthog-node', () => ({ PostHog: vi.fn(() => ({ captureImmediate: capture })) }));

beforeEach(() => { vi.resetModules(); capture.mockReset(); vi.stubEnv('POSTHOG_PROJECT_KEY', 'synthetic-test-key'); });

describe('server analytics privacy boundary', () => {
  it('sends only reviewed platform/action enums and disables geolocation', async () => {
    const { captureServerEvent } = await import('../posthog');
    await captureServerEvent({ distinctId: 'opaque-user', event: 'bank account linked', properties: {
      platform: 'ios', mode: 'create', method: 'password', email: 'private@example.test',
      $set: { email: 'private@example.test' }, $set_once: { name: 'Private' },
      plaidItemId: 'private-id', itemId: 'provider-id', institution: 'Private Bank',
      amount: 123, goalProgressAmount: 456, targetAmount: 789, nested: { accessToken: 'private' },
    } });
    expect(capture).toHaveBeenCalledWith({ distinctId: 'opaque-user', event: 'bank account linked',
      properties: { platform: 'ios', mode: 'create', method: 'password' }, disableGeoip: true });
  });
  it('drops arbitrary values even under permitted keys', async () => {
    const { captureServerEvent } = await import('../posthog');
    await captureServerEvent({ distinctId: 'opaque-user', event: 'user logged in', properties: {
      platform: 'private@example.test', mode: { toString: () => 'create', secret: 'private' }, method: 'private',
    } });
    expect(capture.mock.calls[0][0].properties).toEqual({});
  });
  it('does not leak SDK request details or fail the user action when analytics fails', async () => {
    capture.mockRejectedValue(new Error('secret-sdk-request'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { captureServerEvent } = await import('../posthog');
      await expect(captureServerEvent({ distinctId: 'opaque-user', event: 'user logged in' })).resolves.toBeUndefined();
      expect(log).toHaveBeenCalledWith('PostHog capture failed; request details omitted.');
    } finally { log.mockRestore(); }
  });
});
