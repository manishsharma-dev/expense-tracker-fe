import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { AuthService as AuthApiService } from 'app/core/services/apis/auth.service';
import { AuthService as AuthStateService } from 'app/core/services/auth';
import {
  ProfileReminderDialog,
  ProfileReminderDialogResult,
} from 'app/core/shared/components/profile-reminder-dialog/profile-reminder-dialog';
import { Header } from '../../../core/shared/components/header/header';

@Component({
  selector: 'app-main',
  imports: [Header, RouterOutlet, MatDialogModule],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly promptOpened = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    queueMicrotask(() => this.openProfilePromptIfNeeded());
  }

  private openProfilePromptIfNeeded(): void {
    const user = this.authState.user();
    if (!user?.shouldPromptProfile || this.promptOpened() || this.router.url.startsWith('/profile')) return;

    this.promptOpened.set(true);
    this.dialog.open(ProfileReminderDialog, {
      width: '430px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      restoreFocus: false,
    }).afterClosed().pipe(take(1)).subscribe((result?: ProfileReminderDialogResult) => {
      if (result === 'update') {
        this.router.navigate(['/profile']);
        return;
      }

      if (result === 'later') {
        this.authApi.remindProfileLater().pipe(take(1)).subscribe({
          next: (response) => this.authState.setUser(response.data.user),
        });
      }
    });
  }
}
