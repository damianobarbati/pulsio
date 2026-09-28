import cx from 'clsx-tw';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Button } from '../component/Button.tsx';
import { Checkbox, Input, InputTime, InputTimeRange, Select, SelectMulti } from './index.ts';

type FormPreviewProps = {
  className?: string;
};

type FormValues = {
  email: string;
  password: string;
  birth_date: string;
  from: string;
  to: string;
  gender: string;
  websites: string[];
  terms: boolean;
};

const defaultValues = {
  email: '',
  password: '',
  birth_date: '',
  from: '',
  to: '',
  gender: 'male',
  websites: [],
  terms: false,
};

const websites = [
  { value: 'pulsio.io', label: 'pulsio.io' },
  { value: 'example.com', label: 'example.com' },
  { value: 'acme.dev', label: 'acme.dev' },
];

export const FormPreview = ({ className }: FormPreviewProps) => {
  const form = useForm<FormValues>({ defaultValues });
  const [formValues, setFormValues] = React.useState<FormValues | null>(null);

  return (
    <div className={cx('w-140 rounded-lg border border-pulsio-line bg-white p-6 shadow-sm', className)}>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(setFormValues)} className="grid gap-5" noValidate>
          <Input label="Email" name="email" type="email" placeholder="name@example.com" required />
          <Input label="Password" name="password" type="password" required />
          <InputTime label="Birth date" name="birth_date" type="date" />
          <InputTimeRange type="date" />
          <Select label="Gender" name="gender">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
          <SelectMulti label="Websites" name="websites" options={websites} placeholder="Select websites" />
          <Checkbox label="I accept the terms" name="terms" required />
          <Button type="submit">Submit</Button>
        </form>
      </FormProvider>
      {form.formState.isSubmitted && (
        <section aria-live="polite" className="mt-6">
          <h2 className="mb-2 font-semibold text-pulsio-ink text-sm">Submitted JSON</h2>
          <pre className="overflow-x-auto rounded-lg bg-pulsio-surface p-4 text-xs">{JSON.stringify(formValues, null, 2)}</pre>
        </section>
      )}
    </div>
  );
};
