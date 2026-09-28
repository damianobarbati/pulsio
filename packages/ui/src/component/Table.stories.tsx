import { Table } from './Table.tsx';

type Website = { domain: string; visitors: number };

const columns = [
  { key: 'domain', header: 'Website', render: (row: Website) => row.domain },
  { key: 'visitors', header: 'Visitors', render: (row: Website) => row.visitors.toLocaleString('en') },
];

export default { title: 'UI/Table', component: Table };

export const Default = {
  render: () => (
    <Table className="w-[640px]" columns={columns} data={[{ domain: 'pulsio.live', visitors: 1204 }]} getRowKey={(row) => row.domain} bar={{ getPercentage: () => 75 }} />
  ),
};

export const Empty = {
  render: () => <Table className="w-[640px]" columns={columns} data={[]} getRowKey={(row) => row.domain} emptyMessage="No websites found." />,
};
