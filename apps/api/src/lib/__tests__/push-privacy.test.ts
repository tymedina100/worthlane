import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ send: vi.fn(), find: vi.fn(), update: vi.fn() }));
vi.mock('expo-server-sdk', () => ({ default: class {
  static isExpoPushToken() { return true; }
  sendPushNotificationsAsync = mocks.send;
} }));
vi.mock('@worthlane/db', () => ({ prisma: { user: { findUnique: mocks.find, update: mocks.update } } }));
vi.mock('../sentry', () => ({ captureServerException: vi.fn() }));
import { sendPushToUser } from '../push';
beforeEach(() => { vi.clearAllMocks(); mocks.find.mockResolvedValue({ pushToken: 'synthetic-device-token' }); mocks.send.mockResolvedValue([{ status: 'ok' }]); });
it('sends only generic lock-screen content with no financial or user context', async () => {
  await sendPushToUser('private-user-id');
  expect(mocks.send).toHaveBeenCalledWith([{
    to: 'synthetic-device-token', sound: 'default', title: 'Worthlane',
    body: 'A planning update is ready. Open Worthlane to review it.', data: {},
  }]);
});
it('does not send after the user removes their device token', async () => {
  mocks.find.mockResolvedValue({ pushToken: null });
  await sendPushToUser('private-user-id');
  expect(mocks.send).not.toHaveBeenCalled();
});
