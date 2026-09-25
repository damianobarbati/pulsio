import cx from 'clsx-tw';
import type React from 'react';
import { useFormContext } from 'react-hook-form';

type CheckboxProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'name'> & {
  label?: string;
  name?: string;
};

const toFieldName = (label: string) => {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const [firstWord, ...remainingWords] = words;
  return [firstWord?.toLowerCase(), ...remainingWords.map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)].join('');
};

export const Checkbox = ({ className, label, name, ...props }: CheckboxProps) => {
  const form = useFormContext<Record<string, boolean>>();
  const fieldName = name || (label ? toFieldName(label) : 'checkbox');
  const registration = form.register(fieldName);

  return (
    <label className={cx('group flex cursor-pointer items-center gap-2 text-gray-600 text-sm', className)}>
      <input {...props} {...registration} type="checkbox" className="peer sr-only" />

      <div className="pulsio-control-checkbox">
        <svg className="hidden h-3.5 w-3.5 text-white group-has-[:checked]:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {label && <span className="pulsio-control-label mb-0!">{label}</span>}
    </label>
  );
};
