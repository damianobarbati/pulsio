import { Alert, Badge, Button, Card, DataTable, Dialog, EmptyState, Field, Input, KpiCard, Logo, Pulser, Select, Spinner, Toast } from '../index.ts';
import { MultiSelectPreview } from './MultiSelectPreview.tsx';

type PreviewProps = { name: string };

export const Preview = ({ name }: PreviewProps) => {
  if (name === 'logo') return <Logo className="h-10 w-40" />;
  if (name === 'buttons')
    return (
      <div className="flex flex-wrap gap-3">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
        <Button variant="secondary">Secondary</Button>
        <Button disabled>Disabled</Button>
      </div>
    );
  if (name === 'inputs')
    return (
      <div className="w-80 space-y-4">
        <Input placeholder="Default input" />
        <Input aria-invalid="true" placeholder="Error input" />
        <Input disabled value="Disabled input" />
      </div>
    );
  if (name === 'selects')
    return (
      <div className="w-64 space-y-4">
        <Select>
          <option>Website selector</option>
          <option>example.com</option>
        </Select>
        <MultiSelectPreview />
      </div>
    );
  if (name === 'fields')
    return (
      <div className="w-80 space-y-4">
        <Field label="Email" hint="We only use this for sign in." children={<Input type="email" placeholder="you@example.com" />} />
        <Field label="Password" error="Use at least 12 characters." children={<Input aria-invalid="true" type="password" />} />
      </div>
    );
  if (name === 'spinners')
    return (
      <div className="flex items-center gap-5">
        <Spinner />
        <Spinner className="h-8 w-8" />
        <Pulser />
        <Pulser className="h-8 w-8" />
      </div>
    );
  if (name === 'cards')
    return (
      <div className="grid w-[680px] gap-4 md:grid-cols-2">
        <Card>Desktop card</Card>
        <Card>Tablet and mobile stack</Card>
      </div>
    );
  if (name === 'kpis')
    return (
      <div className="grid w-[680px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Live now" value="8" detail="visitors on your site" live />
        <KpiCard label="Visitors" value="1,204" detail="Last 28 days" />
      </div>
    );
  if (name === 'badges')
    return (
      <div className="flex gap-2">
        <Badge>Default</Badge>
        <Badge tone="success">Live</Badge>
        <Badge tone="warning">Warning</Badge>
        <Badge tone="error">Error</Badge>
      </div>
    );
  if (name === 'alerts')
    return (
      <div className="w-96 space-y-3">
        <Alert>Informational feedback.</Alert>
        <Alert tone="success">Saved successfully.</Alert>
        <Alert tone="warning">Check your setup.</Alert>
        <Alert tone="error">Could not save changes.</Alert>
      </div>
    );
  if (name === 'empty')
    return (
      <div className="w-[360px]">
        <EmptyState title="No websites yet" description="Add a website to start collecting analytics." action={<Button>Add website</Button>} />
      </div>
    );
  if (name === 'dialog')
    return <Dialog open title="Delete account?" confirmLabel="Delete" onClose={() => undefined} onConfirm={() => undefined} children="This action cannot be undone." />;
  if (name === 'toast') return <Toast message="Changes saved successfully." onClose={() => undefined} />;
  return (
    <DataTable
      className="w-[720px]"
      search={<Input className="w-56" placeholder="Search websites" />}
      children={
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
      }
      filters={
        <Select className="w-40">
          <option>Last 28 days</option>
        </Select>
      }
    />
  );
};

export const preview = (name: string) => () => <Preview name={name} />;
