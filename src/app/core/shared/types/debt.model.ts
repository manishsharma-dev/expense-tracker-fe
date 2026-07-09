import { Country, Expense, PaymentMethod } from './expense.model';

export type DebtAccountType =
  | 'credit_card'
  | 'personal_loan'
  | 'home_loan'
  | 'vehicle_loan'
  | 'education_loan'
  | 'bnpl'
  | 'borrowed'
  | 'other';

export type DebtTransactionType = 'opening_balance' | 'charge' | 'payment' | 'interest' | 'fee' | 'adjustment';

export type DebtAccount = {
  _id: string;
  name: string;
  type: DebtAccountType;
  source?: string;
  paymentMethod?: PaymentMethod;
  country?: Country;
  openingBalance: number;
  currentBalance: number;
  creditLimit?: number;
  interestRate?: number;
  emiAmount?: number;
  dueDay?: number;
  notes?: string;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
};

export type DebtTransaction = {
  _id: string;
  debtAccount: string | DebtAccount;
  type: DebtTransactionType;
  amount: number;
  direction: 'increase' | 'decrease';
  date: string;
  description?: string;
  sourceExpense?: Expense;
  paymentMethod?: PaymentMethod;
  createdAt: string;
};

export type DebtListResponse = {
  accounts: DebtAccount[];
  summary: {
    totalDebt: number;
    creditCardDebt: number;
  };
};

export type DebtDetailResponse = {
  account: DebtAccount;
  transactions: DebtTransaction[];
};

export type DebtHistoryResponse = {
  transactions: DebtTransaction[];
  summary: {
    charges: number;
    payments: number;
    net: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore?: boolean;
  };
};

export type DebtHistoryQuery = {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
};

export type DebtAccountPayload = {
  name: string;
  type: DebtAccountType;
  source?: string;
  paymentMethod?: string;
  country?: string;
  openingBalance?: number;
  creditLimit?: number;
  interestRate?: number;
  emiAmount?: number;
  dueDay?: number;
  notes?: string;
};

export type DebtTransactionPayload = {
  amount: number;
  date: string;
  description?: string;
  paymentMethod?: string;
};
