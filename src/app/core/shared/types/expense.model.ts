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
  type: 'cash' | 'card' | 'debit_card' | 'credit_card' | 'upi' | 'bank' | 'wallet' | 'other';
  provider?: PaymentProvider;
  nickname?: string;
  lastFour?: string;
  upiId?: string;
  icon?: string;
  sequence?: number;
};

export type PaymentProvider = {
  _id: string;
  code: string;
  name: string;
  type: 'bank' | 'upi_app' | 'wallet' | 'cash';
  icon?: string;
  country?: string;
};

export type Country = {
  _id: string;
  name: string;
  iso2?: string;
  iso3?: string;
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
  paymentProviders?: PaymentProvider[];
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
    storageProvider?: 'local' | 's3';
    originalName?: string;
    fileName?: string;
    path?: string;
    url?: string;
    viewUrl?: string;
    bucket?: string;
    key?: string;
    mimeType?: string;
    size?: number;
    etag?: string;
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
  expense: Expense;
};
