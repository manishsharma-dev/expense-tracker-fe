import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, take } from 'rxjs';
import { ExpenseApiService } from 'app/core/services/apis/expense.service';
import {
  ExpenseReferenceDialog,
  ExpenseReferenceDialogResult,
} from 'app/core/shared/components/expense-reference-dialog/expense-reference-dialog';
import { Loader } from 'app/core/shared/components/loader/loader';
import { Category, Country, PaymentMethod, SubCategory } from 'app/core/shared/types/expense.model';

type ExpenseForm = {
  description: FormControl<string>;
  amount: FormControl<number | null>;
  country: FormControl<string>;
  date: FormControl<Date | null>;
  category: FormControl<string>;
  subCategory: FormControl<string>;
  paymentMethod: FormControl<string>;
  notes: FormControl<string>;
};

@Component({
  selector: 'app-create',
  imports: [
    RouterLink,
    ScrollingModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule,
    Loader,
  ],
  templateUrl: './create.html',
  styleUrl: './create.scss',
})
export class Create implements OnInit {
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly categories = signal<Category[]>([]);
  protected readonly subCategories = signal<SubCategory[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly countries = signal<Country[]>([]);
  protected readonly countrySearch = new FormControl('', { nonNullable: true });
  protected readonly countrySearchTerm = signal('');
  protected readonly selectedReceipt = signal<File | null>(null);
  protected readonly selectedCategory = signal('');
  protected readonly saving = signal(false);
  protected readonly loadingReferences = signal(false);
  protected readonly referenceActionLoading = signal(false);
  protected readonly loadingText = signal('Loading...');

  protected readonly form = new FormGroup<ExpenseForm>({
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    country: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl<Date | null>(new Date(), [Validators.required]),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subCategory: new FormControl('', { nonNullable: true }),
    paymentMethod: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', { nonNullable: true }),
  });

  protected readonly filteredSubCategories = computed(() => {
    const selectedCategory = this.selectedCategory();
    return this.subCategories().filter((subCategory) => this.getCategoryId(subCategory.category) === selectedCategory);
  });

  protected readonly filteredCountries = computed(() => {
    const search = this.countrySearchTerm().trim().toLowerCase();
    if (!search) return this.countries();

    return this.countries().filter((country) => {
      const currencyCode = country.currency?.code ?? '';
      const currencyName = country.currency?.name ?? '';
      return `${country.name} ${country.iso2} ${country.iso3} ${currencyCode} ${currencyName}`
        .toLowerCase()
        .includes(search);
    });
  });

  ngOnInit(): void {
    this.loadReferences();
    this.form.controls.category.valueChanges.subscribe(() => {
      this.selectedCategory.set(this.form.controls.category.value);
      this.form.controls.subCategory.setValue('');
    });
    this.countrySearch.valueChanges.subscribe((value) => {
      this.countrySearchTerm.set(value);
      const selectedCountry = this.countries().find((country) => country._id === this.form.controls.country.value);
      if (selectedCountry && value !== this.getCountryLabel(selectedCountry)) {
        this.form.controls.country.setValue('');
      }
    });
  }

  protected selectCategory(categoryId: string): void {
    this.form.controls.category.setValue(categoryId);
    this.selectedCategory.set(categoryId);
  }

  protected onReceiptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedReceipt.set(input.files?.[0] ?? null);
  }

  protected selectCountry(event: MatAutocompleteSelectedEvent): void {
    const country = event.option.value as Country;
    this.form.controls.country.setValue(country._id);
    this.countrySearch.setValue(this.getCountryLabel(country), { emitEvent: false });
    this.countrySearchTerm.set(this.getCountryLabel(country));
  }

  protected getCountryLabel(country: Country): string {
    const currencyCode = country.currency?.code ?? country.iso3;
    const currencyName = country.currency?.name;
    const currencySymbol = country.currency?.symbol;
    const prefix = currencySymbol ? `${currencySymbol} - ${currencyCode}` : currencyCode;
    return currencyName ? `${prefix} (${currencyName})` : `${prefix} (${country.name})`;
  }

  protected addCategory(): void {
    this.dialog.open(ExpenseReferenceDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: {
        title: 'Add Category',
        description: 'Create a custom expense category for your account.',
        nameLabel: 'Category name',
        submitText: 'Add Category',
        defaultIcon: 'category',
        defaultColor: 'neutral',
        existingNames: this.categories().map((category) => category.name),
      },
    }).afterClosed().pipe(take(1)).subscribe((result?: ExpenseReferenceDialogResult) => {
      if (!result) return;

      this.loadingText.set('Creating category...');
      this.referenceActionLoading.set(true);
      this.expenseApi.createCategory(result).pipe(
        take(1),
        finalize(() => this.referenceActionLoading.set(false))
      ).subscribe({
        next: (response) => this.addCreatedCategory(response.data.category),
        error: () => this.snackBar.open('Could not create category', 'Close', { duration: 2500 }),
      });
    });
  }

  protected addSubCategory(): void {
    const category = this.form.controls.category.value;
    if (!category) {
      this.snackBar.open('Select a category first', 'Close', { duration: 2500 });
      return;
    }

    const categoryName = this.categories().find((item) => item._id === category)?.name;
    const existingNames = this.subCategories()
      .filter((subCategory) => this.getCategoryId(subCategory.category) === category)
      .map((subCategory) => subCategory.name);

    this.dialog.open(ExpenseReferenceDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: {
        title: 'Add Sub Category',
        description: `Create a sub category${categoryName ? ` under ${categoryName}` : ''}.`,
        nameLabel: 'Sub category name',
        submitText: 'Add Sub Category',
        defaultIcon: 'label',
        defaultColor: this.categories().find((item) => item._id === category)?.color ?? 'neutral',
        existingNames,
      },
    }).afterClosed().pipe(take(1)).subscribe((result?: ExpenseReferenceDialogResult) => {
      if (!result) return;

      this.loadingText.set('Creating sub category...');
      this.referenceActionLoading.set(true);
      this.expenseApi.createSubCategory({ ...result, category }).pipe(
        take(1),
        finalize(() => this.referenceActionLoading.set(false))
      ).subscribe({
        next: (response) => this.addCreatedSubCategory(response.data.subCategory),
        error: () => this.snackBar.open('Could not create sub category', 'Close', { duration: 2500 }),
      });
    });
  }

  protected addPaymentMethod(): void {
    const name = window.prompt('Payment method name');
    if (!name?.trim()) return;

    this.loadingText.set('Creating payment method...');
    this.referenceActionLoading.set(true);
    this.expenseApi.createPaymentMethod({ name: name.trim(), type: 'other', icon: 'payments' })
      .pipe(
        take(1),
        finalize(() => this.referenceActionLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          const paymentMethod = response.data.paymentMethod;
          if (!paymentMethod) return;
          this.paymentMethods.update((paymentMethods) => [...paymentMethods, paymentMethod]);
          this.form.controls.paymentMethod.setValue(paymentMethod._id);
        },
        error: () => this.snackBar.open('Could not create payment method', 'Close', { duration: 2500 }),
      });
  }

  protected saveExpense(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.country.invalid) this.countrySearch.markAsTouched();
      return;
    }

    const payload = this.buildExpensePayload();
    this.loadingText.set('Saving expense...');
    this.saving.set(true);
    this.expenseApi.createExpense(payload).pipe(
      take(1),
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: () => {
        this.snackBar.open('Expense added', 'Close', { duration: 2500 });
        this.router.navigate(['/expenses']);
      },
      error: () => {
        this.snackBar.open('Could not add expense', 'Close', { duration: 2500 });
      },
    });
  }

  private loadReferences(): void {
    this.loadingText.set('Loading expense details...');
    this.loadingReferences.set(true);
    forkJoin({
      categories: this.expenseApi.getCategories(),
      subCategories: this.expenseApi.getSubCategories(),
      paymentMethods: this.expenseApi.getPaymentMethods(),
      countries: this.expenseApi.getCountries(),
    }).pipe(
      take(1),
      finalize(() => this.loadingReferences.set(false))
    ).subscribe({
      next: ({ categories, subCategories, paymentMethods, countries }) => {
        this.categories.set(categories.data.categories ?? []);
        this.subCategories.set(subCategories.data.subCategories ?? []);
        this.paymentMethods.set(paymentMethods.data.paymentMethods ?? []);
        this.countries.set(countries.data.countries ?? []);
      },
      error: () => this.snackBar.open('Could not load expense details', 'Close', { duration: 2500 }),
    });
  }

  private addCreatedCategory(category: Category | undefined): void {
    if (!category) return;
    this.categories.update((categories) => [...categories, category]);
    this.form.controls.category.setValue(category._id);
  }

  private addCreatedSubCategory(subCategory: SubCategory | undefined): void {
    if (!subCategory) return;
    this.subCategories.update((subCategories) => [...subCategories, subCategory]);
    this.form.controls.subCategory.setValue(subCategory._id);
  }

  private buildExpensePayload(): FormData {
    const raw = this.form.getRawValue();
    const formData = new FormData();
    formData.append('description', raw.description);
    formData.append('amount', String(raw.amount));
    formData.append('date', raw.date?.toISOString() ?? new Date().toISOString());
    formData.append('category', raw.category);
    formData.append('paymentMethod', raw.paymentMethod);
    formData.append('country', raw.country);
    if (raw.subCategory) formData.append('subCategory', raw.subCategory);
    if (raw.notes) formData.append('notes', raw.notes);
    if (this.selectedReceipt()) formData.append('receipt', this.selectedReceipt() as File);
    return formData;
  }

  private getCategoryId(category: string | Category): string {
    if(!category) return '';
    return  typeof category === 'string' ? category : category._id;
  }

}
