import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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

  constructor() {
    this.themeService.initTheme();
  }

  protected toggleTheme() {
    this.themeService.toggleTheme();
  }
}
