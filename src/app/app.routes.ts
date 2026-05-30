import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/pages/main/main')
      .then(m => m.Main),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/pages/dashboard/dashboard')
          .then(m => m.Dashboard),
      },
      {
        path: 'expenses',
        loadComponent: () => import('./features/pages/expenses/expenses')
          .then(m => m.Expenses),
      },
      {
        path: 'budget',
        loadComponent: () => import('./features/pages/budget/budget')
          .then(m => m.Budget),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/pages/reports/reports')
          .then(m => m.Reports),
      },
      {
        path: 'earnings',
        loadComponent: () => import('./features/pages/earnings/earnings')
          .then(m => m.Earnings),
      }
    ],
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth')
      .then(m => m.Auth),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login')
          .then(m => m.Login),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register')
          .then(m => m.Register),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
    ]
  },

];