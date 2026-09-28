import { FormProvider, useForm } from 'react-hook-form';
import { Input } from './Input.tsx';

export default { title: 'UI/Form/Input', component: Input };

export const States = {
  render: () => {
    const form = useForm({ defaultValues: { defaultInput: '', errorInput: '', disabledInput: 'Disabled input' } });
    return (
      <FormProvider {...form}>
        <div className="w-80 space-y-4">
          <Input name="defaultInput" label="Default input" placeholder="Default input" />
          <Input name="errorInput" aria-invalid="true" placeholder="Error input" />
          <Input name="disabledInput" disabled />
        </div>
      </FormProvider>
    );
  },
};
