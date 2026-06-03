import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type ConfirmDialogData = {
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  confirmIcon?: string;
};

@Component({
  selector: 'app-confirm-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialog>);
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  protected readonly cancelText = this.data.cancelText ?? 'Cancel';
  protected readonly confirmText = this.data.confirmText ?? 'Confirm';

  protected close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}
