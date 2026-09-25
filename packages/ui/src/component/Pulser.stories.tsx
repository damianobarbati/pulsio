import { Pulser } from './Pulser.tsx';

export default { title: 'UI/Pulser', component: Pulser };

export const Sizes = {
  render: () => (
    <div className="flex items-center gap-5">
      <Pulser />
      <Pulser className="size-8" />
    </div>
  ),
};
