import cx from 'clsx-tw';
import type React from 'react';
import { IDown, IUp } from 'ui/icons.tsx';
import { toRate } from '#webapp/helpers.ts';

type DashboardKpiProps = {
  className?: string;
  label: React.ReactNode;
  value: string | number;
  previousValue?: number | null;
  valueFormatter: (value: any) => string;
  selected: boolean;
  onSelect?: () => void;
};

const calculateChange = (value: string | number, previousValue?: number | null) => {
  if (typeof value !== 'number' || previousValue === null || previousValue === undefined) return null;
  if (previousValue === 0) return value === 0 ? 0 : null;
  return ((value - previousValue) / Math.abs(previousValue)) * 100;
};

export const DashboardKpi = ({ className, label, value, previousValue, valueFormatter, selected, onSelect }: DashboardKpiProps) => {
  const change = calculateChange(value, previousValue);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      disabled={!onSelect}
      className={cx(
        'min-w-0 border-gray-100 border-r px-2 py-3 text-left text-xs transition last:border-0 enabled:hover:scale-105 enabled:hover:bg-gray-100 sm:px-4',
        selected && 'rounded bg-gray-100 font-bold',
        !!onSelect && 'cursor-pointer',
        className,
      )}
    >
      <span className="flex flex-row items-center gap-2 text-nowrap text-gray-500 uppercase">{label}</span>
      <span className="mt-1 flex flex-row items-baseline gap-2">
        <span className="text-lg tabular-nums tracking-tight">{valueFormatter(value)}</span>
        {change !== null && (
          <span className={cx('flex items-center gap-1', change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-gray-500')}>
            {change > 0 && <IUp />}
            {change < 0 && <IDown />}
            {change === 0 && <IDown />}
            {toRate(change)}
          </span>
        )}
      </span>
    </button>
  );
};
