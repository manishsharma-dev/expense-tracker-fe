import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize, forkJoin, take } from 'rxjs';
import { BudgetApiService } from 'app/core/services/apis/budget.service';
import { ExpenseApiService } from 'app/core/services/apis/expense.service';
import { Loader } from 'app/core/shared/components/loader/loader';
import { Budget as BudgetModel, BudgetAllocation } from 'app/core/shared/types/budget.model';
import { Category } from 'app/core/shared/types/expense.model';

type BudgetAllocationForm = FormGroup<{
  categoryId: FormControl<string>;
  amount: FormControl<number>;
}>;

@Component({
  selector: 'app-budget',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
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
  protected readonly displayedColumns = ['category', 'set', 'used', 'remaining', 'utilization', 'actions'];
  protected readonly categoryBudgetForm = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
  });

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

  protected budgetedAllocations(): BudgetAllocation[] {
    return this.budget()?.allocations ?? [];
  }

  protected availableCategories(): Category[] {
    const selectedCategoryId = this.categoryBudgetForm.controls.categoryId.value;
    const budgetedCategoryIds = new Set(this.allocationControls().map((allocation) => allocation.controls.categoryId.value));
    return this.categories().filter((category) => !budgetedCategoryIds.has(category._id) || category._id === selectedCategoryId);
  }

  protected selectedCategory(): Category | undefined {
    const selectedCategoryId = this.categoryBudgetForm.controls.categoryId.value;
    return this.categories().find((category) => category._id === selectedCategoryId);
  }

  protected allocatedAmount(): number {
    return this.allocations.controls.reduce((sum, allocation) => {
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
    return this.allocations.length;
  }

  protected addOrUpdateCategoryBudget(): void {
    if (this.categoryBudgetForm.invalid) {
      this.categoryBudgetForm.markAllAsTouched();
      return;
    }

    const categoryId = this.categoryBudgetForm.controls.categoryId.value;
    const amount = this.toAmount(this.categoryBudgetForm.controls.amount.value);
    const existing = this.allocations.controls.find((allocation) => allocation.controls.categoryId.value === categoryId);

    if (existing) {
      existing.controls.amount.setValue(amount);
    } else {
      this.allocations.push(new FormGroup({
        categoryId: new FormControl(categoryId, { nonNullable: true }),
        amount: new FormControl(amount, { nonNullable: true, validators: [Validators.min(1)] }),
      }));
    }

    this.categoryBudgetForm.reset({ categoryId: '', amount: null });
    this.syncBudgetPreview();
  }

  protected editAllocation(allocation: BudgetAllocation): void {
    this.categoryBudgetForm.setValue({
      categoryId: allocation.category._id,
      amount: allocation.amount,
    });
  }

  protected removeAllocation(categoryId: string): void {
    const index = this.allocations.controls.findIndex((allocation) => allocation.controls.categoryId.value === categoryId);
    if (index < 0) return;
    this.allocations.removeAt(index);
    this.syncBudgetPreview();
  }

  protected utilizationClass(allocation: BudgetAllocation): string {
    const percent = allocation.utilizationPercent ?? 0;
    if (allocation.isOverBudget || percent > 100) return 'utilization--over';
    if (percent >= 70) return 'utilization--high';
    if (percent >= 40) return 'utilization--medium';
    if (percent >= 10) return 'utilization--low';
    return 'utilization--minimal';
  }

  protected utilizationLabel(allocation: BudgetAllocation): string {
    const percent = allocation.utilizationPercent ?? 0;
    if (allocation.isOverBudget || percent > 100) return 'Over budget';
    if (percent >= 70) return 'High';
    if (percent >= 40) return 'Moderate';
    if (percent >= 10) return 'Low';
    return 'Unused';
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
        .filter((allocation) => this.toAmount(allocation.controls.amount.value) > 0)
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
        this.buildAllocationRows(this.categories(), response.data.budget);
        this.snackBar.open('Budget saved', 'Close', { duration: 2500 });
      },
      error: (error) => {
        this.snackBar.open(error?.error?.message ?? 'Could not save budget', 'Close', { duration: 3000 });
      },
    });
  }

  protected resetAllocations(): void {
    this.allocations.clear();
    this.categoryBudgetForm.reset({ categoryId: '', amount: null });
    this.syncBudgetPreview();
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

    categories
      .filter((category) => budgetByCategory.has(category._id))
      .forEach((category) => {
        const amount = budgetByCategory.get(category._id) ?? 0;
        this.allocations.push(new FormGroup({
        categoryId: new FormControl(category._id, { nonNullable: true }),
        amount: new FormControl(amount, { nonNullable: true, validators: [Validators.min(1)] }),
      }));
    });
  }

  private syncBudgetPreview(): void {
    const categoryById = new Map(this.categories().map((category) => [category._id, category]));
    const currentUsage = new Map(
      (this.budget()?.allocations ?? []).map((allocation) => [allocation.category._id, allocation])
    );
    const allocations: BudgetAllocation[] = this.allocations.controls
      .flatMap((allocation) => {
        const category = categoryById.get(allocation.controls.categoryId.value);
        if (!category) return [];
        const amount = this.toAmount(allocation.controls.amount.value);
        const existing = currentUsage.get(category._id);
        const used = existing?.used ?? 0;
        const utilizationPercent = amount > 0 ? Math.round((used / amount) * 100) : 0;
        return [{
          category,
          amount,
          used,
          remaining: amount - used,
          utilizationPercent,
          isOverBudget: used > amount,
        }];
      });

    this.budget.update((budget) => ({
      _id: budget?._id ?? '',
      month: this.form.controls.month.value,
      totalAmount: this.totalAmount(),
      allocations,
      createdAt: budget?.createdAt,
      updatedAt: budget?.updatedAt,
    }));
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
