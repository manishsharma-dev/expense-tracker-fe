import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PaymentMethod, PaymentProvider } from 'app/core/shared/types/expense.model';

export type PaymentMethodDialogData = {
  paymentMethod?: PaymentMethod;
  paymentProviders: PaymentProvider[];
  existingNames?: string[];
};

export type PaymentMethodDialogResult = {
  name: string;
  type: PaymentMethod['type'];
  provider?: string;
  nickname?: string;
  lastFour?: string;
  upiId?: string;
  icon: string;
};

type PaymentMethodForm = {
  provider: FormControl<string>;
  name: FormControl<string>;
  type: FormControl<PaymentMethod['type']>;
  nickname: FormControl<string>;
  lastFour: FormControl<string>;
  upiId: FormControl<string>;
};

@Component({
  selector: 'app-payment-method-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './payment-method-dialog.html',
  styleUrl: './payment-method-dialog.scss',
})
export class PaymentMethodDialog {
  private readonly dialogRef = inject(MatDialogRef<PaymentMethodDialog, PaymentMethodDialogResult | undefined>);
  protected readonly data = inject<PaymentMethodDialogData>(MAT_DIALOG_DATA);

  protected readonly typeOptions: Array<{ label: string; value: PaymentMethod['type']; icon: string; shortLabel: string }> = [
    { label: 'Debit Card', value: 'debit_card', icon: 'credit_card', shortLabel: 'DC' },
    { label: 'Credit Card', value: 'credit_card', icon: 'credit_score', shortLabel: 'CC' },
    { label: 'UPI', value: 'upi', icon: 'qr_code_2', shortLabel: 'UPI' },
    { label: 'Cash', value: 'cash', icon: 'payments', shortLabel: '₹' },
  ];

  protected readonly form = new FormGroup<PaymentMethodForm>({
    provider: new FormControl(this.data.paymentMethod?.provider?._id ?? this.getDefaultProviderId(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    name: new FormControl(this.data.paymentMethod?.name ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(255),
        this.uniqueNameValidator(this.data.existingNames ?? []),
      ],
    }),
    type: new FormControl(this.normalizeType(this.data.paymentMethod?.type), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    nickname: new FormControl(this.data.paymentMethod?.nickname ?? '', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    lastFour: new FormControl(this.data.paymentMethod?.lastFour ?? '', {
      nonNullable: true,
      validators: [Validators.pattern(/^\d{0,4}$/)],
    }),
    upiId: new FormControl(this.data.paymentMethod?.upiId ?? '', { nonNullable: true, validators: [Validators.maxLength(100)] }),
  });

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected selectedProvider(): PaymentProvider | undefined {
    return this.data.paymentProviders.find((provider) => provider._id === this.form.controls.provider.value);
  }

  protected isCardType(): boolean {
    return this.form.controls.type.value === 'debit_card' || this.form.controls.type.value === 'credit_card';
  }

  protected isUpiType(): boolean {
    return this.form.controls.type.value === 'upi';
  }

  protected getProviderInitial(provider: PaymentProvider): string {
    if (provider.type === 'cash') return '₹';
    return provider.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  protected getSelectedTypeLabel(): string {
    return this.typeOptions.find((type) => type.value === this.form.controls.type.value)?.label ?? 'Choose type';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const provider = this.data.paymentProviders.find((item) => item._id === value.provider);
    const icon = provider?.icon || this.typeOptions.find((option) => option.value === value.type)?.icon || 'payments';

    this.dialogRef.close({
      name: value.name.trim(),
      type: value.type,
      provider: value.provider,
      nickname: value.nickname.trim() || undefined,
      lastFour: this.isCardType() ? value.lastFour.trim() || undefined : undefined,
      upiId: this.isUpiType() ? value.upiId.trim() || undefined : undefined,
      icon,
    });
  }

  private getDefaultProviderId(): string {
    return this.data.paymentProviders[0]?._id ?? '';
  }

  private normalizeType(type: PaymentMethod['type'] | undefined): PaymentMethod['type'] {
    return this.typeOptions.some((option) => option.value === type) ? type as PaymentMethod['type'] : 'cash';
  }

  private uniqueNameValidator(existingNames: string[]): ValidatorFn {
    const currentName = this.normalizeName(this.data.paymentMethod?.name);
    const normalizedNames = new Set(
      existingNames
        .map((name) => this.normalizeName(name))
        .filter((name) => name !== currentName)
    );

    return (control: AbstractControl): ValidationErrors | null => {
      const value = this.normalizeName(control.value);
      if (!value) return null;
      return normalizedNames.has(value) ? { duplicateName: true } : null;
    };
  }

  private normalizeName(value: unknown): string {
    return `${value ?? ''}`.trim().toLowerCase();
  }
}
