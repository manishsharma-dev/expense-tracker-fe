import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  ExpenseReminderService,
  ExpenseReminderSettings,
  ReminderPermissionStatus,
} from '../../../services/expense-reminder';

type ExpenseReminderDialogData = {
  settings: ExpenseReminderSettings;
  permission: ReminderPermissionStatus;
};

@Component({
  selector: 'app-expense-reminder-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>Daily reminder</h2>

    <mat-dialog-content class="reminder-dialog">
      <div class="reminder-dialog__intro">
        <mat-icon aria-hidden="true">notifications_active</mat-icon>
        <div>
          <strong>Add today's expenses</strong>
          <p>Get a browser notification at your chosen local time.</p>
        </div>
      </div>

      <mat-slide-toggle [formControl]="enabledControl">
        Enable daily reminder
      </mat-slide-toggle>

      <mat-form-field appearance="outline">
        <mat-label>Reminder time</mat-label>
        <input matInput type="time" [formControl]="timeControl" />
      </mat-form-field>

      @if (permission() === 'denied') {
        <p class="reminder-dialog__status">
          Browser notifications are blocked. Enable notifications for this site in browser settings.
        </p>
      } @else if (permission() === 'unsupported') {
        <p class="reminder-dialog__status">
          This browser does not support local notifications.
        </p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Cancel</button>
      <button mat-flat-button type="button" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .reminder-dialog {
      display: grid;
      gap: 18px;
      width: min(380px, calc(100vw - 64px));
      padding-top: 4px;
    }

    .reminder-dialog__intro {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      color: var(--mat-sys-on-surface);

      mat-icon {
        color: var(--mat-sys-primary);
      }

      strong {
        display: block;
        font-weight: 800;
      }

      p {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
      }
    }

    .reminder-dialog__status {
      margin: 0;
      color: var(--mat-sys-error);
      font-size: 13px;
    }

    mat-form-field {
      width: 100%;
    }
  `],
})
export class ExpenseReminderDialog {
  private readonly data = inject<ExpenseReminderDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExpenseReminderDialog>);
  private readonly reminder = inject(ExpenseReminderService);

  protected readonly enabledControl = new FormControl(this.data.settings.enabled, { nonNullable: true });
  protected readonly timeControl = new FormControl(this.data.settings.time, { nonNullable: true });
  protected readonly permission = signal(this.data.permission);

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(): Promise<void> {
    const permission = await this.reminder.saveSettings({
      enabled: this.enabledControl.value,
      time: this.timeControl.value,
    });
    this.permission.set(permission);
    if (permission !== 'denied' && permission !== 'unsupported') {
      this.dialogRef.close(true);
    }
  }
}
