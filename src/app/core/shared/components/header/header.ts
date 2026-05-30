import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../services/theme';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly themeService = inject(ThemeService);

  protected readonly navItems = [
    { label: 'Dashboard', route: '/', icon: 'dashboard' },
    { label: 'Expenses', route: '/expenses', icon: 'receipt_long' },
    { label: 'Earnings', route: '/earnings', icon: 'trending_up' },
    { label: 'Budget', route: '/budget', icon: 'savings' },
  ];

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
