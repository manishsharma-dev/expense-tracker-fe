import { Category } from './expense.model';

export type BudgetAllocation = {
  category: Category;
  amount: number;
  used?: number;
  remaining?: number;
  utilizationPercent?: number;
  isOverBudget?: boolean;
};

export type Budget = {
  _id: string;
  month: string;
  totalAmount: number;
  allocations: BudgetAllocation[];
  createdAt?: string;
  updatedAt?: string;
};

export type BudgetResponse = {
  budget: Budget | null;
};

export type BudgetPayload = {
  month: string;
  totalAmount: number;
  allocations: Array<{
    category: string;
    amount: number;
  }>;
};
