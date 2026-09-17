export const formatMetric = (metric: string, value: number | null | undefined) => {
  if (value === null || value === undefined) return '–';
  if (['bounceRate', 'scrollDepth', 'exitRate', 'percentage', 'conversionRate'].includes(metric)) return `${Number(value.toFixed(1))}%`;
  if (['visitDuration', 'timeOnPage'].includes(metric)) return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`;
  const result = Intl.NumberFormat('en', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(value);
  return result;
};
