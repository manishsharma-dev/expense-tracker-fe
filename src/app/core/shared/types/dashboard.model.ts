export type DashboardSummary = {
  totalSpent: number;
  totalEarned: number;
  netAmount: number;
  spentMoreThanEarned: boolean;
  spentChangePercent: number;
  totalBudget: number;
  budgetRemaining: number;
  transactionCount: number;
  largestExpense: {
    amount: number;
    description: string;
    date: string;
  } | null;
};

export type DashboardMonthlySpend = {
  month: string;
  value: number;
};

export type DashboardCategorySpend = {
  id: string;
  name: string;
  amount: number;
  value: number;
  color?: string;
  icon?: string;
};

export type DashboardTransaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  status: 'Completed' | 'Pending';
  icon: string;
  color: 'purple' | 'teal' | 'orange' | 'gray' | 'green';
};

export type DashboardData = {
  user: {
    name: string;
  };
  month: string;
  monthLabel: string;
  currencyCode: string;
  summary: DashboardSummary;
  monthlySpend: DashboardMonthlySpend[];
  categorySpend: DashboardCategorySpend[];
  recentTransactions: DashboardTransaction[];
};

export type DashboardResponse = {
  dashboard: DashboardData;
};
