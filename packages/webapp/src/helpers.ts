export const toNumber = (value: number, placeholder = '') => {
  if (value === null || value === undefined) return placeholder;
  return Intl.NumberFormat('en', { maximumFractionDigits: 2, notation: value >= 10000 ? 'compact' : 'standard' }).format(value);
};

export const toAmount = (value: number, currency, placeholder = '') => {
  if (value === null || value === undefined) return placeholder;
  return Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 2, notation: value >= 10000 ? 'compact' : 'standard' }).format(value);
};

export const toRate = (value: number, placeholder = '') => {
  if (value === null || value === undefined) return placeholder;
  return `${Number(value.toFixed(1))}%`;
};

export const toDuration = (value: number, placeholder = '') => {
  if (value === null || value === undefined) return placeholder;
  return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`;
};
