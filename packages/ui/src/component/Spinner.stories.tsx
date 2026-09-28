import { Spinner } from './Spinner.tsx';

export default { title: 'UI/Spinner', component: Spinner };

export const Sizes = {
  render: () => (
    <div className="flex items-center gap-5">
      <Spinner centered={false} size="sm" />
      <Spinner centered={false} />
      <Spinner centered={false} size="lg" />
      <Spinner centered={false} size="xl" />
    </div>
  ),
};
