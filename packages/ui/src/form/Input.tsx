import cx from 'clsx-tw';
import type React from 'react';
import { useFormContext } from 'react-hook-form';

type InputProps = Omit<React.ComponentPropsWithRef<'input'>, 'name'> & {
  label?: string;
  name: string;
};

export const Input = ({ className, label, name, defaultValue, onBlur, onChange, ref, ...props }: InputProps) => {
  const form = useFormContext();
  const registration = form.register(name);

  return (
    <label className={cx('pulsio-control', className)}>
      {label && <span className="pulsio-control-label">{label}</span>}
      <input
        className="pulsio-control-input"
        defaultValue={defaultValue}
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
        ref={(element) => {
          registration.ref(element);
          if (element && defaultValue !== undefined && element.value !== String(defaultValue)) {
            element.value = String(defaultValue);
          }
          if (typeof ref === 'function') ref(element);
          else if (ref) ref.current = element;
        }}
      />
    </label>
  );
};
