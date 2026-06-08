import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, forkJoin, take } from 'rxjs';
import { BudgetApiService } from 'app/core/services/apis/budget.service';
import { ExpenseApiService } from 'app/core/services/apis/expense.service';
import { Loader } from 'app/core/shared/components/loader/loader';
import { Budget as BudgetModel } from 'app/core/shared/types/budget.model';
import { Category } from 'app/core/shared/types/expense.model';

type BudgetAllocationForm = FormGroup<{
  categoryId: FormControl<string>;
  selected: FormControl<boolean>;
  amount: FormControl<number | null>;
}>;

@Component({
  selector: 'app-budget',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
    Loader,
  ],
  templateUrl: './budget.html',
  styleUrl: './budget.scss',
})
export class Budget implements OnInit {
  private readonly budgetApi = inject(BudgetApiService);
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly categories = signal<Category[]>([]);
  protected readonly budget = signal<BudgetModel | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly currentMonth = this.getCurrentMonth();

  protected readonly form = new FormGroup({
    month: new FormControl(this.currentMonth, { nonNullable: true, validators: [Validators.required] }),
    totalAmount: new FormControl<number | null>(null, [Validators.min(0)]),
    allocations: new FormArray<BudgetAllocationForm>([]),
  });

  protected get allocations(): FormArray<BudgetAllocationForm> {
    return this.form.controls.allocations;
  }

  ngOnInit(): void {
    this.loadBudget();
  }

  protected allocationControls(): BudgetAllocationForm[] {
    return this.allocations.controls;
  }

  protected allocatedAmount(): number {
    return this.allocations.controls.reduce((sum, allocation) => {
      if (!allocation.controls.selected.value) return sum;
      return sum + this.toAmount(allocation.controls.amount.value);
    }, 0);
  }

  protected totalAmount(): number {
    return this.toAmount(this.form.controls.totalAmount.value);
  }

  protected remainingAmount(): number {
    const total = this.totalAmount();
    if (!total) return 0;
    return total - this.allocatedAmount();
  }

  protected allocationProgress(): number {
    const total = this.totalAmount();
    if (!total) return 0;
    return Math.min((this.allocatedAmount() / total) * 100, 100);
  }

  protected isOverAllocated(): boolean {
    return this.totalAmount() > 0 && this.allocatedAmount() > this.totalAmount();
  }

  protected selectedCategoryCount(): number {
    return this.allocations.controls.filter((allocation) => allocation.controls.selected.value).length;
  }

  protected saveBudget(): void {
    if (this.form.invalid || this.isOverAllocated()) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      month: this.form.controls.month.value,
      totalAmount: this.totalAmount(),
      allocations: this.allocations.controls
        .filter((allocation) => allocation.controls.selected.value && this.toAmount(allocation.controls.amount.value) > 0)
        .map((allocation) => ({
          category: allocation.controls.categoryId.value,
          amount: this.toAmount(allocation.controls.amount.value),
        })),
    };

    this.saving.set(true);
    this.budgetApi.saveBudget(payload).pipe(
      take(1),
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: (response) => {
        this.budget.set(response.data.budget);
        this.snackBar.open('Budget saved', 'Close', { duration: 2500 });
      },
      error: (error) => {
        this.snackBar.open(error?.error?.message ?? 'Could not save budget', 'Close', { duration: 3000 });
      },
    });
  }

  protected resetAllocations(): void {
    this.allocations.controls.forEach((allocation) => {
      allocation.controls.selected.setValue(false);
      allocation.controls.amount.setValue(null);
    });
  }

  private loadBudget(): void {
    this.loading.set(true);
    forkJoin({
      categories: this.expenseApi.getCategories(),
      budget: this.budgetApi.getBudget(this.currentMonth),
    }).pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ categories, budget }) => {
        const categoryList = categories.data.categories ?? [];
        this.categories.set(categoryList);
        this.budget.set(budget.data.budget);
        this.buildAllocationRows(categoryList, budget.data.budget);
      },
      error: () => {
        this.snackBar.open('Could not load budget details', 'Close', { duration: 2500 });
      },
    });
  }

  private buildAllocationRows(categories: Category[], budget: BudgetModel | null): void {
    const budgetByCategory = new Map(
      (budget?.allocations ?? []).map((allocation) => [allocation.category._id, allocation.amount])
    );

    this.form.controls.totalAmount.setValue(budget?.totalAmount ?? null);
    this.allocations.clear();

    categories.forEach((category) => {
      const amount = budgetByCategory.get(category._id) ?? null;
      this.allocations.push(new FormGroup({
        categoryId: new FormControl(category._id, { nonNullable: true }),
        selected: new FormControl(amount !== null, { nonNullable: true }),
        amount: new FormControl<number | null>(amount, [Validators.min(0)]),
      }));
    });
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private toAmount(value: number | null): number {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
  }
}
