import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Expense } from 'app/core/shared/types/expense.model';

export type ReceiptPreviewDialogData = {
  receipt: NonNullable<Expense['receipt']>;
};

@Component({
  selector: 'app-receipt-preview-dialog',
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <header class="receipt-dialog__header">
      <div>
        <h2 mat-dialog-title>{{ data.receipt.originalName || 'Receipt' }}</h2>
        <p>{{ data.receipt.mimeType || 'Uploaded file' }}</p>
      </div>
      <button mat-icon-button type="button" aria-label="Close receipt preview" (click)="close()">
        <mat-icon aria-hidden="true">close</mat-icon>
      </button>
    </header>

    <mat-dialog-content class="receipt-dialog__content">
      @if (loading()) {
        <div class="receipt-dialog__fallback">
          <mat-icon aria-hidden="true">hourglass_empty</mat-icon>
          <strong>Loading file</strong>
          <p>Please wait while the receipt opens.</p>
        </div>
      } @else if (failed()) {
        <div class="receipt-dialog__fallback">
          <mat-icon aria-hidden="true">error_outline</mat-icon>
          <strong>Could not load file</strong>
          <p>Please try again in a moment.</p>
        </div>
      } @else if (isImage()) {
        <img [src]="fileUrl()" [alt]="data.receipt.originalName || 'Receipt preview'" />
      } @else if (isPdf()) {
        <iframe [src]="safeFileUrl()" title="Receipt preview"></iframe>
      } @else {
        <div class="receipt-dialog__fallback">
          <mat-icon aria-hidden="true">draft</mat-icon>
          <strong>Preview unavailable</strong>
          <p>This file type cannot be previewed here.</p>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <a mat-stroked-button [href]="fileUrl()" target="_blank" rel="noopener" [class.disabled-link]="loading() || failed()">
        <mat-icon aria-hidden="true">open_in_new</mat-icon>
        Open
      </a>
      <button mat-flat-button type="button" (click)="close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      color: var(--mat-sys-on-surface);
    }

    .receipt-dialog__header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px 0;

      h2 {
        margin: 0;
        overflow-wrap: anywhere;
      }

      p {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
      }
    }

    .receipt-dialog__content {
      display: grid;
      place-items: center;
      width: min(82vw, 840px);
      min-height: 280px;
      max-height: 72vh;
      padding: 16px 20px;
      overflow: auto;

      img {
        display: block;
        max-width: 100%;
        max-height: 68vh;
        border-radius: 8px;
        object-fit: contain;
      }

      iframe {
        width: min(78vw, 800px);
        height: 68vh;
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: 8px;
        background: var(--mat-sys-surface);
      }
    }

    .receipt-dialog__fallback {
      display: grid;
      justify-items: center;
      gap: 8px;
      color: var(--mat-sys-on-surface-variant);
      text-align: center;

      mat-icon {
        width: 42px;
        height: 42px;
        font-size: 42px;
      }

      strong {
        color: var(--mat-sys-on-surface);
      }

      p {
        margin: 0;
      }
    }

    .disabled-link {
      pointer-events: none;
      opacity: 0.55;
    }
  `],
})
export class ReceiptPreviewDialog implements OnInit, OnDestroy {
  protected readonly data = inject<ReceiptPreviewDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ReceiptPreviewDialog>);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly http = inject(HttpClient);
  private objectUrl: string | null = null;

  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly previewUrl = signal<string>('');
  protected readonly fileUrl = computed(() => this.previewUrl() || this.data.receipt.viewUrl || this.data.receipt.url || this.data.receipt.path || '');
  protected readonly safeFileUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl())
  );

  ngOnInit(): void {
    this.loadReceipt();
  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  protected isImage(): boolean {
    return Boolean(this.data.receipt.mimeType?.startsWith('image/'));
  }

  protected isPdf(): boolean {
    return this.data.receipt.mimeType === 'application/pdf';
  }

  protected close(): void {
    this.dialogRef.close();
  }

  private loadReceipt(): void {
    const url = this.data.receipt.viewUrl || this.data.receipt.url || this.data.receipt.path;
    if (!url) {
      this.failed.set(true);
      return;
    }

    this.loading.set(true);
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.previewUrl.set(this.objectUrl);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }
}
