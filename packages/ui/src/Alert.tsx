import type React from 'react';

type AlertProps = React.HTMLAttributes<HTMLDivElement> & { tone?: 'info' | 'success' | 'warning' | 'error' };
const tones = {
  info: 'border-blue-200 bg-blue-50 text-blue-950',
  success: 'border-lime-200 bg-lime-50 text-lime-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  error: 'border-red-200 bg-red-50 text-red-950',
};
export const Alert = ({ tone = 'info', className = '', ...props }: AlertProps) => (
  <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[var(--radius-md)] border p-4 text-sm ${tones[tone]} ${className}`} {...props} />
);
