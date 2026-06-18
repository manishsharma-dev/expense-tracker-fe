import { CommonModule, DatePipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, forkJoin, take } from 'rxjs';
import { EarningApiService } from 'app/core/services/apis/earning.service';
import { ExpenseApiService } from 'app/core/services/apis/expense.service';
import { AuthService as AuthStateService } from 'app/core/services/auth';
import {
  ExpenseReferenceDialog,
  ExpenseReferenceDialogResult,
} from 'app/core/shared/components/expense-reference-dialog/expense-reference-dialog';
import { Loader } from 'app/core/shared/components/loader/loader';
import { Earning, EarningCategory } from 'app/core/shared/types/earning.model';
import { Country } from 'app/core/shared/types/expense.model';
import {
  filterCurrencyCountries,
  getCountryCurrencyLabel,
  getPreferredCurrencyCountry,
} from 'app/core/shared/utils/country-currency';
import { formatDateOnly } from 'app/core/shared/utils/date';

@Component({
  selector: 'app-earnings',
  imports: [
    CommonModule,
    ScrollingModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    Loader,
  ],
  providers: [DatePipe],
  templateUrl: './earnings.html',
  styleUrl: './earnings.scss',
})
export class Earnings implements OnInit {
  private readonly earningApi = inject(EarningApiService);
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly authState = inject(AuthStateService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly datePipe = inject(DatePipe);

  protected readonly categories = signal<EarningCategory[]>([]);
  protected readonly earnings = signal<Earning[]>([]);
  protected readonly countries = signal<Country[]>([]);
  protected readonly countrySearch = new FormControl('', { nonNullable: true });
  protected readonly countrySearchTerm = signal('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly maxEarningDate = new Date();

  protected readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    date: new FormControl<Date | null>(this.maxEarningDate, [Validators.required]),
    country: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadData();
    this.countrySearch.valueChanges.subscribe((value) => {
      this.countrySearchTerm.set(value);
      const selectedCountry = this.countries().find((country) => country._id === this.form.controls.country.value);
      if (selectedCountry && value !== getCountryCurrencyLabel(selectedCountry)) {
        this.form.controls.country.setValue('');
      }
    });
  }

  protected filteredCountries(): Country[] {
    return filterCurrencyCountries(this.countries(), this.countrySearchTerm());
  }

  protected selectCountry(event: MatAutocompleteSelectedEvent): void {
    const country = event.option.value as Country;
    this.form.controls.country.setValue(country._id);
    const countryLabel = getCountryCurrencyLabel(country);
    this.countrySearch.setValue(countryLabel, { emitEvent: false });
    this.countrySearchTerm.set(countryLabel);
  }

  protected totalEarned(): number {
    return this.earnings().reduce((sum, earning) => sum + earning.amount, 0);
  }

  protected selectedCurrencyCode(): string {
    const country = this.countries().find((item) => item._id === this.form.controls.country.value);
    return country?.currency?.code ?? 'INR';
  }

  protected earningCurrencyCode(earning: Earning): string {
    return earning.country?.currency?.code ?? this.selectedCurrencyCode();
  }

  protected addCategory(): void {
    this.dialog.open(ExpenseReferenceDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: {
        title: 'Add Earning Category',
        description: 'Create a custom income source category.',
        nameLabel: 'Category name',
        submitText: 'Add Category',
        defaultIcon: 'trending_up',
        defaultColor: 'green',
        existingNames: this.categories().map((category) => category.name),
      },
    }).afterClosed().pipe(take(1)).subscribe((result?: ExpenseReferenceDialogResult) => {
      if (!result) return;
      this.earningApi.createEarningCategory(result).pipe(take(1)).subscribe({
        next: (response) => {
          const category = response.data.earningCategory;
          if (!category) return;
          this.categories.update((categories) => [...categories, category]);
          this.form.controls.category.setValue(category._id);
        },
        error: () => this.snackBar.open('Could not create earning category', 'Close', { duration: 2500 }),
      });
    });
  }

  protected saveEarning(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.earningApi.createEarning({
      amount: Number(raw.amount),
      date: formatDateOnly(raw.date ?? new Date()),
      category: raw.category,
      country: raw.country,
      description: raw.description,
      notes: raw.notes || undefined,
    }).pipe(
      take(1),
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: (response) => {
        const earning = response.data.earning;
        if (earning) this.earnings.update((earnings) => [earning, ...earnings]);
        this.form.patchValue({ amount: null, description: '', notes: '' });
        this.snackBar.open('Earning added', 'Close', { duration: 2500 });
      },
      error: () => this.snackBar.open('Could not add earning', 'Close', { duration: 2500 }),
    });
  }

  protected formatDate(date: string): string {
    return this.datePipe.transform(date, 'MMM d') ?? '';
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      categories: this.earningApi.getEarningCategories(),
      earnings: this.earningApi.getEarnings(),
      countries: this.expenseApi.getUniqueCurrencyCountries(),
    }).pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ categories, earnings, countries }) => {
        const loadedCountries = countries.data.countries ?? [];
        this.categories.set(categories.data.earningCategories ?? []);
        this.earnings.set(earnings.data.earnings ?? []);
        this.countries.set(loadedCountries);
        this.setDefaultCurrencyCountry(loadedCountries);
      },
      error: () => this.snackBar.open('Could not load earnings', 'Close', { duration: 2500 }),
    });
  }

  private setDefaultCurrencyCountry(countries: Country[]): void {
    if (this.form.controls.country.value || !countries.length) return;

    const country = getPreferredCurrencyCountry(countries, this.authState.user()?.country);
    if (!country) return;

    const countryLabel = getCountryCurrencyLabel(country);
    this.form.controls.country.setValue(country._id);
    this.countrySearch.setValue(countryLabel, { emitEvent: false });
    this.countrySearchTerm.set(countryLabel);
  }
}
