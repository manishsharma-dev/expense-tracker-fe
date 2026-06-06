import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Country } from 'app/core/shared/types/expense.model';

type CountryPickerDialogData = {
  countries: Country[];
  selectedCountryId?: string;
};

@Component({
  selector: 'app-country-picker-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './country-picker-dialog.html',
  styleUrl: './country-picker-dialog.scss',
})
export class CountryPickerDialog {
  private readonly dialogRef = inject(MatDialogRef<CountryPickerDialog, Country | undefined>);
  protected readonly data = inject<CountryPickerDialogData>(MAT_DIALOG_DATA);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');

  protected readonly filteredCountries = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    if (!search) return this.data.countries;

    return this.data.countries.filter((country) => {
      const currencyCode = country.currency?.code ?? '';
      const currencyName = country.currency?.name ?? '';
      return `${country.name} ${country.iso2} ${country.iso3} ${currencyCode} ${currencyName}`
        .toLowerCase()
        .includes(search);
    });
  });

  constructor() {
    this.searchControl.valueChanges.subscribe((value) => this.searchTerm.set(value));
  }

  protected selectCountry(country: Country): void {
    this.dialogRef.close(country);
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
