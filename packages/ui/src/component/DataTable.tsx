import cx from 'clsx-tw';
import type React from 'react';

type DataTableProps = {
  className?: string;
  children: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
};

export const DataTable = ({ className, children, search, filters, footer }: DataTableProps) => (
  <section className={cx('overflow-hidden rounded-lg border border-pulsio-line bg-white shadow-pulsio', className)}>
    {search || filters ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-pulsio-line border-b p-4">
        {search}
        <div className="flex flex-wrap gap-2">{filters}</div>
      </div>
    ) : null}
    <div className="min-h-0 flex-1 overflow-x-auto">{children}</div>
    {footer ? <div className="border-pulsio-line border-t px-5 py-3 text-pulsio-muted text-sm">{footer}</div> : null}
  </section>
);
