import type React from 'react';
import { ChevronDown } from './icons.tsx';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
export const Select = ({ className = '', children, ...props }: SelectProps) => (
  <span className={`relative block w-full ${className}`}>
    <select
      className="block w-full appearance-none rounded-[var(--radius-md)] border border-pulsio-line bg-white px-3 py-2.5 pr-10 text-pulsio-ink text-sm focus:border-pulsio-blue focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:opacity-60"
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-pulsio-muted" />
  </span>
);
