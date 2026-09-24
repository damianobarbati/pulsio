import type React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export const Input = ({ className = '', ...props }: InputProps) => (
  <input
    className={`block w-full rounded-[var(--radius-md)] border border-pulsio-line bg-white px-3 py-2.5 text-pulsio-ink text-sm placeholder:text-pulsio-muted focus:border-pulsio-blue focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:opacity-60 ${className}`}
    {...props}
  />
);
