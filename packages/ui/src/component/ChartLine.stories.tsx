import { ChartLine } from './ChartLine.tsx';

const data = [
  { timestamp: '2026-09-21T00:00:00.000Z', value: 12 },
  { timestamp: '2026-09-22T00:00:00.000Z', value: 19 },
  { timestamp: '2026-09-23T00:00:00.000Z', value: 14 },
  { timestamp: '2026-09-24T00:00:00.000Z', value: 25 },
];

export default { title: 'UI/ChartLine', component: ChartLine };

export const Visitors = { render: () => <ChartLine className="h-90 w-[640px]" label="Visitors by day" data={data} interval="day" valueFormatter={String} /> };
export const Empty = { render: () => <ChartLine className="h-90 w-[640px]" label="No visitors" data={[]} interval="day" valueFormatter={String} /> };
