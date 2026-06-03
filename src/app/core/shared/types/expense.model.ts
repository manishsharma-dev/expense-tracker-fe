export type Category = {
  _id: string;
  name: string;
  color?: string;
  icon?: string;
  isSystem?: boolean;
};

export type SubCategory = {
  _id: string;
  name: string;
  category: string | Category;
  color?: string;
  icon?: string;
  isSystem?: boolean;
};

export type PaymentMethod = {
  _id: string;
  name: string;
  type: 'cash' | 'card' | 'upi' | 'bank' | 'wallet' | 'other';
  lastFour?: string;
  icon?: string;
};

export type Country = {
  _id: string;
  name: string;
  iso2: string;
  iso3: string;
  emoji?: string;
  currency?: {
    code?: string;
    name?: string;
    symbol?: string;
  };
};

export type ExpenseReferenceResponse = {
  categories?: Category[];
  subCategories?: SubCategory[];
  paymentMethods?: PaymentMethod[];
  countries?: Country[];
  category?: Category;
  subCategory?: SubCategory;
  paymentMethod?: PaymentMethod;
};

export type Expense = {
  _id: string;
  amount: number;
  date: string;
  description: string;
  notes?: string;
  category: Category;
  subCategory?: SubCategory;
  paymentMethod: PaymentMethod;
  country?: Country;
  receipt?: {
    originalName?: string;
    fileName?: string;
    path?: string;
    mimeType?: string;
    size?: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type ExpenseListQuery = {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  category?: string;
  subCategory?: string;
  paymentMethod?: string;
  country?: string;
};

export type ExpenseListResponse = {
  expenses: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ExpenseResponse = {
  expense: unknown;
};
