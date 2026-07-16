import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExpenseReminderService } from './expense-reminder';

class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn<() => Promise<NotificationPermission>>();
  static instances: MockNotification[] = [];
  onclick: (() => void) | null = null;
  close = vi.fn();

  constructor(
    public readonly title: string,
    public readonly options?: NotificationOptions
  ) {
    MockNotification.instances.push(this);
  }
}

describe('ExpenseReminderService', () => {
  let service: ExpenseReminderService;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let storage: Map<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 16, 20, 30, 0));
    storage = new Map<string, string>();
    MockNotification.permission = 'default';
    MockNotification.requestPermission = vi.fn();
    MockNotification.instances = [];

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      },
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: MockNotification,
    });
    vi.spyOn(window, 'focus').mockImplementation(() => undefined);

    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ExpenseReminderService,
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(ExpenseReminderService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports notification permission status', () => {
    MockNotification.permission = 'granted';

    expect(service.permissionStatus()).toBe('granted');
  });

  it('loads saved settings and schedules a reminder on init', () => {
    MockNotification.permission = 'granted';
    storage.set('xpense_daily_expense_reminder', JSON.stringify({ enabled: true, time: '21:00' }));

    service.init();

    expect(service.settings()).toEqual({ enabled: true, time: '21:00' });
    expect(vi.getTimerCount()).toBe(1);
  });

  it('normalizes invalid saved settings time', () => {
    MockNotification.permission = 'denied';
    storage.set('xpense_daily_expense_reminder', JSON.stringify({ enabled: true, time: 'bad-time' }));

    service.init();

    expect(service.settings()).toEqual({ enabled: true, time: '21:00' });
  });

  it('requests permission when enabling reminders and persists settings', async () => {
    MockNotification.permission = 'default';
    MockNotification.requestPermission.mockResolvedValue('granted');

    const permission = await service.saveSettings({ enabled: true, time: '22:15' });

    expect(permission).toBe('granted');
    expect(MockNotification.requestPermission).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.get('xpense_daily_expense_reminder') ?? '{}')).toEqual({
      enabled: true,
      time: '22:15',
    });
    expect(service.settings()).toEqual({ enabled: true, time: '22:15' });
  });

  it('disables reminders when permission is denied', async () => {
    MockNotification.permission = 'default';
    MockNotification.requestPermission.mockResolvedValue('denied');

    const permission = await service.saveSettings({ enabled: true, time: '22:15' });

    expect(permission).toBe('denied');
    expect(service.settings()).toEqual({ enabled: false, time: '22:15' });
  });

  it('shows only one notification per day and opens create expense on click', async () => {
    MockNotification.permission = 'granted';

    await service.saveSettings({ enabled: true, time: '20:31' });
    vi.advanceTimersByTime(60_000);

    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].title).toBe('Add today\'s expenses');
    expect(storage.get('xpense_daily_expense_reminder_last_shown')).toBe('2026-07-16');

    MockNotification.instances[0].onclick?.();
    expect(window.focus).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/expenses/create']);
    expect(MockNotification.instances[0].close).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(MockNotification.instances).toHaveLength(2);
  });
});
