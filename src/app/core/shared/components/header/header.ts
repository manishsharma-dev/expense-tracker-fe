import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize, take } from 'rxjs';
import { AuthService as AuthApiService } from '../../../services/apis/auth.service';
import { AuthService as AuthStateService } from '../../../services/auth';
import { AuthSyncService } from '../../../services/auth-sync';
import { ExpenseReminderService } from '../../../services/expense-reminder';
import { ThemeService } from '../../../services/theme';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { ExpenseReminderDialog } from '../expense-reminder-dialog/expense-reminder-dialog';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    Loader,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly themeService = inject(ThemeService);
  private readonly authApiService = inject(AuthApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly authSync = inject(AuthSyncService);
  private readonly expenseReminder = inject(ExpenseReminderService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  protected readonly loggingOut = signal(false);

  protected readonly navItems = [
    { label: 'Dashboard', route: '/', icon: 'dashboard' },
    { label: 'Expenses', route: '/expenses', icon: 'receipt_long' },
    { label: 'Earnings', route: '/earnings', icon: 'trending_up' },
    { label: 'Budget', route: '/budget', icon: 'savings' },
    { label: 'Debts', route: '/debts', icon: 'account_balance' },
  ];

  protected userInitials(): string {
    const user = this.authStateService.user();
    const fallback = user?.email || user?.phone || 'U';
    const name = user?.name?.trim() || fallback;
    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`
      : name.slice(0, 2);
    return initials.toUpperCase();
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected themeIcon(): string {
    return this.themeService.currentTheme() === 'dark-theme' ? 'light_mode' : 'dark_mode';
  }

  protected themeTooltip(): string {
    return this.themeService.currentTheme() === 'dark-theme' ? 'Switch to light theme' : 'Switch to dark theme';
  }

  protected reminderEnabled(): boolean {
    return this.expenseReminder.settings().enabled;
  }

  protected openReminderSettings(): void {
    this.dialog.open(ExpenseReminderDialog, {
      width: '430px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: {
        settings: this.expenseReminder.settings(),
        permission: this.expenseReminder.permissionStatus(),
      },
    });
  }

  protected logout(): void {
    this.dialog.open(ConfirmDialog, {
      width: '360px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Logout?',
        message: 'You will need to login again to continue tracking your expenses.',
        cancelText: 'Cancel',
        confirmText: 'Logout',
        confirmIcon: 'logout',
      },
    }).afterClosed().pipe(take(1)).subscribe((confirmed) => {
      if (confirmed) {
        this.initiateLogout();
      }
    });
  }

  private initiateLogout(): void {
    this.loggingOut.set(true);
    this.authApiService.logout().pipe(
      take(1),
      finalize(() => this.loggingOut.set(false))
    ).subscribe({
      next: () => this.completeLogout(),
      error: () => this.completeLogout(),
    });
  }

  private completeLogout(): void {
    this.authStateService.logout();
    this.authSync.announceLogout();
    this.router.navigate(['/auth/login']);
  }
}
