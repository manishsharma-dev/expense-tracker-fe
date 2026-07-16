import { describe, expect, it } from 'vitest';

import { Country } from '../types/expense.model';
import {
  filterCurrencyCountries,
  getCountryCurrencyLabel,
  getDefaultCurrencyCountry,
  getPreferredCurrencyCountry,
} from './country-currency';

const countries: Country[] = [
  {
    _id: 'india',
    name: 'India',
    iso2: 'IN',
    iso3: 'IND',
    currency: { code: 'INR', name: 'Indian rupee', symbol: '₹' },
  },
  {
    _id: 'usa',
    name: 'United States',
    iso2: 'US',
    iso3: 'USA',
    currency: { code: 'USD', name: 'US Dollar', symbol: '$' },
  },
  {
    _id: 'uae',
    name: 'United Arab Emirates',
    iso2: 'AE',
    iso3: 'ARE',
    currency: { code: 'AED', name: 'UAE dirham' },
  },
];

describe('country currency utilities', () => {
  it('filters by country, ISO code, currency code, or currency name', () => {
    expect(filterCurrencyCountries(countries, 'rupee')).toEqual([countries[0]]);
    expect(filterCurrencyCountries(countries, 'us')).toEqual([countries[1]]);
    expect(filterCurrencyCountries(countries, 'AED')).toEqual([countries[2]]);
  });

  it('builds a concise currency label for autocomplete options', () => {
    expect(getCountryCurrencyLabel(countries[0])).toBe('₹ - INR (Indian rupee)');
    expect(getCountryCurrencyLabel(countries[2])).toBe('AED (UAE dirham)');
  });

  it('prefers saved user country over browser locale', () => {
    expect(getPreferredCurrencyCountry(countries, countries[1])).toBe(countries[1]);
    expect(getPreferredCurrencyCountry(countries, 'uae')).toBe(countries[2]);
  });

  it('uses browser locale when the user has no saved preference', () => {
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: ['en-IN'],
    });
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });

    expect(getDefaultCurrencyCountry(countries)).toBe(countries[0]);
    expect(getPreferredCurrencyCountry(countries)).toBe(countries[0]);
  });
});
