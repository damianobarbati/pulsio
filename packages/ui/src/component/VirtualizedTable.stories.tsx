import { createColumnHelper } from '@tanstack/react-table';
import { VirtualizedTable, type virtualizedTableFeatures } from './VirtualizedTable.tsx';

type Website = { domain: string; visitors: number };

const column = createColumnHelper<typeof virtualizedTableFeatures, Website>();
const columns = column.columns([column.accessor('domain', { header: 'Website', size: 300 }), column.accessor('visitors', { header: 'Visitors', size: 140 })]);
const data = [
  { domain: 'pulsio.live', visitors: 1204 },
  { domain: 'example.com', visitors: 863 },
  { domain: 'website.test', visitors: 421 },
];

export default { title: 'UI/VirtualizedTable', component: VirtualizedTable };

export const Default = { render: () => <VirtualizedTable className="h-64 w-[640px]" columns={columns} data={data} emptyMessage="No websites found." /> };
export const Empty = { render: () => <VirtualizedTable className="h-64 w-[640px]" columns={columns} data={[]} emptyMessage="No websites found." /> };
