import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
import { ConfirmDialog } from 'app/core/shared/components/confirm-dialog/confirm-dialog';
import { Loader } from 'app/core/shared/components/loader/loader';
import { Category, Country, PaymentMethod, PaymentProvider, SubCategory } from 'app/core/shared/types/expense.model';
import {
  filterCurrencyCountries,
  getCountryCurrencyLabel,
  getDefaultCurrencyCountry,
} from 'app/core/shared/utils/country-currency';
import { formatDateOnly } from 'app/core/shared/utils/date';
import { PaymentMethodDialog, PaymentMethodDialogResult } from './payment-method-dialog';

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
    DragDropModule,
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
export class Create implements OnInit, OnDestroy {
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private receiptObjectUrl: string | null = null;

  protected readonly categories = signal<Category[]>([]);
  protected readonly subCategories = signal<SubCategory[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly paymentProviders = signal<PaymentProvider[]>([]);
  protected readonly countries = signal<Country[]>([]);
  protected readonly countrySearch = new FormControl('', { nonNullable: true });
  protected readonly countrySearchTerm = signal('');
  protected readonly selectedReceipt = signal<File | null>(null);
  protected readonly receiptPreviewUrl = signal<string | null>(null);
  protected readonly receiptPreviewSafeUrl = signal<SafeResourceUrl | null>(null);
  protected readonly receiptPreviewType = signal<'image' | 'pdf' | null>(null);
  protected readonly selectedCategory = signal('');
  protected readonly saving = signal(false);
  protected readonly loadingReferences = signal(false);
  protected readonly referenceActionLoading = signal(false);
  protected readonly loadingText = signal('Loading...');
  protected readonly maxExpenseDate = new Date();

  protected readonly form = new FormGroup<ExpenseForm>({
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    country: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl<Date | null>(this.maxExpenseDate, [Validators.required]),
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
    return filterCurrencyCountries(this.countries(), this.countrySearchTerm());
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
      if (selectedCountry && value !== getCountryCurrencyLabel(selectedCountry)) {
        this.form.controls.country.setValue('');
      }
    });
  }

  ngOnDestroy(): void {
    this.clearReceiptPreview();
  }

  protected selectCategory(categoryId: string): void {
    this.form.controls.category.setValue(categoryId);
    this.selectedCategory.set(categoryId);
  }

  protected onReceiptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setReceipt(input.files?.[0] ?? null);
  }

  protected removeReceipt(input?: HTMLInputElement, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (input) input.value = '';
    this.setReceipt(null);
  }

  protected selectCountry(event: MatAutocompleteSelectedEvent): void {
    const country = event.option.value as Country;
    this.form.controls.country.setValue(country._id);
    const countryLabel = getCountryCurrencyLabel(country);
    this.countrySearch.setValue(countryLabel, { emitEvent: false });
    this.countrySearchTerm.set(countryLabel);
  }

  protected getPaymentMethodTypeLabel(type: PaymentMethod['type']): string {
    const labels: Record<PaymentMethod['type'], string> = {
      cash: 'Cash',
      card: 'Card',
      debit_card: 'Debit Card',
      credit_card: 'Credit Card',
      upi: 'UPI',
      bank: 'Bank',
      wallet: 'Wallet',
      other: 'Other',
    };

    return labels[type] ?? 'Other';
  }

  protected getPaymentMethodDetail(method: PaymentMethod): string {
    const parts = [
      method.provider?.name,
      method.lastFour ? `•••• ${method.lastFour}` : '',
      method.upiId,
    ].filter(Boolean);

    return parts.join(' • ') || this.getPaymentMethodTypeLabel(method.type);
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
    this.openPaymentMethodDialog();
  }

  protected editPaymentMethod(paymentMethod: PaymentMethod, event?: Event): void {
    event?.stopPropagation();
    this.openPaymentMethodDialog(paymentMethod);
  }

  protected deletePaymentMethod(paymentMethod: PaymentMethod, event?: Event): void {
    event?.stopPropagation();

    this.dialog.open(ConfirmDialog, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: 'Delete Payment Method',
        message: `Delete ${paymentMethod.name}? This payment method will no longer be available for new expenses.`,
        cancelText: 'Cancel',
        confirmText: 'Delete',
        confirmIcon: 'delete',
      },
    }).afterClosed().pipe(take(1)).subscribe((confirmed) => {
      if (!confirmed) return;

      this.loadingText.set('Deleting payment method...');
      this.referenceActionLoading.set(true);
      this.expenseApi.deletePaymentMethod(paymentMethod._id).pipe(
        take(1),
        finalize(() => this.referenceActionLoading.set(false))
      ).subscribe({
        next: () => {
          this.paymentMethods.update((paymentMethods) =>
            paymentMethods.filter((item) => item._id !== paymentMethod._id)
          );
          if (this.form.controls.paymentMethod.value === paymentMethod._id) {
            this.form.controls.paymentMethod.setValue('');
          }
          this.snackBar.open('Payment method deleted', 'Close', { duration: 2500 });
        },
        error: () => this.snackBar.open('Could not delete payment method', 'Close', { duration: 2500 }),
      });
    });
  }

  protected reorderPaymentMethods(event: CdkDragDrop<PaymentMethod[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const previousPaymentMethods = this.paymentMethods();
    const reorderedPaymentMethods = [...previousPaymentMethods];
    moveItemInArray(reorderedPaymentMethods, event.previousIndex, event.currentIndex);

    const sequencedPaymentMethods = reorderedPaymentMethods.map((paymentMethod, index) => ({
      ...paymentMethod,
      sequence: index + 1,
    }));

    this.paymentMethods.set(sequencedPaymentMethods);
    this.loadingText.set('Updating payment method order...');
    this.referenceActionLoading.set(true);
    this.expenseApi.updatePaymentMethodSequence(
      sequencedPaymentMethods.map((paymentMethod, index) => ({ id: paymentMethod._id, sequence: index + 1 }))
    ).pipe(
      take(1),
      finalize(() => this.referenceActionLoading.set(false))
    ).subscribe({
      next: (response) => {
        this.paymentMethods.set(response.data.paymentMethods ?? sequencedPaymentMethods);
      },
      error: () => {
        this.paymentMethods.set(previousPaymentMethods);
        this.snackBar.open('Could not update payment method order', 'Close', { duration: 2500 });
      },
    });
  }

  private openPaymentMethodDialog(paymentMethod?: PaymentMethod): void {
    if (!this.paymentProviders().length) {
      this.snackBar.open('Could not load payment providers', 'Close', { duration: 2500 });
      return;
    }

    this.dialog.open(PaymentMethodDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: {
        paymentMethod,
        paymentProviders: this.paymentProviders(),
        existingNames: this.paymentMethods().map((item) => item.name),
      },
    }).afterClosed().pipe(take(1)).subscribe((result?: PaymentMethodDialogResult) => {
      if (!result) return;

      paymentMethod ? this.updatePaymentMethod(paymentMethod, result) : this.createPaymentMethod(result);
    });
  }

  private createPaymentMethod(result: PaymentMethodDialogResult): void {
    this.loadingText.set('Creating payment method...');
    this.referenceActionLoading.set(true);
    this.expenseApi.createPaymentMethod(result)
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

  private updatePaymentMethod(paymentMethod: PaymentMethod, result: PaymentMethodDialogResult): void {
    this.loadingText.set('Updating payment method...');
    this.referenceActionLoading.set(true);
    this.expenseApi.updatePaymentMethod(paymentMethod._id, result)
      .pipe(
        take(1),
        finalize(() => this.referenceActionLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          const updatedPaymentMethod = response.data.paymentMethod;
          if (!updatedPaymentMethod) return;
          this.paymentMethods.update((paymentMethods) =>
            paymentMethods.map((item) => item._id === updatedPaymentMethod._id ? updatedPaymentMethod : item)
          );
          this.form.controls.paymentMethod.setValue(updatedPaymentMethod._id);
        },
        error: () => this.snackBar.open('Could not update payment method', 'Close', { duration: 2500 }),
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
      paymentProviders: this.expenseApi.getPaymentProviders(),
      paymentMethods: this.expenseApi.getPaymentMethods(),
      countries: this.expenseApi.getUniqueCurrencyCountries(),
    }).pipe(
      take(1),
      finalize(() => this.loadingReferences.set(false))
    ).subscribe({
      next: ({ categories, subCategories, paymentProviders, paymentMethods, countries }) => {
        const loadedCountries = countries.data.countries ?? [];
        this.categories.set(categories.data.categories ?? []);
        this.subCategories.set(subCategories.data.subCategories ?? []);
        this.paymentProviders.set(paymentProviders.data.paymentProviders ?? []);
        this.paymentMethods.set(paymentMethods.data.paymentMethods ?? []);
        this.countries.set(loadedCountries);
        this.setDefaultCountryFromBrowser(loadedCountries);
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
    formData.append('date', formatDateOnly(raw.date ?? new Date()));
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

  private setDefaultCountryFromBrowser(countries: Country[]): void {
    if (this.form.controls.country.value || !countries.length) return;

    const country = getDefaultCurrencyCountry(countries);
    if (!country) return;

    const countryLabel = getCountryCurrencyLabel(country);
    this.form.controls.country.setValue(country._id);
    this.countrySearch.setValue(countryLabel, { emitEvent: false });
    this.countrySearchTerm.set(countryLabel);
  }

  private setReceipt(file: File | null): void {
    this.clearReceiptPreview();
    this.selectedReceipt.set(file);
    if (!file) return;

    const previewType = file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : null;
    this.receiptPreviewType.set(previewType);
    if (!previewType) return;

    this.receiptObjectUrl = URL.createObjectURL(file);
    this.receiptPreviewUrl.set(this.receiptObjectUrl);
    this.receiptPreviewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.receiptObjectUrl));
  }

  private clearReceiptPreview(): void {
    if (this.receiptObjectUrl && typeof URL !== 'undefined' && 'revokeObjectURL' in URL) {
      URL.revokeObjectURL(this.receiptObjectUrl);
    }

    this.receiptObjectUrl = null;
    this.receiptPreviewUrl.set(null);
    this.receiptPreviewSafeUrl.set(null);
    this.receiptPreviewType.set(null);
  }

}
