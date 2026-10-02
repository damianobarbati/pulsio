export const toNumber = (value: number, placeholder = '', locale = 'en') => {
  if (value === null || value === undefined) return placeholder;
  return Intl.NumberFormat(locale, { maximumFractionDigits: 2, notation: value >= 10000 ? 'compact' : 'standard' }).format(value);
};

export const toAmount = (value: number, currency, placeholder = '', locale = 'en') => {
  if (value === null || value === undefined) return placeholder;
  return Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: value < 1 ? 2 : 0,
    notation: value >= 10000 ? 'compact' : 'standard',
  }).format(value);
};

export const toRate = (value: number, placeholder = '', locale = 'en') => {
  if (value === null || value === undefined) return placeholder;
  return `${Intl.NumberFormat(locale, { maximumFractionDigits: Math.abs(value) > 1 ? 0 : 2 }).format(value)}%`;
};

export const toDuration = (value: number, placeholder = '') => {
  if (value === null || value === undefined) return placeholder;
  return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`;
};
