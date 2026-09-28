import cx from 'clsx-tw';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from './Input.tsx';

type InputTimeProps = {
  className?: string;
  label?: string;
  name: string;
  type: 'date' | 'datetime-local';
  min?: string;
  max?: string;
  endOfDay?: boolean;
};

const formatLocal = (value: string, type: InputTimeProps['type']) => {
  if (!value) return '';

  const date = new Date(value);
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const formatted = `${year}-${month}-${day}`;

  if (type === 'date') return formatted;

  const dateTime = `${formatted}T${hours}:${minutes}`;
  return dateTime;
};

export const InputTime = ({ className, label, name, type, min, max, endOfDay = false }: InputTimeProps) => {
  const { watch, setValue } = useFormContext<Record<string, string>>();
  const value = watch(name);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const formattedValue = formatLocal(value, type);
  const initialValue = React.useRef(formattedValue);

  React.useEffect(() => {
    if (!inputRef.current || document.activeElement === inputRef.current) return;
    if (inputRef.current.value !== formattedValue) inputRef.current.value = formattedValue;
  }, [formattedValue]);

  const changeDate = (nextValue: string) => {
    if (!nextValue) return;

    const date = new Date(type === 'date' ? `${nextValue}T00:00` : nextValue);

    if (Number.isNaN(date.getTime())) return;

    if (type === 'date') {
      if (endOfDay) date.setHours(23, 59, 59, 999);
      else date.setHours(0, 0, 0, 0);
    }

    setValue(name, date.toISOString(), { shouldDirty: true });
    if (inputRef.current && inputRef.current.value !== nextValue) inputRef.current.value = nextValue;
  };

  return (
    <Input
      className={cx('pulsio-control', className)}
      label={label}
      name={name}
      type={type}
      ref={inputRef}
      defaultValue={initialValue.current}
      min={min && formatLocal(min, type)}
      max={max && formatLocal(max, type)}
      onChange={(event) => changeDate(event.target.value)}
      onBlur={(event) => {
        if (event.target.validity.badInput) {
          event.target.value = formattedValue;
          return;
        }

        if (!event.target.value) {
          setValue(name, '', { shouldDirty: true });
          return;
        }

        changeDate(event.target.value);
      }}
    />
  );
};
