import type React from 'react';

type EmptyStateProps = { title: string; description?: string; action?: React.ReactNode };
export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <section className="rounded-[var(--radius-lg)] border border-pulsio-line border-dashed bg-white px-6 py-12 text-center">
    <h2 className="font-semibold text-lg">{title}</h2>
    {description && <p className="mx-auto mt-2 max-w-md text-pulsio-muted text-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </section>
);
