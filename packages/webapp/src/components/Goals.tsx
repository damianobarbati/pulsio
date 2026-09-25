import cx from 'clsx-tw';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import useSWRMutation from 'swr/mutation';
import { MPOST } from 'ui/api/fetchers.ts';
import { Button } from 'ui/component/Button.tsx';
import { Textarea } from 'ui/component/Textarea.tsx';
import { Input, Select } from 'ui/form';
import { IEdit, IPlus, ITrash } from 'ui/icons.tsx';
import { toNumber, toRate } from '#webapp/helpers.ts';

type GoalStats = any;

type GoalsProps = { className?: string; siteId: string; goals: GoalStats[]; onChanged: () => void; onSelect: (id: string) => void };
type GoalForm = { name: string; kind: 'page' | 'event' | 'scroll'; target: string; threshold: number; propertyKey: string; propertyValue: string; properties: string };
export const Goals = ({ className, siteId, goals, onChanged, onSelect }: GoalsProps) => {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('');
  const form = useForm<GoalForm>({ defaultValues: { name: '', kind: 'event', target: '', threshold: 50, propertyKey: '', propertyValue: '', properties: '{}' } });
  const kind = form.watch('kind');
  const save = useSWRMutation(editing ? `/goals/${editing}` : '/goals', MPOST);
  const remove = useSWRMutation(`/goals/${deleting}`, MPOST);
  const submit = form.handleSubmit(async ({ properties, propertyKey, propertyValue, ...values }) => {
    try {
      const parsed = properties.trim() ? JSON.parse(properties) : propertyKey ? { [propertyKey]: propertyValue } : {};
      await save.trigger({ method: editing ? 'PATCH' : 'POST', data: { ...values, properties: parsed, site: siteId } });
      setEditing(null);
      setMessage('Goal saved.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Check the goal fields.');
    }
  });
  return (
    <section className={cx('rounded-lg border border-gray-100 bg-white p-6 shadow-sm md:col-span-2', className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-sm uppercase">Goal conversions</h2>
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-violet-600"
          onClick={() => {
            form.reset({ name: '', kind: 'event', target: '', threshold: 50, propertyKey: '', propertyValue: '', properties: '' });
            setEditing('');
            setMessage('');
          }}
        >
          <IPlus /> Add goal
        </button>
      </div>
      {editing !== null && (
        <FormProvider {...form}>
          <form onSubmit={submit} className="mt-5 grid gap-4 rounded-lg border border-violet-100 bg-violet-50/50 p-5 sm:grid-cols-2">
            <Input label="Display name" name="name" required />
            <Select label="Goal trigger" name="kind">
              <option value="event">Custom event</option>
              <option value="page">Pageview</option>
              <option value="scroll">Scroll depth</option>
            </Select>
            <Input
              label={kind === 'event' ? 'Event name' : 'Page path (wildcards supported)'}
              required
              placeholder={kind === 'event' ? 'Signup' : '/thank-you or /blog/**'}
              name="target"
            />
            {kind === 'scroll' && <Input label="Scroll threshold (%)" name="threshold" type="number" min="1" max="100" />}
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <Input label="Property key" name="propertyKey" placeholder="plan" disabled={Boolean(form.watch('properties').trim())} />
              <Input label="Equals value" name="propertyValue" placeholder="pro" disabled={Boolean(form.watch('properties').trim())} />
              <details className="sm:col-span-2">
                <summary className="cursor-pointer text-sm">Advanced JSON conditions</summary>
                <label className="mt-2 block text-sm">
                  Custom property conditions (JSON)
                  <Textarea
                    {...form.register('properties')}
                    placeholder={'{"plan":"pro","source":"ad"}'}
                    rows={3}
                    className="mt-2 w-full rounded border border-gray-200 bg-white p-2 font-mono text-sm"
                  />
                </label>
                <p className="mt-1 text-gray-500 text-xs">Use either simple fields or a JSON object. JSON errors show below.</p>
              </details>
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <Button type="submit" disabled={save.isMutating}>
                {save.isMutating ? 'Saving…' : 'Save goal'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </FormProvider>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="mt-5 w-full text-left text-sm">
          <thead className="border-gray-200 border-b text-gray-500">
            <tr>
              {['Goal', 'Unique conversions', 'Total conversions', 'Conversion rate', 'Revenue', ''].map((label) => (
                <th key={label} className="whitespace-nowrap px-2 py-3 font-normal">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => (
              <tr key={goal.id} className="border-gray-100 border-b">
                <td className="px-2 py-4">
                  <button type="button" onClick={() => onSelect(goal.id)} className="text-left text-violet-600 hover:underline">
                    {goal.name}
                  </button>
                  <p className="mt-1 text-gray-400 text-xs">
                    {goal.kind} · {goal.target}
                  </p>
                </td>
                <td className="px-2 tabular-nums">{toNumber(goal.uniqueConversions)}</td>
                <td className="px-2 tabular-nums">{toNumber(goal.totalConversions)}</td>
                <td className="px-2 tabular-nums">{toRate(goal.conversionRate)}</td>
                <td className="px-2">
                  {goal.revenue.map((item) => (
                    <p key={item.currency}>
                      {new Intl.NumberFormat('en', { style: 'currency', currency: item.currency }).format(item.totalRevenue)}{' '}
                      <span className="text-gray-400">({new Intl.NumberFormat('en', { style: 'currency', currency: item.currency }).format(item.averageRevenue)} avg.)</span>
                    </p>
                  ))}
                </td>
                <td className="px-2">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      aria-label={`Edit ${goal.name}`}
                      onClick={() => {
                        const property = Object.entries(goal.properties)[0];
                        form.reset({ ...goal, propertyKey: property?.[0] || '', propertyValue: property?.[1] || '', properties: '' });
                        setEditing(goal.id);
                        setMessage('');
                      }}
                    >
                      <IEdit size={18} />
                    </button>
                    <button type="button" aria-label={`Delete ${goal.name}`} onClick={() => setDeleting(goal.id)}>
                      <ITrash size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!goals.length && <p className="py-10 text-center text-gray-400">Add a goal to measure signups, purchases, page visits, or scroll depth.</p>}
      {deleting && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded bg-red-50 p-4 text-sm">
          <p>Delete this goal? Collected events will remain.</p>
          <button
            type="button"
            className="font-semibold text-red-700"
            disabled={remove.isMutating}
            onClick={async () => {
              try {
                await remove.trigger({ method: 'DELETE', data: { site: siteId, id: deleting } });
                setDeleting(null);
                onChanged();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Could not delete goal.');
              }
            }}
          >
            Delete goal
          </button>
          <button type="button" onClick={() => setDeleting(null)}>
            Cancel
          </button>
        </div>
      )}
      <details className="mt-5 text-gray-500 text-sm">
        <summary className="cursor-pointer">How to send events and revenue</summary>
        <pre className="mt-3 overflow-auto rounded bg-gray-50 p-4 text-xs">{`window.pulsio('Signup', { props: { plan: 'pro' } });\nwindow.pulsio('purchase_completed', { transaction_id: 'order_123', revenue: { amount: 29, currency: 'EUR' } });\nwindow.pulsio('Impression', { interactive: false });`}</pre>
        <p className="mt-3">
          Enable optional tracking with <code>data-track="outbound,downloads,forms"</code> on your script. Use <code>data-track="404"</code> on error pages. No form field values
          are collected.
        </p>
      </details>
    </section>
  );
};
