// src/app/app.routes.ts
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
    ],
  },
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
    path: '**',
    redirectTo: 'login',
  },
];