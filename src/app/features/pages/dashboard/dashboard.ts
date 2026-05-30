import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
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
    MatTableModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements AfterViewInit, OnDestroy {
  @ViewChild('spendingCanvas') private spendingCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryCanvas') private categoryCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private spendingChart?: Chart;
  private categoryChart?: Chart;
  private themeObserver?: MutationObserver;

  protected readonly displayedColumns = ['date', 'description', 'category', 'amount', 'status'];

  protected readonly stats: StatCard[] = [
    {
      label: 'Total Spent',
      value: '$3,248.50',
      detail: 'This month',
      icon: 'trending_down',
      badge: '-12% vs last month',
      tone: 'danger',
    },
    {
      label: 'Budget Remaining',
      value: '$1,751.50',
      detail: 'of $5,000 budget',
      icon: 'savings',
      tone: 'success',
      progress: 64,
    },
    {
      label: 'Transactions',
      value: '47',
      detail: 'This month',
      icon: 'swap_horiz',
      miniBars: [18, 24, 30, 48, 62, 38],
    },
    {
      label: 'Largest Expense',
      value: '$620.00',
      detail: 'Rent · Oct 1',
      icon: 'home',
    },
  ];

  protected readonly monthlySpend = [
    { month: 'May', value: 2380 },
    { month: 'Jun', value: 2870 },
    { month: 'Jul', value: 3060 },
    { month: 'Aug', value: 2700 },
    { month: 'Sep', value: 3700 },
    { month: 'Oct', value: 3200 },
  ];

  protected readonly categories = [
    { name: 'Food & Dining', amount: '$820', value: 820, colorVar: '--mat-sys-tertiary' },
    { name: 'Transport', amount: '$430', value: 430, colorVar: '--mat-sys-primary' },
    { name: 'Housing', amount: '$620', value: 620, colorVar: '--mat-sys-on-surface' },
    { name: 'Entertainment', amount: '$310', value: 310, colorVar: '--mat-sys-secondary' },
    { name: 'Health', amount: '$280', value: 280, colorVar: '--mat-sys-inverse-primary' },
    { name: 'Other', amount: '$788.50', value: 788.5, colorVar: '--mat-sys-outline' },
  ];

  protected readonly transactions: Transaction[] = [
    { date: 'Oct 15', description: 'Netflix Subscription', category: 'Entertainment', amount: '-$15.99', status: 'Completed', icon: 'redeem', color: 'purple' },
    { date: 'Oct 14', description: 'Uber Ride', category: 'Transport', amount: '-$12.40', status: 'Completed', icon: 'directions_car', color: 'teal' },
    { date: 'Oct 13', description: 'Whole Foods', category: 'Food & Dining', amount: '-$87.30', status: 'Completed', icon: 'restaurant', color: 'orange' },
    { date: 'Oct 12', description: 'Electricity Bill', category: 'Utilities', amount: '-$94.00', status: 'Pending', icon: 'bolt', color: 'gray' },
    { date: 'Oct 10', description: 'Gym Membership', category: 'Health', amount: '-$45.00', status: 'Completed', icon: 'fitness_center', color: 'green' },
  ];

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;

    await this.renderCharts();
    this.themeObserver = new MutationObserver(() => void this.renderCharts());
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.spendingChart?.destroy();
    this.categoryChart?.destroy();
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
              label: (context) => {
                const value = context.parsed.y ?? 0;
                return `$${value.toLocaleString()}`;
              },
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
            max: 3800,
            ticks: {
              stepSize: 950,
              color: variantText,
            },
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

    return {
      type: 'doughnut',
      data: {
        labels: this.categories.map((category) => category.name),
        datasets: [
          {
            data: this.categories.map((category) => category.value),
            backgroundColor: this.categories.map((category) =>
              styles.getPropertyValue(category.colorVar).trim(),
            ),
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
              label: (context) => `${context.label}: $${Number(context.parsed).toLocaleString()}`,
            },
          },
        },
      },
    };
  }
}
