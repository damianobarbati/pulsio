import { FormProvider, useForm } from 'react-hook-form';
import { SelectMulti } from './SelectMulti.tsx';

const fiveOptions = [
  { value: 'pulsio.io', label: 'pulsio.io' },
  { value: 'example.com', label: 'example.com' },
  { value: 'website.test', label: 'website.test' },
  { value: 'acme.dev', label: 'acme.dev' },
  { value: 'demo.app', label: 'demo.app' },
];

const hundredOptions = Array.from({ length: 100 }, (_, index) => ({ value: `website-${index + 1}`, label: `Website ${index + 1}` }));

const Examples = () => {
  const form = useForm({ defaultValues: { zero: [], five: [], hundred: [] } });

  return (
    <FormProvider {...form}>
      <div className="w-80 space-y-4">
        <SelectMulti name="zero" label="Zero options" options={[]} />
        <SelectMulti name="five" label="Five options" options={fiveOptions} />
        <SelectMulti name="hundred" label="One hundred options" options={hundredOptions} />
      </div>
    </FormProvider>
  );
};

export default { title: 'UI/Form/SelectMulti', component: SelectMulti };

export const Options = { render: () => <Examples /> };
