import { Country } from '../types/expense.model';

export const filterCurrencyCountries = (countries: Country[], searchTerm: string): Country[] => {
  const search = searchTerm.trim().toLowerCase();
  if (!search) return countries;

  return countries.filter((country) => {
    const currencyCode = country.currency?.code ?? '';
    const currencyName = country.currency?.name ?? '';
    return `${country.name} ${country.iso2 ?? ''} ${country.iso3 ?? ''} ${currencyCode} ${currencyName}`
      .toLowerCase()
      .includes(search);
  });
};

export const getCountryCurrencyLabel = (country: Country): string => {
  const currencyCode = country.currency?.code ?? country.iso3 ?? country.name;
  const currencyName = country.currency?.name;
  const currencySymbol = country.currency?.symbol;
  const prefix = currencySymbol ? `${currencySymbol} - ${currencyCode}` : currencyCode;
  return currencyName ? `${prefix} (${currencyName})` : `${prefix} (${country.name})`;
};

export const getBrowserCountryCode = (): string => {
  if (typeof navigator === 'undefined') return '';

  const locales = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const locale of locales) {
    const parts = locale.replace('_', '-').split('-');
    const region = parts.slice(1).find((part) => /^[a-z]{2}$/i.test(part));
    if (region) return region.toUpperCase();
  }

  return '';
};

export const getDefaultCurrencyCountry = (countries: Country[]): Country | undefined => {
  const countryCode = getBrowserCountryCode();
  if (!countryCode) return undefined;
  return countries.find((country) => country.iso2?.toUpperCase() === countryCode);
};

export const getPreferredCurrencyCountry = (
  countries: Country[],
  preferredCountry?: Country | string
): Country | undefined => {
  const preferredCountryId = typeof preferredCountry === 'string' ? preferredCountry : preferredCountry?._id;
  const preferredIso2 = typeof preferredCountry === 'string' ? undefined : preferredCountry?.iso2;
  const preferredCurrencyCode = typeof preferredCountry === 'string' ? undefined : preferredCountry?.currency?.code;

  return countries.find((country) => country._id === preferredCountryId)
    ?? countries.find((country) => preferredIso2 && country.iso2?.toUpperCase() === preferredIso2.toUpperCase())
    ?? countries.find((country) => preferredCurrencyCode && country.currency?.code === preferredCurrencyCode)
    ?? getDefaultCurrencyCountry(countries);
};
