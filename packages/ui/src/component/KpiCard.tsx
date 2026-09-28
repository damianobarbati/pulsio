import cx from 'clsx-tw';
import { Card } from './Card.tsx';

type KpiCardProps = {
  className?: string;
  label: string;
  value: string | number;
  detail?: string;
  delta?: number | null;
  live?: boolean;
};

const formatDelta = (delta: number) => `${delta > 0 ? '+' : ''}${Number(delta.toFixed(1))}%`;

export const KpiCard = ({ className, label, value, detail, delta, live }: KpiCardProps) => (
  <Card className={className}>
    <p className="flex items-center gap-2 font-semibold text-pulsio-muted text-xs uppercase tracking-wider">
      {live && <span className="h-2 w-2 rounded-full bg-pulsio-lime" />}
      {label}
    </p>
    <div className="mt-4 flex items-baseline gap-2">
      <p className="font-semibold text-3xl tabular-nums tracking-tight">{value}</p>
      {delta !== null && delta !== undefined && (
        <span className={cx('font-semibold text-sm tabular-nums', delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-pulsio-muted')}>{formatDelta(delta)}</span>
      )}
    </div>
    {detail && <p className="mt-1 text-pulsio-muted text-sm">{detail}</p>}
  </Card>
);
