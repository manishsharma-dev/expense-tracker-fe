import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

export type ExpenseReminderSettings = {
  enabled: boolean;
  time: string;
};

export type ReminderPermissionStatus = 'default' | 'denied' | 'granted' | 'unsupported';

const defaultSettings: ExpenseReminderSettings = {
  enabled: false,
  time: '21:00',
};

@Injectable({
  providedIn: 'root',
})
export class ExpenseReminderService {
  private readonly router = inject(Router);
  private readonly settingsKey = 'xpense_daily_expense_reminder';
  private readonly lastShownKey = 'xpense_daily_expense_reminder_last_shown';
  private readonly settingsState = signal<ExpenseReminderSettings>(defaultSettings);
  private reminderTimer: ReturnType<typeof setTimeout> | null = null;

  readonly settings = this.settingsState.asReadonly();

  init(): void {
    if (!this.isBrowser()) return;
    this.settingsState.set(this.loadSettings());
    this.scheduleNextReminder();
  }

  permissionStatus(): ReminderPermissionStatus {
    if (!this.isBrowser() || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  async saveSettings(settings: ExpenseReminderSettings): Promise<ReminderPermissionStatus> {
    const nextSettings = {
      enabled: settings.enabled,
      time: this.normalizeTime(settings.time),
    };

    let permission = this.permissionStatus();
    if (nextSettings.enabled && permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'denied' || permission === 'unsupported') {
      nextSettings.enabled = false;
    }

    this.settingsState.set(nextSettings);
    localStorage.setItem(this.settingsKey, JSON.stringify(nextSettings));
    this.scheduleNextReminder();
    return permission;
  }

  private scheduleNextReminder(): void {
    if (!this.isBrowser()) return;
    if (this.reminderTimer) clearTimeout(this.reminderTimer);

    const settings = this.settingsState();
    if (!settings.enabled || this.permissionStatus() !== 'granted') return;

    const delay = this.getDelayUntilNextReminder(settings.time);
    this.reminderTimer = setTimeout(() => {
      this.showReminder();
      this.scheduleNextReminder();
    }, delay);
  }

  private showReminder(): void {
    const todayKey = this.getTodayKey();
    if (localStorage.getItem(this.lastShownKey) === todayKey) return;
    localStorage.setItem(this.lastShownKey, todayKey);

    const notification = new Notification('Add today\'s expenses', {
      body: 'Take a minute to log your spending for today.',
      icon: '/assets/images/logo/icon_192x192.png',
      badge: '/assets/images/logo/icon_96x96.png',
      tag: 'daily-expense-reminder',
    });

    notification.onclick = () => {
      window.focus();
      void this.router.navigate(['/expenses/create']);
      notification.close();
    };
  }

  private loadSettings(): ExpenseReminderSettings {
    try {
      const storedSettings = JSON.parse(localStorage.getItem(this.settingsKey) ?? 'null') as Partial<ExpenseReminderSettings> | null;
      return {
        enabled: Boolean(storedSettings?.enabled),
        time: this.normalizeTime(storedSettings?.time ?? defaultSettings.time),
      };
    } catch {
      return defaultSettings;
    }
  }

  private getDelayUntilNextReminder(time: string): number {
    const [hours, minutes] = this.normalizeTime(time).split(':').map(Number);
    const now = new Date();
    const nextReminder = new Date();
    nextReminder.setHours(hours, minutes, 0, 0);

    if (nextReminder.getTime() <= now.getTime()) {
      nextReminder.setDate(nextReminder.getDate() + 1);
    }

    return nextReminder.getTime() - now.getTime();
  }

  private normalizeTime(time: string): string {
    return /^\d{2}:\d{2}$/.test(time) ? time : defaultSettings.time;
  }

  private getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}
