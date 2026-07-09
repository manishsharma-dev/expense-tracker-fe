import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, EMPTY, finalize, forkJoin, merge, startWith, take } from 'rxjs';
import { ExpenseApiService } from 'app/core/services/apis/expense.service';
import { ConfirmDialog } from 'app/core/shared/components/confirm-dialog/confirm-dialog';
import { Loader } from 'app/core/shared/components/loader/loader';
import { Category, Expense, PaymentMethod } from 'app/core/shared/types/expense.model';
import { formatDateOnly } from 'app/core/shared/utils/date';
import { ReceiptPreviewDialog } from './receipt-preview-dialog';

@Component({
  selector: 'app-expenses-master',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSortModule,
    MatSnackBarModule,
    MatTableModule,
    Loader,
  ],
  providers: [DatePipe],
  templateUrl: './master.html',
  styleUrl: './master.scss',
})
export class Master implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) protected paginator?: MatPaginator;
  @ViewChild(MatSort) private sort?: MatSort;

  private readonly expenseApi = inject(ExpenseApiService);
  private readonly datePipe = inject(DatePipe);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly displayedColumns = [
    'date',
    'description',
    'category',
    'paymentMethod',
    'receipt',
    'amount',
    'actions',
  ];

  protected readonly expenses = signal<Expense[]>([]);
  protected readonly totalExpenses = signal(0);
  protected readonly totalExpenseAmount = signal(0);
  protected readonly loading = signal(false);
  protected readonly deleting = signal(false);
  protected readonly referencesLoading = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly categoryControl = new FormControl('', { nonNullable: true });
  protected readonly paymentMethodControl = new FormControl('', { nonNullable: true });
  protected readonly startDateControl = new FormControl<Date>(this.currentMonthStart(), { nonNullable: true });
  protected readonly endDateControl = new FormControl<Date>(new Date(), { nonNullable: true });
  protected readonly maxDate = new Date();

  ngOnInit(): void {
    this.loadReferences();
  }

  ngAfterViewInit(): void {
    const sortChange$ = this.sort ? this.sort.sortChange.asObservable() : EMPTY;
    const paginatorPage$ = this.paginator ? this.paginator.page.asObservable() : EMPTY;

    this.sort?.sortChange.subscribe(() => {
      if (this.paginator) this.paginator.pageIndex = 0;
    });
    merge(
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.categoryControl.valueChanges,
      this.paymentMethodControl.valueChanges,
      this.startDateControl.valueChanges,
      this.endDateControl.valueChanges
    ).subscribe(() => {
      if (this.paginator) this.paginator.pageIndex = 0;
    });

    merge(
      this.searchControl.valueChanges.pipe(debounceTime(1000), distinctUntilChanged()),
      this.categoryControl.valueChanges,
      this.paymentMethodControl.valueChanges,
      this.startDateControl.valueChanges,
      this.endDateControl.valueChanges,
      sortChange$,
      paginatorPage$
    ).pipe(startWith(null)).subscribe(() => {
      this.loadExpenses();
    });
  }

  protected resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.categoryControl.setValue('', { emitEvent: false });
    this.paymentMethodControl.setValue('', { emitEvent: false });
    this.startDateControl.setValue(this.currentMonthStart(), { emitEvent: false });
    this.endDateControl.setValue(new Date(), { emitEvent: false });
    if (this.paginator) this.paginator.pageIndex = 0;
    this.loadExpenses();
  }

  protected selectedRangeLabel(): string {
    return `${formatDateOnly(this.startDateControl.value)} to ${formatDateOnly(this.endDateControl.value)}`;
  }

  protected hasInvalidDateRange(): boolean {
    return this.startDateControl.value > this.endDateControl.value;
  }

  protected onMobilePage(direction: 'previous' | 'next'): void {
    if (!this.paginator) return;
    const nextIndex = direction === 'next' ? this.paginator.pageIndex + 1 : this.paginator.pageIndex - 1;
    if (nextIndex < 0 || nextIndex >= this.totalPages()) return;
    this.paginator.pageIndex = nextIndex;
    this.loadExpenses();
  }

  protected formatDate(date: string): string {
    return this.datePipe.transform(date, 'MMM d') ?? '';
  }

  protected formatAmount(amount: number, expense: Expense): string {
    const symbol = expense.country?.currency?.symbol ?? '';
    return `${symbol}${amount.toFixed(2)}`;
  }

  protected categoryName(expense: Expense): string {
    return expense.subCategory?.name
      ? `${expense.category.name} / ${expense.subCategory.name}`
      : expense.category.name;
  }

  protected iconColor(expense: Expense): string {
    return expense.category.color ?? 'neutral';
  }

  protected hasReceipt(expense: Expense): boolean {
    return Boolean(expense.receipt?.viewUrl || expense.receipt?.url || expense.receipt?.path);
  }

  protected openReceipt(expense: Expense): void {
    if (!expense.receipt || !this.hasReceipt(expense)) return;

    this.dialog.open(ReceiptPreviewDialog, {
      width: 'min(920px, calc(100vw - 28px))',
      maxWidth: 'calc(100vw - 28px)',
      autoFocus: false,
      data: { receipt: expense.receipt },
    });
  }

  protected deleteExpense(expense: Expense): void {
    this.dialog.open(ConfirmDialog, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: {
        title: 'Delete Expense',
        message: `Delete "${expense.description}"? This action cannot be undone.`,
        cancelText: 'Cancel',
        confirmText: 'Delete',
        confirmIcon: 'delete',
      },
    }).afterClosed().pipe(take(1)).subscribe((confirmed) => {
      if (!confirmed) return;

      this.deleting.set(true);
      this.expenseApi.deleteExpense(expense._id).pipe(
        take(1),
        finalize(() => this.deleting.set(false))
      ).subscribe({
        next: () => {
          this.snackBar.open('Expense deleted', 'Close', { duration: 2500 });
          this.loadExpenses();
        },
        error: (error) => {
          this.snackBar.open(error?.error?.message ?? 'Could not delete expense', 'Close', { duration: 3000 });
        },
      });
    });
  }

  protected totalPages(): number {
    const pageSize = this.paginator?.pageSize ?? 10;
    return Math.ceil(this.totalExpenses() / pageSize);
  }

  protected pageSummary(): string {
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize = this.paginator?.pageSize ?? 10;
    const total = this.totalExpenses();
    if (!total) return 'Showing 0 expenses';
    const start = pageIndex * pageSize + 1;
    const end = Math.min(start + this.expenses().length - 1, total);
    return `Showing ${start}-${end} out of ${total} expenses`;
  }

  private loadReferences(): void {
    this.referencesLoading.set(true);
    forkJoin({
      categories: this.expenseApi.getCategories(),
      paymentMethods: this.expenseApi.getPaymentMethods(),
    }).pipe(
      take(1),
      finalize(() => this.referencesLoading.set(false))
    ).subscribe(({ categories, paymentMethods }) => {
      this.categories.set(categories.data.categories ?? []);
      this.paymentMethods.set(paymentMethods.data.paymentMethods ?? []);
    });
  }

  private loadExpenses(): void {
    if (this.hasInvalidDateRange()) {
      this.expenses.set([]);
      this.totalExpenses.set(0);
      this.totalExpenseAmount.set(0);
      return;
    }

    const page = (this.paginator?.pageIndex ?? 0) + 1;
    const limit = this.paginator?.pageSize ?? 10;
    const sort = this.currentSort();

    this.loading.set(true);
    this.expenseApi.getExpenses({
      page,
      limit,
      search: this.searchControl.value.trim(),
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
      category: this.categoryControl.value,
      paymentMethod: this.paymentMethodControl.value,
      startDate: formatDateOnly(this.startDateControl.value),
      endDate: formatDateOnly(this.endDateControl.value),
    }).pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.expenses.set(response.data.expenses);
        this.totalExpenses.set(response.data.pagination.total);
        this.totalExpenseAmount.set(response.data.summary?.totalAmount ?? 0);
      },
      error: () => {
        this.expenses.set([]);
        this.totalExpenses.set(0);
        this.totalExpenseAmount.set(0);
      },
    });
  }

  private currentSort(): { sortBy: string; sortOrder: 'asc' | 'desc' } {
    const active = this.sort?.active || 'date';
    const direction = this.sort?.direction || 'desc';
    return {
      sortBy: active,
      sortOrder: direction === 'asc' ? 'asc' : 'desc',
    };
  }

  private currentMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
