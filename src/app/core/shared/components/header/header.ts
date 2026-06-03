import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { take } from 'rxjs';
import { AuthService as AuthApiService } from '../../../services/apis/auth.service';
import { AuthService as AuthStateService } from '../../../services/auth';
import { ThemeService } from '../../../services/theme';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

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
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly themeService = inject(ThemeService);
  private readonly authApiService = inject(AuthApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly navItems = [
    { label: 'Dashboard', route: '/', icon: 'dashboard' },
    { label: 'Expenses', route: '/expenses', icon: 'receipt_long' },
    { label: 'Earnings', route: '/earnings', icon: 'trending_up' },
    { label: 'Budget', route: '/budget', icon: 'savings' },
  ];

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
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
    this.authApiService.logout().pipe(take(1)).subscribe({
      next: () => this.completeLogout(),
      error: () => this.completeLogout(),
    });
  }

  private completeLogout(): void {
    this.authStateService.logout();
    this.router.navigate(['/auth/login']);
  }
}
