import { FormProvider, useForm } from 'react-hook-form';
import { Select } from './Select.tsx';

export default { title: 'UI/Form/Select', component: Select };

export const Default = {
  render: () => {
    const form = useForm({ defaultValues: { website: 'Website selector' } });
    return (
      <FormProvider {...form}>
        <Select name="website" className="w-64" label="Website selector">
          <option>Website selector</option>
          <option>example.com</option>
        </Select>
      </FormProvider>
    );
  },
};
