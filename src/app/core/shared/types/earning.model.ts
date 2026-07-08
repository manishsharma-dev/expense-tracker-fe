import { Country } from './expense.model';

export type EarningCategory = {
  _id: string;
  name: string;
  color?: string;
  icon?: string;
  isSystem?: boolean;
};

export type Earning = {
  _id: string;
  amount: number;
  date: string;
  description: string;
  notes?: string;
  category: EarningCategory;
  country?: Country;
};

export type EarningPeriod = 'day' | 'week' | 'month' | 'year';

export type EarningSummaryRow = {
  period: EarningPeriod;
  periodKey: string;
  totalAmount: number;
  count: number;
  from: string;
  to: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore?: boolean;
};

export type EarningResponse = {
  earnings?: Earning[];
  earning?: Earning;
  earningCategories?: EarningCategory[];
  earningCategory?: EarningCategory;
  rows?: EarningSummaryRow[];
  period?: EarningPeriod;
  pagination?: Pagination;
};
