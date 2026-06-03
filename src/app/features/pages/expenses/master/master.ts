import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, EMPTY, finalize, forkJoin, merge, startWith, take } from 'rxjs';
import { ExpenseApiService } from 'app/core/services/apis/expense.service';
import { Loader } from 'app/core/shared/components/loader/loader';
import { Category, Expense, PaymentMethod } from 'app/core/shared/types/expense.model';

@Component({
  selector: 'app-expenses-master',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSortModule,
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

  protected readonly displayedColumns = [
    'select',
    'date',
    'description',
    'category',
    'paymentMethod',
    'amount',
    'actions',
  ];

  protected readonly expenses = signal<Expense[]>([]);
  protected readonly totalExpenses = signal(0);
  protected readonly loading = signal(false);
  protected readonly referencesLoading = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly categoryControl = new FormControl('', { nonNullable: true });
  protected readonly paymentMethodControl = new FormControl('', { nonNullable: true });

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
      this.paymentMethodControl.valueChanges
    ).subscribe(() => {
      if (this.paginator) this.paginator.pageIndex = 0;
    });

    merge(
      this.searchControl.valueChanges.pipe(debounceTime(1000), distinctUntilChanged()),
      this.categoryControl.valueChanges,
      this.paymentMethodControl.valueChanges,
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
    if (this.paginator) this.paginator.pageIndex = 0;
    this.loadExpenses();
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
    }).pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.expenses.set(response.data.expenses);
        this.totalExpenses.set(response.data.pagination.total);
      },
      error: () => {
        this.expenses.set([]);
        this.totalExpenses.set(0);
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
}
