import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpcomingObligation } from '@worthlane/types';
const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  cancel: vi.fn(), dismiss: vi.fn(), scheduled: vi.fn(), presented: vi.fn(),
  permission: vi.fn(), requestPermission: vi.fn(), schedule: vi.fn(),
  handler: vi.fn(),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: async (key: string) => mocks.storage.get(key) ?? null,
  setItem: async (key: string, value: string) => { mocks.storage.set(key, value); },
  removeItem: async (key: string) => { mocks.storage.delete(key); },
} }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-notifications', () => ({
  setNotificationHandler: mocks.handler,
  cancelScheduledNotificationAsync: mocks.cancel, dismissNotificationAsync: mocks.dismiss,
  getAllScheduledNotificationsAsync: mocks.scheduled, getPresentedNotificationsAsync: mocks.presented,
  getPermissionsAsync: mocks.permission, requestPermissionsAsync: mocks.requestPermission,
  scheduleNotificationAsync: mocks.schedule, SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));
const item = { id: 'bill', name: 'Private medical bill', dueDate: '2099-09-20', reminderTiming: 'ONE_DAY_BEFORE', isPaid: false, isActive: true } as UpcomingObligation;
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); mocks.storage.clear();
  mocks.scheduled.mockResolvedValue([]); mocks.presented.mockResolvedValue([]);
  mocks.permission.mockResolvedValue({ status: 'granted' }); mocks.schedule.mockResolvedValue('notification');
});
describe('mobile reminder session isolation (mock native adapters)', () => {
  it('reports only the current login test history and distinguishes pending from missing', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders');
    await r.setReminderSession('alex');
    const data = { reminderTest: true, reminderUserId: 'alex' };
    mocks.presented.mockResolvedValue([{ request: { content: { data } } }]);
    expect(await r.getTestReminderStatus('alex')).toBe('presented');
    mocks.scheduled.mockResolvedValue([{ content: { data } }]);
    expect(await r.getTestReminderStatus('alex')).toBe('pending');
    mocks.scheduled.mockResolvedValue([]);
    mocks.presented.mockResolvedValue([{ request: { content: { data: { ...data, reminderUserId: 'sam' } } } }]);
    expect(await r.getTestReminderStatus('alex')).toBe('unknown');
    expect(await r.getTestReminderStatus('sam')).toBe('stale');
  });
  it('clears the old test history before scheduling a new test', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders');
    await r.setReminderSession('alex');
    mocks.presented.mockResolvedValue([{ request: { identifier: 'old-test', content: { data: { reminderTest: true, reminderUserId: 'alex' } } } }]);
    await r.sendTestReminder('alex');
    expect(mocks.dismiss).toHaveBeenCalledWith('old-test');
    expect(mocks.schedule).toHaveBeenCalledOnce();
  });
  it('presents current-login foreground reminders but suppresses old-login and signed-out deliveries', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders');
    const handle = mocks.handler.mock.calls[0][0].handleNotification;
    const notification = { request: { content: { data: { reminderUserId: 'alex', reminderTest: true } } } };
    expect((await handle(notification)).shouldShowBanner).toBe(false);
    await r.setReminderSession('alex');
    expect(await handle(notification)).toEqual({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false });
    await r.setReminderSession('sam');
    expect((await handle(notification)).shouldShowList).toBe(false);
    await r.setReminderSession(null);
    expect((await handle(notification)).shouldPlaySound).toBe(false);
  });
  it('removes legacy/other-user schedules and delivered private reminders, preserves unrelated notifications', async () => {
    mocks.scheduled.mockResolvedValue([
      { identifier: 'legacy', content: { data: { obligationId: 'old' } } },
      { identifier: 'alex', content: { data: { obligationId: 'a', reminderUserId: 'alex' } } },
      { identifier: 'sam', content: { data: { obligationId: 'b', reminderUserId: 'sam' } } },
      { identifier: 'other', content: { data: {} } },
    ]);
    mocks.presented.mockResolvedValue([{ request: { identifier: 'delivered', content: { data: { obligationId: 'a' } } } }]);
    const reminders = await import('../../mobile/src/lib/obligation-reminders');
    await reminders.setReminderSession('sam');
    expect(mocks.cancel.mock.calls).toEqual([['legacy'], ['alex']]);
    expect(mocks.dismiss).toHaveBeenCalledWith('delivered');
  });
  it('does not inherit another login or legacy default and rejects stale-user scheduling', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders');
    mocks.storage.set('worthlane:default-reminder', 'DUE_DATE');
    await r.setReminderSession('alex'); expect(await r.getDefaultReminder('alex')).toBe('NONE');
    await r.setDefaultReminder('alex', 'DUE_DATE');
    await r.setReminderSession('sam'); expect(await r.getDefaultReminder('sam')).toBe('NONE');
    expect(await r.scheduleObligationReminder('alex', item)).toBe('not-scheduled');
    expect(mocks.schedule).not.toHaveBeenCalled();
    await r.setReminderSession('alex'); expect(await r.getDefaultReminder('alex')).toBe('DUE_DATE');
  });
  it('uses generic lock-screen text and replaces schedules after recurring advancement', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders'); await r.setReminderSession('alex');
    await r.scheduleObligationReminder('alex', item);
    await r.scheduleObligationReminder('alex', { ...item, dueDate: '2099-10-20' });
    expect(mocks.cancel).toHaveBeenCalledWith('notification');
    const payload = mocks.schedule.mock.calls[1][0];
    expect(JSON.stringify(payload.content)).not.toContain(item.name);
    expect(payload.content.data.reminderUserId).toBe('alex');
    expect(payload.trigger.date.getMonth()).toBe(9);
    expect(payload.trigger.date.getDate()).toBe(19);
    expect(payload.trigger.date.getHours()).toBe(9);
  });
  it('logout during an outstanding permission request prevents scheduling', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders'); await r.setReminderSession('alex');
    let grant!: (value: { status: string }) => void;
    mocks.permission.mockResolvedValue({ status: 'undetermined' });
    mocks.requestPermission.mockImplementation(() => new Promise(resolve => { grant = resolve; }));
    const work = r.scheduleObligationReminder('alex', item);
    await vi.waitFor(() => expect(grant).toBeDefined());
    const logout = r.setReminderSession(null); grant({ status: 'granted' });
    expect(await work).toBe('not-scheduled'); await logout;
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('cancels a notification created while a session switch is in flight', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders'); await r.setReminderSession('alex');
    let finish!: (value: string) => void;
    mocks.schedule.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const work = r.scheduleObligationReminder('alex', item);
    await vi.waitFor(() => expect(finish).toBeDefined());
    const switchUser = r.setReminderSession('sam'); finish('late');
    expect(await work).toBe('not-scheduled'); await switchUser;
    expect(mocks.cancel).toHaveBeenCalledWith('late');
    expect(mocks.storage.size).toBe(0);
  });
  it('paid, inactive and opted-out items cancel an existing schedule without creating one', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders'); await r.setReminderSession('alex');
    for (const patch of [{ isPaid: true }, { isActive: false }, { reminderTiming: 'NONE' as const }]) {
      mocks.storage.set('worthlane:obligation-reminder:alex:bill', 'old');
      expect(await r.scheduleObligationReminder('alex', { ...item, ...patch })).toBe('not-scheduled');
    }
    expect(mocks.cancel).toHaveBeenCalledTimes(3); expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('reconciles changed and deleted items without asking for notification permission', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders'); await r.setReminderSession('alex');
    mocks.scheduled.mockResolvedValue([
      { identifier: 'deleted', content: { data: { obligationId: 'gone', reminderUserId: 'alex' } } },
      { identifier: 'unrelated', content: { data: {} } },
    ]);
    mocks.permission.mockResolvedValue({ status: 'denied' });
    expect(await r.reconcileObligationReminders('alex', async () => [item])).toBe('denied');
    expect(mocks.cancel).toHaveBeenCalledWith('deleted');
    expect(mocks.cancel).not.toHaveBeenCalledWith('unrelated');
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    mocks.permission.mockResolvedValue({ status: 'granted' });
    expect(await r.reconcileObligationReminders('alex', async () => [{ ...item, dueDate: '2099-11-20' }])).toBe('checked');
    expect(mocks.schedule.mock.calls[0][0].trigger.date.getMonth()).toBe(10);
  });
  it('preserves existing schedules when the server cannot provide a fresh snapshot', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders'); await r.setReminderSession('alex');
    await expect(r.reconcileObligationReminders('alex', async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    expect(mocks.cancel).not.toHaveBeenCalled(); expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('discards a snapshot returned after logout', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders'); await r.setReminderSession('alex');
    let finish!: (items: UpcomingObligation[]) => void;
    const work = r.reconcileObligationReminders('alex', () => new Promise(resolve => { finish = resolve; }));
    await vi.waitFor(() => expect(finish).toBeDefined());
    const logout = r.setReminderSession(null); finish([item]);
    expect(await work).toBe('stale'); await logout;
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it('releases the operation queue when snapshot loading stalls', async () => {
    const r = await import('../../mobile/src/lib/obligation-reminders'); await r.setReminderSession('alex');
    vi.useFakeTimers();
    try {
      const work = r.reconcileObligationReminders('alex', () => new Promise(() => {}));
      const rejected = expect(work).rejects.toThrow('timed out');
      await vi.advanceTimersByTimeAsync(15_000);
      await rejected;
      await r.setReminderSession(null);
      expect(mocks.schedule).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });

});


it('schedules a generic test, replaces pending tests and cancels it on logout', async () => {
  const r = await import('../../mobile/src/lib/obligation-reminders');
  await r.setReminderSession('alex');
  mocks.scheduled.mockResolvedValue([{ identifier: 'old-test', content: { data: { reminderTest: true, reminderUserId: 'alex' } } }]);
  expect(await r.sendTestReminder('alex')).toBe('scheduled');
  expect(mocks.cancel).toHaveBeenCalledWith('old-test');
  const payload = mocks.schedule.mock.calls[0][0];
  expect(payload.trigger).toMatchObject({ seconds: 10, repeats: false });
  expect(payload.content.body).not.toContain(item.name);
  expect(payload.content.data).toEqual({ reminderTest: true, reminderUserId: 'alex' });
  mocks.scheduled.mockResolvedValue([{ identifier: 'test', content: payload.content }]);
  mocks.presented.mockResolvedValue([{ request: { identifier: 'delivered-test', content: payload.content } }]);
  await r.setReminderSession(null);
  expect(mocks.cancel).toHaveBeenCalledWith('test');
  expect(mocks.dismiss).toHaveBeenCalledWith('delivered-test');
});
it('does not schedule a test after permission denial or a session switch', async () => {
  const r = await import('../../mobile/src/lib/obligation-reminders');
  await r.setReminderSession('alex');
  mocks.permission.mockResolvedValue({ status: 'denied' });
  mocks.requestPermission.mockResolvedValue({ status: 'denied' });
  expect(await r.sendTestReminder('alex')).toBe('denied');
  let finish!: (result: { status: string }) => void;
  mocks.requestPermission.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const test = r.sendTestReminder('alex');
  await vi.waitFor(() => expect(finish).toBeDefined());
  const logout = r.setReminderSession(null);
  finish({ status: 'granted' });
  expect(await test).toBe('not-scheduled');
  await logout;
  expect(mocks.schedule).not.toHaveBeenCalled();
});
