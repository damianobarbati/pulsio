import { FormProvider, useForm } from 'react-hook-form';
import { InputTimeRange } from './InputTimeRange.tsx';

const Example = () => {
  const form = useForm({ defaultValues: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' } });

  return (
    <FormProvider {...form}>
      <InputTimeRange label="Availability" type="date" />
    </FormProvider>
  );
};

export default { title: 'UI/Form/InputTimeRange', component: InputTimeRange };

export const Dates = { render: () => <Example /> };
