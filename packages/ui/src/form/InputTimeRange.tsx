import cx from 'clsx-tw';
import { useFormContext } from 'react-hook-form';
import { InputTime } from './InputTime.tsx';

type InputTimeRangeProps = {
  className?: string;
  label?: string;
  type: 'date' | 'datetime-local';
};

type InputTimeRangeValues = {
  from: string;
  to: string;
};

export const InputTimeRange = ({ className, label, type }: InputTimeRangeProps) => {
  const { watch } = useFormContext<InputTimeRangeValues>();
  const from = watch('from');
  const to = watch('to');

  return (
    <fieldset className={cx('flex flex-wrap gap-4', className)}>
      {label && <legend className="pulsio-control-label">{label}</legend>}
      <InputTime label="From" name="from" type={type} max={to} />
      <InputTime label="To" name="to" type={type} min={from} />
    </fieldset>
  );
};
