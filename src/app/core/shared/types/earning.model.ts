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

export type EarningResponse = {
  earnings?: Earning[];
  earning?: Earning;
  earningCategories?: EarningCategory[];
  earningCategory?: EarningCategory;
};
