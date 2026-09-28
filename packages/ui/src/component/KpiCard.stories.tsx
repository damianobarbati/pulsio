import { KpiCard } from './KpiCard.tsx';

export default { title: 'UI/KpiCard', component: KpiCard };

export const Examples = {
  render: () => (
    <div className="grid w-[680px] gap-4 sm:grid-cols-2">
      <KpiCard label="Live now" value="8" detail="Visitors on your site" live />
      <KpiCard label="Visitors" value="1,204" detail="Last 28 days" delta={8.4} />
    </div>
  ),
};
