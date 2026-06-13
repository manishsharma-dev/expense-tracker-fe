import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ExpenseReminderService } from './core/services/expense-reminder';
import { ThemeService } from './core/services/theme';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('expense-tracker-fe');

  private themeService: ThemeService = inject(ThemeService);
  private expenseReminderService = inject(ExpenseReminderService);

  constructor() {
    this.themeService.initTheme();
    this.expenseReminderService.init();
  }

  protected toggleTheme() {
    this.themeService.toggleTheme();
  }
}
