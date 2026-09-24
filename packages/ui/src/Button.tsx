import type React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' | 'lg' };
const variants = {
  primary: 'bg-pulsio-blue text-white hover:bg-blue-700',
  secondary: 'border border-pulsio-line bg-white text-pulsio-ink hover:bg-pulsio-nav',
  danger: 'bg-red-700 text-white hover:bg-red-800',
  ghost: 'text-pulsio-ink hover:bg-pulsio-nav',
};
const sizes = { sm: 'px-3 py-2 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };

export const Button = ({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  />
);
