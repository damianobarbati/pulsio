import { FormProvider, useForm } from 'react-hook-form';
import { Input } from '../form/Input.tsx';
import { Select } from '../form/Select.tsx';
import { DataTable } from './DataTable.tsx';

export default { title: 'UI/DataTable', component: DataTable };

export const Default = {
  render: () => {
    const form = useForm({ defaultValues: { search: '', range: 'Last 28 days' } });
    return (
      <FormProvider {...form}>
        <DataTable
          className="w-[720px]"
          search={<Input name="search" className="w-56" placeholder="Search websites" />}
          filters={
            <Select name="range" className="w-40">
              <option>Last 28 days</option>
            </Select>
          }
          footer="1 website"
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-4">Website</th>
                <th>Visitors</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-pulsio-line border-t p-4">pulsio.live</td>
                <td className="border-pulsio-line border-t">1,204</td>
              </tr>
            </tbody>
          </table>
        </DataTable>
      </FormProvider>
    );
  },
};
