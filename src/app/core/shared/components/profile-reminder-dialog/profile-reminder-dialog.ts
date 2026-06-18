import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type ProfileReminderDialogResult = 'update' | 'later';

@Component({
  selector: 'app-profile-reminder-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './profile-reminder-dialog.html',
  styleUrl: './profile-reminder-dialog.scss',
})
export class ProfileReminderDialog {
  private readonly dialogRef = inject(MatDialogRef<ProfileReminderDialog, ProfileReminderDialogResult>);

  protected updateNow(): void {
    this.dialogRef.close('update');
  }

  protected remindLater(): void {
    this.dialogRef.close('later');
  }
}
