import { FormProvider, useForm } from 'react-hook-form';
import { InputTime } from './InputTime.tsx';

const Example = () => {
  const form = useForm({ defaultValues: { birthDate: '2000-01-15T00:00:00.000Z', appointment: '2026-09-25T10:30:00.000Z' } });

  return (
    <FormProvider {...form}>
      <div className="w-80 space-y-4">
        <InputTime label="Birth date" name="birthDate" type="date" />
        <InputTime label="Appointment" name="appointment" type="datetime-local" />
      </div>
    </FormProvider>
  );
};

export default { title: 'UI/Form/InputTime', component: InputTime };

export const DateAndTime = { render: () => <Example /> };
