import cx from 'clsx-tw';
import type React from 'react';
import { useFormContext } from 'react-hook-form';
import { ChevronDown } from '../icons.tsx';

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> & {
  label?: string;
  leftIcon?: React.ReactElement;
  name: string;
};

export const Select = ({ className, label, leftIcon, children, name, onBlur, onChange, ...props }: SelectProps) => {
  const form = useFormContext();
  const registration = form.register(name);

  return (
    <label className={cx('pulsio-control', className)}>
      {label && <span className="pulsio-control-label">{label}</span>}
      <span className="relative block w-full">
        {leftIcon && <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-pulsio-muted">{leftIcon}</span>}
        <select
          className={cx('pulsio-control-input appearance-none pr-10', leftIcon && '!pl-9')}
          {...props}
          {...registration}
          onBlur={(event) => {
            registration.onBlur(event);
            onBlur?.(event);
          }}
          onChange={(event) => {
            registration.onChange(event);
            onChange?.(event);
          }}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-pulsio-muted" />
      </span>
    </label>
  );
};
