import type React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ className = '', ...props }: TextareaProps) => (
  <textarea
    className={`block w-full resize-y rounded-[var(--radius-md)] border border-pulsio-line bg-white px-3 py-2.5 text-pulsio-ink text-sm placeholder:text-pulsio-muted focus:border-pulsio-blue focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:opacity-60 ${className}`}
    {...props}
  />
);
