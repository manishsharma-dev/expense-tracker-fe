import { CommonModule, DatePipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
import { Earning, EarningCategory, EarningPeriod, EarningSummaryRow, Pagination } from 'app/core/shared/types/earning.model';
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
    MatButtonToggleModule,
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
  protected readonly earningSummary = signal<EarningSummaryRow[]>([]);
  protected readonly earningPagination = signal<Pagination | null>(null);
  protected readonly summaryPagination = signal<Pagination | null>(null);
  protected readonly countries = signal<Country[]>([]);
  protected readonly countrySearch = new FormControl('', { nonNullable: true });
  protected readonly countrySearchTerm = signal('');
  protected readonly loading = signal(false);
  protected readonly loadingMoreEarnings = signal(false);
  protected readonly loadingMoreSummary = signal(false);
  protected readonly saving = signal(false);
  protected readonly maxEarningDate = new Date();
  protected readonly summaryPeriod = signal<EarningPeriod>('month');
  protected readonly summaryLimit = 6;
  protected readonly earningLimit = 6;
  protected readonly periodOptions: Array<{ value: EarningPeriod; label: string }> = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

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

  protected latestSummaryTotal(): number {
    return this.earningSummary()[0]?.totalAmount ?? 0;
  }

  protected latestSummaryLabel(): string {
    const row = this.earningSummary()[0];
    return row ? this.formatPeriodLabel(row) : `No ${this.summaryPeriod()} earnings`;
  }

  protected summaryTitle(): string {
    const label = this.periodOptions.find((option) => option.value === this.summaryPeriod())?.label ?? 'Month';
    return `${label} wise earnings`;
  }

  protected canLoadMoreSummary(): boolean {
    return !!this.summaryPagination()?.hasMore && !this.loadingMoreSummary();
  }

  protected canLoadMoreEarnings(): boolean {
    return !!this.earningPagination()?.hasMore && !this.loadingMoreEarnings();
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
        this.loadSummary(true);
        this.loadEarnings(true);
        this.form.patchValue({ amount: null, description: '', notes: '' });
        this.snackBar.open('Earning added', 'Close', { duration: 2500 });
      },
      error: () => this.snackBar.open('Could not add earning', 'Close', { duration: 2500 }),
    });
  }

  protected formatDate(date: string): string {
    return this.datePipe.transform(date, 'MMM d') ?? '';
  }

  protected formatPeriodLabel(row: EarningSummaryRow): string {
    if (row.period === 'year') return row.periodKey;
    if (row.period === 'month') {
      const [year, month] = row.periodKey.split('-').map(Number);
      return this.datePipe.transform(new Date(year, month - 1, 1), 'MMM y') ?? row.periodKey;
    }
    if (row.period === 'week') {
      const [year, week] = row.periodKey.split('-W');
      return `Week ${Number(week)}, ${year}`;
    }
    return this.datePipe.transform(row.periodKey, 'MMM d, y') ?? row.periodKey;
  }

  protected changeSummaryPeriod(period: EarningPeriod): void {
    if (this.summaryPeriod() === period) return;
    this.summaryPeriod.set(period);
    this.loadSummary(true);
  }

  protected loadMoreSummary(): void {
    const pagination = this.summaryPagination();
    if (!pagination?.hasMore) return;
    this.loadSummary(false, pagination.page + 1);
  }

  protected loadMoreEarnings(): void {
    const pagination = this.earningPagination();
    if (!pagination?.hasMore) return;
    this.loadEarnings(false, pagination.page + 1);
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      categories: this.earningApi.getEarningCategories(),
      earnings: this.earningApi.getEarnings({ page: 1, limit: this.earningLimit }),
      summary: this.earningApi.getEarningSummary({ period: this.summaryPeriod(), page: 1, limit: this.summaryLimit }),
      countries: this.expenseApi.getUniqueCurrencyCountries(),
    }).pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ categories, earnings, summary, countries }) => {
        const loadedCountries = countries.data.countries ?? [];
        this.categories.set(categories.data.earningCategories ?? []);
        this.earnings.set(earnings.data.earnings ?? []);
        this.earningPagination.set(earnings.data.pagination ?? null);
        this.earningSummary.set(summary.data.rows ?? []);
        this.summaryPagination.set(summary.data.pagination ?? null);
        this.countries.set(loadedCountries);
        this.setDefaultCurrencyCountry(loadedCountries);
      },
      error: () => this.snackBar.open('Could not load earnings', 'Close', { duration: 2500 }),
    });
  }

  private loadSummary(reset: boolean, page = 1): void {
    const loadingSignal = reset ? this.loading : this.loadingMoreSummary;
    loadingSignal.set(true);
    this.earningApi.getEarningSummary({
      period: this.summaryPeriod(),
      page,
      limit: this.summaryLimit,
    }).pipe(
      take(1),
      finalize(() => loadingSignal.set(false))
    ).subscribe({
      next: (response) => {
        const rows = response.data.rows ?? [];
        this.earningSummary.update((existing) => reset ? rows : [...existing, ...rows]);
        this.summaryPagination.set(response.data.pagination ?? null);
      },
      error: () => this.snackBar.open('Could not load earning summary', 'Close', { duration: 2500 }),
    });
  }

  private loadEarnings(reset: boolean, page = 1): void {
    const loadingSignal = reset ? this.loading : this.loadingMoreEarnings;
    loadingSignal.set(true);
    this.earningApi.getEarnings({ page, limit: this.earningLimit }).pipe(
      take(1),
      finalize(() => loadingSignal.set(false))
    ).subscribe({
      next: (response) => {
        const earnings = response.data.earnings ?? [];
        this.earnings.update((existing) => reset ? earnings : [...existing, ...earnings]);
        this.earningPagination.set(response.data.pagination ?? null);
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
