import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize, take } from 'rxjs';
import { DashboardApiService } from 'app/core/services/apis/dashboard.service';
import { Loader } from 'app/core/shared/components/loader/loader';
import { DashboardData } from 'app/core/shared/types/dashboard.model';
import { getCategoryColorValue } from 'app/core/shared/utils/category-color';
import type { Chart, ChartConfiguration } from 'chart.js';

type StatCard = {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone?: 'default' | 'success' | 'danger';
  badge?: string;
  progress?: number;
  miniBars?: number[];
};

type Transaction = {
  date: string;
  description: string;
  category: string;
  amount: string;
  status: 'Completed' | 'Pending';
  icon: string;
  color: 'purple' | 'teal' | 'orange' | 'gray' | 'green';
};

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTableModule,
    Loader,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('spendingCanvas') private spendingCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryCanvas') private categoryCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private spendingChart?: Chart;
  private categoryChart?: Chart;
  private themeObserver?: MutationObserver;
  private loadDashboardTimer?: ReturnType<typeof setTimeout>;
  private viewReady = false;

  protected readonly displayedColumns = ['date', 'description', 'category', 'amount', 'status'];
  protected readonly loading = signal(false);

  protected userName = 'there';
  protected monthLabel = '';
  protected currencyCode = 'INR';
  protected stats: StatCard[] = [];
  protected monthlySpend: Array<{ month: string; value: number }> = [];
  protected categories: Array<{ name: string; amount: string; value: number; color: string }> = [];
  protected transactions: Transaction[] = [];

  ngOnInit(): void {
    this.loadDashboardTimer = setTimeout(() => {
      this.loadDashboardTimer = undefined;
      this.loadDashboard();
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;

    this.viewReady = true;
    await this.renderCharts();
    this.themeObserver = new MutationObserver(() => void this.renderCharts());
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy(): void {
    if (this.loadDashboardTimer) clearTimeout(this.loadDashboardTimer);
    this.themeObserver?.disconnect();
    this.spendingChart?.destroy();
    this.categoryChart?.destroy();
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.dashboardApi.getDashboard().pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.applyDashboardData(response.data.dashboard);
        if (this.viewReady) void this.renderCharts();
      },
      error: () => {
        this.snackBar.open('Could not load dashboard data', 'Close', { duration: 2500 });
      },
    });
  }

  private applyDashboardData(data: DashboardData): void {
    this.userName = data.user.name;
    this.monthLabel = data.monthLabel;
    this.currencyCode = data.currencyCode || 'INR';
    this.monthlySpend = data.monthlySpend;
    this.categories = data.categorySpend.map((category) => ({
      name: category.name,
      amount: this.formatCurrency(category.amount),
      value: category.value,
      color: getCategoryColorValue(category.color),
    }));
    this.transactions = data.recentTransactions.map((transaction) => ({
      date: this.formatShortDate(transaction.date),
      description: transaction.description,
      category: transaction.category,
      amount: `-${this.formatCurrency(transaction.amount)}`,
      status: transaction.status,
      icon: transaction.icon,
      color: transaction.color,
    }));
    this.stats = this.createStats(data);
  }

  private createStats(data: DashboardData): StatCard[] {
    const summary = data.summary;
    const budgetProgress = summary.totalBudget
      ? Math.max(0, Math.min((summary.budgetRemaining / summary.totalBudget) * 100, 100))
      : 0;

    return [
      {
        label: 'Total Spent',
        value: this.formatCurrency(summary.totalSpent),
        detail: 'This month',
        icon: 'trending_down',
        badge: this.getSpendChangeBadge(summary.spentChangePercent),
        tone: summary.spentChangePercent <= 0 ? 'success' : 'danger',
      },
      {
        label: 'Budget Remaining',
        value: this.formatCurrency(summary.budgetRemaining),
        detail: summary.totalBudget ? `of ${this.formatCurrency(summary.totalBudget)} budget` : 'No budget set',
        icon: 'savings',
        tone: summary.budgetRemaining >= 0 ? 'success' : 'danger',
        progress: budgetProgress,
      },
      {
        label: 'Transactions',
        value: String(summary.transactionCount),
        detail: 'This month',
        icon: 'swap_horiz',
        miniBars: this.getMiniBars(data.monthlySpend),
      },
      {
        label: 'Earned vs Spent',
        value: this.formatCurrency(summary.netAmount),
        detail: `${this.formatCurrency(summary.totalEarned)} earned / ${this.formatCurrency(summary.totalSpent)} spent`,
        icon: summary.spentMoreThanEarned ? 'warning' : 'trending_up',
        tone: summary.spentMoreThanEarned ? 'danger' : 'success',
      },
    ];
  }

  private async renderCharts(): Promise<void> {
    if (!this.spendingCanvas || !this.categoryCanvas) return;

    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    this.spendingChart?.destroy();
    this.categoryChart?.destroy();

    this.spendingChart = new Chart(
      this.spendingCanvas.nativeElement,
      this.createSpendingChartConfig(),
    );
    this.categoryChart = new Chart(
      this.categoryCanvas.nativeElement,
      this.createCategoryChartConfig(),
    );
  }

  private createSpendingChartConfig(): ChartConfiguration<'bar'> {
    const styles = getComputedStyle(document.body);
    const surfaceText = styles.getPropertyValue('--mat-sys-on-surface').trim();
    const variantText = styles.getPropertyValue('--mat-sys-on-surface-variant').trim();
    const gridColor = styles.getPropertyValue('--mat-sys-outline-variant').trim();
    const maxSpend = Math.max(...this.monthlySpend.map((item) => item.value), 0);
    const yMax = maxSpend ? Math.ceil((maxSpend * 1.2) / 100) * 100 : 100;

    return {
      type: 'bar',
      data: {
        labels: this.monthlySpend.map((item) => item.month),
        datasets: [
          {
            data: this.monthlySpend.map((item) => item.value),
            backgroundColor: surfaceText,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 46,
          },
        ],
      },
      options: {
        animation: false,
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: (context) => this.formatCurrency(context.parsed.y ?? 0),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: variantText },
          },
          y: {
            min: 0,
            max: yMax,
            ticks: { color: variantText },
            grid: { color: gridColor },
            border: { display: false },
          },
        },
      },
    };
  }

  private createCategoryChartConfig(): ChartConfiguration<'doughnut'> {
    const styles = getComputedStyle(document.body);
    const panelColor = styles.getPropertyValue('--mat-sys-surface-container-low').trim()
      || styles.getPropertyValue('--mat-sys-surface').trim();
    const hasCategories = this.categories.length > 0;

    return {
      type: 'doughnut',
      data: {
        labels: hasCategories ? this.categories.map((category) => category.name) : ['No spending'],
        datasets: [
          {
            data: hasCategories ? this.categories.map((category) => category.value) : [1],
            backgroundColor: hasCategories
              ? this.categories.map((category) => this.resolveCssColor(category.color))
              : [styles.getPropertyValue('--mat-sys-outline-variant').trim()],
            borderColor: panelColor,
            borderWidth: 0,
            hoverOffset: 3,
          },
        ],
      },
      options: {
        animation: false,
        cutout: '58%',
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${this.formatCurrency(Number(context.parsed) || 0)}`,
            },
          },
        },
      },
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: this.currencyCode,
      maximumFractionDigits: value % 1 ? 2 : 0,
    }).format(value);
  }

  private formatShortDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date));
  }

  private getSpendChangeBadge(percent: number): string {
    if (!percent) return 'No change vs last month';
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent}% vs last month`;
  }

  private getMiniBars(monthlySpend: Array<{ value: number }>): number[] {
    const maxValue = Math.max(...monthlySpend.map((item) => item.value), 0);
    if (!maxValue) return [8, 8, 8, 8, 8, 8];
    return monthlySpend.map((item) => Math.max(8, Math.round((item.value / maxValue) * 100)));
  }

  private resolveCssColor(color: string): string {
    if (!color.startsWith('var(')) return color;

    const variableName = color.slice(4, -1).trim();
    return getComputedStyle(document.body).getPropertyValue(variableName).trim() || color;
  }
}
