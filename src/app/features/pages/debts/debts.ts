import { CommonModule, DatePipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, forkJoin, take } from 'rxjs';
import { DebtApiService } from 'app/core/services/apis/debt.service';
import { ExpenseApiService } from 'app/core/services/apis/expense.service';
import { Loader } from 'app/core/shared/components/loader/loader';
import {
  DebtAccount,
  DebtAccountPayload,
  DebtAccountType,
  DebtTransactionPayload,
} from 'app/core/shared/types/debt.model';
import { Country, PaymentMethod } from 'app/core/shared/types/expense.model';
import {
  filterCurrencyCountries,
  getCountryCurrencyLabel,
  getDefaultCurrencyCountry,
} from 'app/core/shared/utils/country-currency';
import { formatDateOnly } from 'app/core/shared/utils/date';

const debtTypeLabels: Record<DebtAccountType, string> = {
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  home_loan: 'Home Loan',
  vehicle_loan: 'Vehicle Loan',
  education_loan: 'Education Loan',
  bnpl: 'Buy Now Pay Later',
  borrowed: 'Borrowed Money',
  other: 'Other Debt',
};

const debtTypeOptions: Array<{ value: DebtAccountType; label: string; icon: string }> = [
  { value: 'credit_card', label: debtTypeLabels.credit_card, icon: 'credit_card' },
  { value: 'personal_loan', label: debtTypeLabels.personal_loan, icon: 'payments' },
  { value: 'home_loan', label: debtTypeLabels.home_loan, icon: 'home' },
  { value: 'vehicle_loan', label: debtTypeLabels.vehicle_loan, icon: 'directions_car' },
  { value: 'education_loan', label: debtTypeLabels.education_loan, icon: 'school' },
  { value: 'bnpl', label: debtTypeLabels.bnpl, icon: 'shopping_bag' },
  { value: 'borrowed', label: debtTypeLabels.borrowed, icon: 'handshake' },
  { value: 'other', label: debtTypeLabels.other, icon: 'account_balance' },
];

@Component({
  selector: 'app-debts',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    Loader,
  ],
  providers: [DatePipe],
  templateUrl: './debts.html',
  styleUrl: './debts.scss',
})
export class Debts implements OnInit {
  private readonly debtApi = inject(DebtApiService);
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly datePipe = inject(DatePipe);

  protected readonly accounts = signal<DebtAccount[]>([]);
  protected readonly summary = signal({ totalDebt: 0, creditCardDebt: 0 });
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly countries = signal<Country[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  protected activeDebtCount(): number {
    return this.accounts().filter((account) => account.status === 'active').length;
  }

  protected typeLabel(type: DebtAccountType): string {
    return debtTypeLabels[type];
  }

  protected typeIcon(type: DebtAccountType): string {
    return debtTypeOptions.find((option) => option.value === type)?.icon ?? 'account_balance';
  }

  protected currencyCode(account?: DebtAccount): string {
    return account?.country?.currency?.code ?? 'INR';
  }

  protected creditUsage(account: DebtAccount): number {
    if (!account.creditLimit) return 0;
    return Math.min((account.currentBalance / account.creditLimit) * 100, 100);
  }

  protected dueLabel(account: DebtAccount): string {
    const pieces = [];
    if (account.emiAmount) pieces.push(`EMI ${this.formatAmount(account.emiAmount, account)}`);
    if (account.dueDay) pieces.push(`Due day ${account.dueDay}`);
    return pieces.join(' - ');
  }

  protected updatedLabel(account: DebtAccount): string {
    return this.datePipe.transform(account.updatedAt, 'MMM d, y') ?? '';
  }

  protected addDebt(): void {
    this.dialog.open(DebtAccountDialog, {
      width: '620px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: {
        countries: this.countries(),
        paymentMethods: this.paymentMethods(),
      },
    }).afterClosed().pipe(take(1)).subscribe((payload?: DebtAccountPayload) => {
      if (!payload) return;
      this.saving.set(true);
      this.debtApi.createDebtAccount(payload).pipe(
        take(1),
        finalize(() => this.saving.set(false))
      ).subscribe({
        next: () => {
          this.snackBar.open('Debt account added', 'Close', { duration: 2500 });
          this.loadDebtAccounts();
        },
        error: (error) => this.snackBar.open(error?.error?.message ?? 'Could not add debt account', 'Close', { duration: 3000 }),
      });
    });
  }

  protected recordPayment(account: DebtAccount): void {
    this.dialog.open(DebtPaymentDialog, {
      width: '440px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: { account },
    }).afterClosed().pipe(take(1)).subscribe((payload?: DebtTransactionPayload) => {
      if (!payload) return;
      this.saving.set(true);
      this.debtApi.recordPayment(account._id, payload).pipe(
        take(1),
        finalize(() => this.saving.set(false))
      ).subscribe({
        next: () => {
          this.snackBar.open('Payment recorded', 'Close', { duration: 2500 });
          this.loadDebtAccounts();
        },
        error: (error) => this.snackBar.open(error?.error?.message ?? 'Could not record payment', 'Close', { duration: 3000 }),
      });
    });
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      debts: this.debtApi.getDebtAccounts(),
      paymentMethods: this.expenseApi.getPaymentMethods(),
      countries: this.expenseApi.getUniqueCurrencyCountries(),
    }).pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ debts, paymentMethods, countries }) => {
        this.accounts.set(debts.data.accounts ?? []);
        this.summary.set(debts.data.summary ?? { totalDebt: 0, creditCardDebt: 0 });
        this.paymentMethods.set(paymentMethods.data.paymentMethods ?? []);
        this.countries.set(countries.data.countries ?? []);
      },
      error: () => this.snackBar.open('Could not load debt details', 'Close', { duration: 2500 }),
    });
  }

  private loadDebtAccounts(): void {
    this.loading.set(true);
    this.debtApi.getDebtAccounts().pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.accounts.set(response.data.accounts ?? []);
        this.summary.set(response.data.summary ?? { totalDebt: 0, creditCardDebt: 0 });
      },
      error: () => this.snackBar.open('Could not refresh debt details', 'Close', { duration: 2500 }),
    });
  }

  private formatAmount(amount: number, account: DebtAccount): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: this.currencyCode(account),
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

@Component({
  selector: 'app-debt-account-dialog',
  imports: [
    CommonModule,
    ScrollingModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Add Debt Account</h2>
    <mat-dialog-content>
      <form class="debt-dialog-form" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Debt type</mat-label>
          <mat-select formControlName="type">
            @for (option of debtTypes; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <mat-icon matPrefix aria-hidden="true">account_balance</mat-icon>
          <input matInput formControlName="name" placeholder="e.g. HDFC credit card" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Source / lender</mat-label>
          <input matInput formControlName="source" placeholder="Bank, app, person, or lender" />
        </mat-form-field>

        @if (form.controls.type.value === 'credit_card') {
          <mat-form-field appearance="outline">
            <mat-label>Linked credit card payment method</mat-label>
            <mat-select formControlName="paymentMethod">
              @for (method of creditCardMethods(); track method._id) {
                <mat-option [value]="method._id">{{ method.nickname || method.name }}</mat-option>
              } @empty {
                <mat-option disabled>No credit card payment methods yet</mat-option>
              }
            </mat-select>
            <mat-hint>Only payment methods saved as Credit Card are shown.</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Currency</mat-label>
          <mat-icon matPrefix aria-hidden="true">search</mat-icon>
          <input
            matInput
            [formControl]="countrySearch"
            [matAutocomplete]="countryAuto"
            placeholder="Search country or currency"
            autocomplete="off"
          />
          <mat-autocomplete
            #countryAuto="matAutocomplete"
            class="country-autocomplete-panel"
            (optionSelected)="selectCountry($event)"
          >
            <cdk-virtual-scroll-viewport itemSize="52" class="country-viewport">
              <mat-option *cdkVirtualFor="let country of filteredCountries()" [value]="country">
                <span
                  class="country-option"
                  [title]="(country.currency?.symbol || '') + ' - ' + (country.currency?.code || country.iso3 || country.name) + ' (' + (country.currency?.name || country.name) + ')'"
                >
                  <span class="country-option__symbol">{{ country.currency?.symbol || country.emoji }}</span>
                  <span class="country-option__details">
                    <strong>{{ country.currency?.code || country.iso3 || country.name }}</strong>
                    <span>{{ country.currency?.name || country.name }}</span>
                  </span>
                </span>
              </mat-option>
            </cdk-virtual-scroll-viewport>
          </mat-autocomplete>
          @if (form.controls.country.hasError('required') && countrySearch.touched) {
            <mat-error>Currency is required</mat-error>
          }
        </mat-form-field>

        <div class="dialog-grid">
          <mat-form-field appearance="outline">
            <mat-label>Current balance</mat-label>
            <input matInput type="number" formControlName="openingBalance" placeholder="0.00" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Credit limit</mat-label>
            <input matInput type="number" formControlName="creditLimit" placeholder="Optional" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Interest %</mat-label>
            <input matInput type="number" formControlName="interestRate" placeholder="Optional" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>EMI amount</mat-label>
            <input matInput type="number" formControlName="emiAmount" placeholder="Optional" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Due day</mat-label>
            <input matInput type="number" formControlName="dueDay" placeholder="1-31" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="button" (click)="submit()">Add Debt</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .debt-dialog-form {
      display: grid;
      gap: 12px;
      padding-top: 4px;
    }

    .dialog-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    @media (max-width: 560px) {
      .dialog-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
class DebtAccountDialog {
  protected readonly debtTypes = debtTypeOptions;
  protected readonly countrySearch = new FormControl('', { nonNullable: true });
  protected readonly countrySearchTerm = signal('');
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    type: new FormControl<DebtAccountType>('credit_card', { nonNullable: true, validators: [Validators.required] }),
    source: new FormControl('', { nonNullable: true }),
    paymentMethod: new FormControl('', { nonNullable: true }),
    country: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    openingBalance: new FormControl<number | null>(null, [Validators.min(0)]),
    creditLimit: new FormControl<number | null>(null, [Validators.min(0)]),
    interestRate: new FormControl<number | null>(null, [Validators.min(0)]),
    emiAmount: new FormControl<number | null>(null, [Validators.min(0)]),
    dueDay: new FormControl<number | null>(null, [Validators.min(1), Validators.max(31)]),
    notes: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly dialogRef: MatDialogRef<DebtAccountDialog>,
    @Inject(MAT_DIALOG_DATA) protected readonly data: { countries: Country[]; paymentMethods: PaymentMethod[] }
  ) {}

  ngOnInit(): void {
    this.countrySearch.valueChanges.subscribe((value) => {
      this.countrySearchTerm.set(value);
      const selectedCountry = this.data.countries.find((country) => country._id === this.form.controls.country.value);
      if (selectedCountry && value !== getCountryCurrencyLabel(selectedCountry)) {
        this.form.controls.country.setValue('');
      }
    });
    this.setDefaultCountry();
  }

  protected creditCardMethods(): PaymentMethod[] {
    return this.data.paymentMethods.filter((method) => method.type === 'credit_card');
  }

  protected filteredCountries(): Country[] {
    return filterCurrencyCountries(this.data.countries, this.countrySearchTerm());
  }

  protected selectCountry(event: MatAutocompleteSelectedEvent): void {
    const country = event.option.value as Country;
    this.form.controls.country.setValue(country._id);
    const countryLabel = getCountryCurrencyLabel(country);
    this.countrySearch.setValue(countryLabel, { emitEvent: false });
    this.countrySearchTerm.set(countryLabel);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.country.invalid) this.countrySearch.markAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      name: raw.name.trim(),
      type: raw.type,
      source: raw.source.trim() || undefined,
      paymentMethod: raw.type === 'credit_card' ? raw.paymentMethod || undefined : undefined,
      country: raw.country || undefined,
      openingBalance: Number(raw.openingBalance ?? 0),
      creditLimit: this.optionalNumber(raw.creditLimit),
      interestRate: this.optionalNumber(raw.interestRate),
      emiAmount: this.optionalNumber(raw.emiAmount),
      dueDay: this.optionalNumber(raw.dueDay),
      notes: raw.notes.trim() || undefined,
    } satisfies DebtAccountPayload);
  }

  private optionalNumber(value: number | null): number | undefined {
    if (value === null || value === undefined || value === 0) return undefined;
    return Number(value);
  }

  private setDefaultCountry(): void {
    const country = getDefaultCurrencyCountry(this.data.countries);
    if (!country) return;

    const countryLabel = getCountryCurrencyLabel(country);
    this.form.controls.country.setValue(country._id);
    this.countrySearch.setValue(countryLabel, { emitEvent: false });
    this.countrySearchTerm.set(countryLabel);
  }
}

@Component({
  selector: 'app-debt-payment-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>Record Payment</h2>
    <mat-dialog-content>
      <form class="debt-dialog-form" [formGroup]="form">
        <p class="dialog-note">This will reduce the balance for {{ data.account.name }}.</p>

        <mat-form-field appearance="outline">
          <mat-label>Amount</mat-label>
          <mat-icon matPrefix aria-hidden="true">payments</mat-icon>
          <input matInput type="number" formControlName="amount" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input
            matInput
            formControlName="date"
            [matDatepicker]="paymentDatePicker"
            [max]="today"
            readonly
            (click)="paymentDatePicker.open()"
            (focus)="paymentDatePicker.open()"
          />
          <mat-datepicker-toggle matIconSuffix [for]="paymentDatePicker"></mat-datepicker-toggle>
          <mat-datepicker #paymentDatePicker panelClass="debt-payment-datepicker-panel"></mat-datepicker>
          @if (form.controls.date.hasError('required')) {
            <mat-error>Payment date is required</mat-error>
          } @else if (form.controls.date.hasError('matDatepickerMax')) {
            <mat-error>Payment date cannot be in the future</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" placeholder="EMI, card bill, part payment..." />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="button" (click)="submit()">Save Payment</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .debt-dialog-form {
      display: grid;
      gap: 12px;
      padding-top: 4px;
    }

    .dialog-note {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `],
})
class DebtPaymentDialog {
  protected readonly today = new Date();
  protected readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    date: new FormControl<Date | null>(this.today, [Validators.required]),
    description: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly dialogRef: MatDialogRef<DebtPaymentDialog>,
    @Inject(MAT_DIALOG_DATA) protected readonly data: { account: DebtAccount }
  ) {}

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      amount: Number(raw.amount),
      date: formatDateOnly(raw.date ?? new Date()),
      description: raw.description.trim() || undefined,
    } satisfies DebtTransactionPayload);
  }
}
