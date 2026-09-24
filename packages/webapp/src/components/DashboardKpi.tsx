import cx from 'clsx-tw';
import { IDown, IUp } from 'ui/icons.tsx';

type DashboardKpiProps = {
  label: string;
  value: string | number;
  change: number | null;
  selected: boolean;
  onSelect: () => void;
  live?: boolean;
};

export const DashboardKpi = ({ label, value, change, selected, onSelect, live = false }: DashboardKpiProps) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    className={cx(
      `border-gray-100 border-r px-4 py-3 text-left font-semibold transition last:border-0 hover:scale-105 hover:bg-gray-100`,
      selected && 'rounded bg-gray-100 font-bold',
    )}
  >
    <span className="flex items-center gap-2 whitespace-nowrap text-gray-500 text-xs uppercase">
      {live && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
      {label}
    </span>
    <span className="mt-2 flex flex-col items-baseline gap-2">
      <span className="text-2xl tabular-nums tracking-tight">{value}</span>
      {change !== null && (
        <span className={`flex items-center gap-1 text-xs ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {change > 0 && <IUp />}
          {change < 0 && <IDown />}
          {Math.abs(change).toFixed(1)}%
        </span>
      )}
    </span>
  </button>
);
