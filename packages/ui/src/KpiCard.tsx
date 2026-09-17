import { Card } from './Card.tsx';

type KpiCardProps = { label: string; value: string | number; detail?: string; live?: boolean; className?: string };
export const KpiCard = ({ label, value, detail, live, className = '' }: KpiCardProps) => (
  <Card className={className}>
    <p className="flex items-center gap-2 font-semibold text-pulsio-muted text-xs uppercase tracking-wider">
      {live && <span className="h-2 w-2 rounded-full bg-pulsio-lime" />}
      {label}
    </p>
    <p className="mt-4 font-semibold text-3xl tabular-nums tracking-tight">{value}</p>
    {detail && <p className="mt-1 text-pulsio-muted text-sm">{detail}</p>}
  </Card>
);
