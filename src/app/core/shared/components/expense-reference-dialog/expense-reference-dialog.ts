import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export type ExpenseReferenceDialogData = {
  title: string;
  description?: string;
  nameLabel: string;
  submitText: string;
  defaultIcon?: string;
  defaultColor?: string;
  existingNames?: string[];
};

export type ExpenseReferenceDialogResult = {
  name: string;
  color: string;
  icon: string;
};

type ReferenceForm = {
  name: FormControl<string>;
  color: FormControl<string>;
  icon: FormControl<string>;
};

@Component({
  selector: 'app-expense-reference-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './expense-reference-dialog.html',
  styleUrl: './expense-reference-dialog.scss',
})
export class ExpenseReferenceDialog {
  private readonly dialogRef = inject(MatDialogRef<ExpenseReferenceDialog, ExpenseReferenceDialogResult | undefined>);
  protected readonly data = inject<ExpenseReferenceDialogData>(MAT_DIALOG_DATA);

  protected readonly colors = [
    { label: 'Orange', value: 'orange' },
    { label: 'Teal', value: 'teal' },
    { label: 'Amber', value: 'amber' },
    { label: 'Purple', value: 'purple' },
    { label: 'Pink', value: 'pink' },
    { label: 'Green', value: 'green' },
    { label: 'Yellow', value: 'yellow' },
    { label: 'Blue', value: 'blue' },
    { label: 'Neutral', value: 'neutral' },
  ];

  protected readonly icons = [
    'restaurant',
    'directions_car',
    'home',
    'movie',
    'favorite',
    'shopping_bag',
    'bolt',
    'flight',
    'medical_services',
    'school',
    'pets',
    'sports_esports',
    'local_gas_station',
    'coffee',
    'receipt_long',
    'payments',
    'savings',
    'category',
    'label',
    'add',
  ];

  protected readonly form = new FormGroup<ReferenceForm>({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(255),
        this.uniqueNameValidator(this.data.existingNames ?? []),
      ],
    }),
    color: new FormControl(this.data.defaultColor ?? 'neutral', { nonNullable: true, validators: [Validators.required] }),
    icon: new FormControl(this.data.defaultIcon ?? 'category', { nonNullable: true, validators: [Validators.required] }),
  });

  protected selectColor(color: string): void {
    this.form.controls.color.setValue(color);
  }

  protected selectIcon(icon: string): void {
    this.form.controls.icon.setValue(icon);
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      name: value.name.trim(),
      color: value.color,
      icon: value.icon,
    });
  }

  private uniqueNameValidator(existingNames: string[]): ValidatorFn {
    const normalizedNames = new Set(existingNames.map((name) => this.normalizeName(name)));

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
