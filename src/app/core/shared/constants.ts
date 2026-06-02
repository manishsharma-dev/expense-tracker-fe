import { MenuItem } from './types/menu.model';

export const STORAGE_KEY = 'auth_token';

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    route: '/',
  },
  {
    label: 'Expenses',
    icon: 'receipt_long',
    children: [
      { label: 'All Expenses',  route: '/expenses',           icon: 'list' },
      { label: 'Add Expense',   route: '/expenses/add',       icon: 'add_circle' },
      { label: 'Categories',    route: '/expenses/categories', icon: 'category' },
    ],
  },
  {
    label: 'Earnings',
    icon: 'trending_up',
    children: [
      { label: 'All Earnings',  route: '/earnings',     icon: 'list' },
      { label: 'Add Earning',   route: '/earnings/add', icon: 'add_circle' },
      { label: 'Sources',       route: '/earnings/sources', icon: 'source' },
    ],
  },
  {
    label: 'Budget',
    icon: 'account_balance_wallet',
    children: [
      { label: 'Overview',    route: '/budget',          icon: 'pie_chart' },
      { label: 'Set Budget',  route: '/budget/set',      icon: 'edit' },
    ],
  },
  {
    label: 'Reports',
    icon: 'bar_chart',
    children: [
      { label: 'Monthly',   route: '/reports/monthly',   icon: 'calendar_month' },
      { label: 'Yearly',    route: '/reports/yearly',    icon: 'date_range' },
      { label: 'Custom',    route: '/reports/custom',    icon: 'tune' },
    ],
  },
  {
    label: 'Accounts',
    icon: 'account_balance',
    route: '/accounts',
  },
  {
    label: 'Settings',
    icon: 'settings',
    route: '/settings',
  },
];

export enum LoginMethod {
  EMAIL,
  MOBILE
} 
